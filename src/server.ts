import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { Server } from 'socket.io';
import { ChessLogic } from './lib/chess/ChessLogic';
import { createRoom, updateGameState, RoomStatus, addChatMessage } from './lib/chess/room';
import type { Room, ChatMessage } from './lib/chess/room';
import type { Player, GameState } from './lib/chess/types.ts';
import type { Socket } from 'socket.io';

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(server, {
    cors: {
      origin: [
        "http://localhost:5173",
        "https://4bkh9p6p-5173.euw.devtunnels.ms",
      ],
      methods: ["GET", "POST"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
    },
  });

  const rooms = new Map<string, Room>();
  const gameInstances = new Map<string, ChessLogic>();
  const playerRooms = new Map<string, string>();

  io.on("connection", (socket: Socket) => {
    console.log("Socket connected:", socket.id, "via", socket.conn.transport.name);
    socket.on("roomMessage", ({ roomId, msg }: { roomId: string; msg: string }) => {
      console.log("roomMessage received", { roomId, msg, from: socket.id });
      if (!roomId || !msg) return;

      const room = rooms.get(roomId);
      if (!room || !socket.rooms.has(roomId)) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      addChatMessage(room, socket.id, player.username, msg);
      io.to(roomId).emit("roomMessage", room.chat[room.chat.length - 1]);
    });
    socket.conn.on("upgrade", (transport) => {
      console.log("Transport upgraded to:", transport.name);
    });

    // Get list of available rooms
    socket.on("getRooms", () => {
      const availableRooms = Array.from(rooms.entries())
        .filter(([_, room]) => room.players.length < 2)
        .map(([id, room]) => ({
          id,
          creator: room.players[0]?.username,
          createdAt: room.createdAt
        }));
      socket.emit("roomList", availableRooms);
    });

    // Handle chess room creation
    socket.on("createChessRoom", () => {
      const roomId = Math.random().toString(36).substring(7);
      const chessLogic = new ChessLogic();
      gameInstances.set(roomId, chessLogic);

      const room = createRoom(roomId);
      rooms.set(roomId, room);
      socket.emit("roomCreated", { roomId });
    });

    // Handle joining room
    socket.on("joinRoom", (data: { roomId: string; username: string }) => {
      const { roomId, username } = data;
      const room = rooms.get(roomId);

      if (!room) {
        socket.emit("roomError", "Room not found");
        return;
      }

      if (room.players.length >= 2) {
        socket.emit("roomError", "Room is full");
        return;
      }

      const player: Player = {
        id: socket.id,
        username,
        color: room.players.length === 0 ? "w" : "b",
        isReady: false
      };

      room.players.push(player);
      socket.join(roomId);

      if (room.players.length === 2) {
        room.status = RoomStatus.WAITING_FOR_START;
      }

      // Add system message about player joining
      addChatMessage(room, "system", "System", `${username} has joined the room`);

      // Send the room state to all players
      io.to(roomId).emit("roomState", room);

      // If both players are present, start the game
      // If both players are present, start immediately
      if (room.players.length === 2) {
        room.status = RoomStatus.IN_PROGRESS;
        addChatMessage(room, "system", "System", "Game started!");
        io.to(roomId).emit("gameStart", room);
      }

    });

    // Handle player ready state
    socket.on("playerReady", (roomId: string) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (player) {
        player.isReady = true;

        // Check if all players are ready
        if (room.players.every(p => p.isReady)) {
          room.status = RoomStatus.IN_PROGRESS;
          addChatMessage(room, "system", "System", "Game started!");
          io.to(roomId).emit("allPlayersReady", room);
        } else {
          addChatMessage(room, "system", "System", `${player.username} is ready`);
          io.to(roomId).emit("playerReady", { playerId: socket.id });
        }
      }
    });

    // Handle game moves
    socket.on("move", (data: { roomId: string; from: string; to: string; promotion?: string }) => {
      const { roomId, from, to, promotion } = data;
      const room = rooms.get(roomId);
      const chessLogic = gameInstances.get(roomId);

      if (!room || !chessLogic) {
        socket.emit("error", "Game not found");
        return;
      }

      if (room.status !== RoomStatus.IN_PROGRESS) {
        socket.emit("error", "Game has not started yet");
        return;
      }

      const player = room.players.find(p => p.id === socket.id);
      if (!player || player.color !== room.game.turn) {
        socket.emit("error", "Not your turn");
        return;
      }

      try {
        const move = chessLogic.makeMove(from, to, promotion);
        if (!move) {
          socket.emit("error", "Invalid move");
          return;
        }

        // 1️⃣ Обновляем состояние игры (FEN, check, draw, и т.д.)
        updateGameState(room, chessLogic.game);

        // 2️⃣ Сохраняем историю
        room.game.moves.push({ from, to, promotion });
        room.game.captured = chessLogic.captured;
        room.game.points = chessLogic.points;

        // 3️⃣ Получаем последний ход «на лету»
        const lastMove = room.game.moves.at(-1);
        console.log("last", lastMove);
        
        // 4️⃣ Рассылаем клиентам полное состояние с временным lastMove
        io.to(roomId).emit("gameState", {
          ...room.game,
          lastMove, // ⚡ не сохраняем в состоянии, просто прикладываем к событию
        });

        // 5️⃣ Проверяем окончание игры
        if (room.status === RoomStatus.FINISHED) {
          const result = room.game.result;
          let resultMessage = "Game ended in a draw";
          if (result === "1-0") {
            resultMessage = `${room.players.find(p => p.color === "w")?.username} won the game`;
          } else if (result === "0-1") {
            resultMessage = `${room.players.find(p => p.color === "b")?.username} won the game`;
          }

          addChatMessage(room, "system", "System", resultMessage);
          io.to(roomId).emit("gameOver", {
            result: room.game.result,
            reason: chessLogic.game.isDraw() ? "draw" : "checkmate",
          });
        }
      } catch (err) {
        socket.emit("error", "Invalid move");
      }
    });


    // Handle reconnection
    socket.on("reconnect", (prevSocketId: string) => {
      const roomId = playerRooms.get(prevSocketId);
      if (roomId) {
        const room = rooms.get(roomId);
        if (room) {
          const player = room.players.find(p => p.id === prevSocketId);
          if (player) {
            player.id = socket.id;
            playerRooms.delete(prevSocketId);
            playerRooms.set(socket.id, roomId);
            socket.join(roomId);
            socket.emit("reconnected", room);
            socket.to(roomId).emit("playerReconnected", { playerId: socket.id });
          }
        }
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Socket disconnected:", socket.id);

      rooms.forEach((room, roomId) => {
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          playerRooms.set(socket.id, roomId);

          setTimeout(() => {
            if (playerRooms.has(socket.id)) {
              room.players.splice(playerIndex, 1);
              if (room.players.length === 0) {
                rooms.delete(roomId);
                gameInstances.delete(roomId);
              } else {
                io.to(roomId).emit("playerLeft", socket.id);
              }
              playerRooms.delete(socket.id);
            }
          }, 60000); // 1 minute timeout for reconnection
        }
      });
    });

    // Add rematch functionality
    socket.on("requestRematch", (roomId: string) => {
      const room = rooms.get(roomId);
      if (!room) return;

      const player = room.players.find(p => p.id === socket.id);
      if (!player) return;

      player.isReady = true;
      addChatMessage(room, "system", "System", `${player.username} wants a rematch`);
      io.to(roomId).emit("rematchRequested", socket.id);

      // If both players are ready, start new game
      if (room.players.every(p => p.isReady)) {
        // Reset the game
        const chessLogic = gameInstances.get(roomId);
        if (chessLogic) {
          chessLogic.resetGame();
          room.status = RoomStatus.WAITING_FOR_START;
          room.game = {
            ...room.game,
            fen: chessLogic.game.fen(),
            turn: "w",
            moves: [],
            result: null,
            captured: chessLogic.captured,
            points: chessLogic.points,
            lastMove: undefined,
            isCheck: false,
            isCheckmate: false,
            isDraw: false
          };

          // Swap colors for the rematch
          room.players.forEach(p => {
            p.color = p.color === "w" ? "b" : "w";
            p.isReady = false;
          });

          addChatMessage(room, "system", "System", "Rematch started! Players' colors have been swapped.");
          io.to(roomId).emit("rematchStarted", room);
        }
      }
    });
  });

  const port = process.env.PORT || 3000;
  server.listen(port, (err?: Error) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${port}`);
  });
});
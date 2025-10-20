// import { createServer } from 'http';
// import { parse } from 'url';
// import next from 'next';
// import { Server } from 'socket.io';
// import { ChessLogic } from './lib/chess/ChessLogic.ts';

// const dev = process.env.NODE_ENV !== 'production';
// const app = next({ dev });
// const handle = app.getRequestHandler();

// app.prepare().then(() => {
//   const server = createServer((req, res) => {
//     const parsedUrl = parse(req.url, true);
//     handle(req, res, parsedUrl);
//   });

//   const io = new Server(server, {
//     cors: {
//       origin: "http://localhost:5173", // allow the exact origin instead of '*'
//       methods: ["GET", "POST"],
//       allowedHeaders: ["Content-Type", "Authorization"],
//       credentials: true, // allow credentials
//     },
//   });

//   const rooms = new Map();
//   const gameInstances = new Map();

//   // Store socket ID to room ID mapping for reconnection
//   const playerRooms = new Map();

//   io.on("connection", (socket) => {
//     // Handle room chat messages
//     socket.on("roomMessage", ({ roomId, user, msg }) => {
//       console.log("roomMessage received", { roomId, user, msg, from: socket.id });
//       if (!roomId || !msg) return;
//       if (socket.rooms.has(roomId)) {
//         io.to(roomId).emit("roomMessage", { user, msg });
//       }
//     });

//     // Handle reconnection
//     socket.on("reconnect", (prevSocketId) => {
//       const roomId = playerRooms.get(prevSocketId);
//       if (roomId) {
//         const room = rooms.get(roomId);
//         if (room) {
//           const player = room.players.find(p => p.id === prevSocketId);
//           if (player) {
//             player.id = socket.id;
//             playerRooms.delete(prevSocketId);
//             playerRooms.set(socket.id, roomId);
//             socket.join(roomId);
//             socket.emit("reconnected", room);
//             socket.to(roomId).emit("playerReconnected", { playerId: socket.id });
//           }
//         }
//       }
//     });

//     // Get list of available rooms
//     socket.on("getRooms", () => {
//       const availableRooms = Array.from(rooms.entries())
//         .filter(([_, room]) => room.players.length < 2)
//         .map(([id, room]) => ({
//           id,
//           creator: room.players[0]?.username,
//           createdAt: room.createdAt
//         }));
//       socket.emit("roomList", availableRooms);
//     });
//     console.log("Socket connected:", socket.id, "via", socket.conn.transport.name);

//     socket.conn.on("upgrade", (transport) => {
//       console.log("Transport upgraded to:", transport.name);
//     });
    
//     // Handle chess room creation
//     socket.on("createChessRoom", () => {
//       const roomId = Math.random().toString(36).substring(7);
//       const chessLogic = new ChessLogic();
//       gameInstances.set(roomId, chessLogic);

//       const room = {
//         id: roomId,
//         players: [], // Start with empty players array
//         game: {
//           fen: chessLogic.game.fen(),
//           turn: "w",
//           moves: [],
//           result: null,
//           captured: chessLogic.captured,
//           points: chessLogic.points
//         },
//         createdAt: Date.now()
//       };

//       rooms.set(roomId, room);
//       socket.emit("roomCreated", { roomId });
//     });

//     // Handle joining room
//     socket.on("joinRoom", (data) => {
//       const { roomId, username } = data;
//       const room = rooms.get(roomId);

//       if (!room) {
//         socket.emit("roomError", "Room not found");
//         return;
//       }

//       if (room.players.length >= 2) {
//         socket.emit("roomError", "Room is full");
//         return;
//       }

//       const player = {
//         id: socket.id,
//         username,
//         color: room.players.length === 0 ? "w" : "b", // First player gets white, second gets black
//         isReady: false
//       };

//       room.players.push(player);
//       socket.join(roomId);

//       // Send the room state to all players
//       io.to(roomId).emit("roomState", room);

//       // If both players are present, start the game
//       if (room.players.length === 2) {
//         io.to(roomId).emit("gameStart", room);
//       }
//     });

//     // Handle player ready state
//     socket.on("playerReady", (roomId) => {
//       const room = rooms.get(roomId);
//       if (!room) return;

//       const player = room.players.find(p => p.id === socket.id);
//       if (player) {
//         player.isReady = true;

//         // Check if all players are ready
//         if (room.players.every(p => p.isReady)) {
//           io.to(roomId).emit("allPlayersReady", room);
//         } else {
//           io.to(roomId).emit("playerReady", { playerId: socket.id });
//         }
//       }
//     });

//     // Handle disconnection
//     socket.on("disconnect", () => {
//       console.log("Socket disconnected:", socket.id);

//       // Store the room ID for potential reconnection
//       rooms.forEach((room, roomId) => {
//         const playerIndex = room.players.findIndex(p => p.id === socket.id);
//         if (playerIndex !== -1) {
//           playerRooms.set(socket.id, roomId);

//           // Set a timeout to remove the player if they don't reconnect
//           setTimeout(() => {
//             if (playerRooms.has(socket.id)) {
//               room.players.splice(playerIndex, 1);
//               if (room.players.length === 0) {
//                 rooms.delete(roomId);
//                 gameInstances.delete(roomId);
//               } else {
//                 io.to(roomId).emit("playerLeft", socket.id);
//               }
//               playerRooms.delete(socket.id);
//             }
//           }, 60000); // 1 minute timeout for reconnection
//         }
//       });
//     });

//     // Add rematch functionality
//     socket.on("requestRematch", (roomId) => {
//       const room = rooms.get(roomId);
//       if (!room) return;

//       const player = room.players.find(p => p.id === socket.id);
//       if (!player) return;

//       player.isReady = true;
//       io.to(roomId).emit("rematchRequested", socket.id);

//       // If both players are ready, start new game
//       if (room.players.every(p => p.isReady)) {
//         // Reset the game
//         const chessLogic = gameInstances.get(roomId);
//         if (chessLogic) {
//           chessLogic.resetGame();
//           room.game = {
//             fen: chessLogic.game.fen(),
//             turn: "w",
//             moves: [],
//             result: null,
//             captured: chessLogic.captured,
//             points: chessLogic.points
//           };

//           // Swap colors for the rematch
//           room.players.forEach(p => {
//             p.color = p.color === "w" ? "b" : "w";
//             p.isReady = false;
//           });

//           io.to(roomId).emit("rematchStarted", room);
//         }
//       }
//     });

//     // Handle game moves
//     socket.on("move", (data) => {
//       const { roomId, from, to, promotion } = data;
//       const room = rooms.get(roomId);
//       const chessLogic = gameInstances.get(roomId);

//       if (!room || !chessLogic) {
//         socket.emit("error", "Game not found");
//         return;
//       }

//       // Check if it's the player's turn
//       const player = room.players.find(p => p.id === socket.id);
//       if (!player || player.color !== room.game.turn) {
//         socket.emit("error", "Not your turn");
//         return;
//       }

//       try {
//         const move = chessLogic.makeMove(from, to, promotion);
//         if (!move) {
//           socket.emit("error", "Invalid move");
//           return;
//         }

//         // Update game state
//         room.game.fen = chessLogic.game.fen();
//         room.game.turn = chessLogic.game.turn();
//         room.game.moves.push({ from, to, promotion });
//         room.game.captured = chessLogic.captured;
//         room.game.points = chessLogic.points;

//         // Check game status
//         const gameState = {
//           move: { from, to, promotion },
//           fen: room.game.fen,
//           turn: room.game.turn,
//           captured: room.game.captured,
//           points: room.game.points
//         };

//         if (chessLogic.game.isCheckmate()) {
//           room.game.result = player.color === "w" ? "1-0" : "0-1";
//           gameState.result = room.game.result;
//         } else if (chessLogic.game.isDraw()) {
//           room.game.result = "1/2-1/2";
//           gameState.result = room.game.result;
//         }

//         // Broadcast the move to all players in the room
//         io.to(roomId).emit("gameState", gameState);

//         // If game is over, broadcast the result
//         if (room.game.result) {
//           io.to(roomId).emit("gameOver", {
//             result: room.game.result,
//             reason: chessLogic.game.isDraw() ? "draw" : "checkmate"
//           });
//         }
//       } catch (err) {
//         socket.emit("error", "Invalid move");
//       }
//     });
//   });

//   const port = process.env.PORT || 3000;
//   server.listen(port, (err) => {
//     if (err) throw err;
//     console.log(`> Ready on http://localhost:${port}`);
//   });
// });

import { Player, GameState, Move } from "./types";
import { Chess } from "chess.js";

export interface Room {
  id: string;
  players: Player[];
  game: GameState;
  createdAt: number;
  lastMoveAt?: number;
  status: RoomStatus;
  spectators?: string[]; // Array of spectator socket IDs
  chat?: ChatMessage[];
}

export interface ChatMessage {
  playerId: string;
  username: string;
  message: string;
  timestamp: number;
}

export enum RoomStatus {
  WAITING_FOR_PLAYERS = "waiting_for_players",
  WAITING_FOR_START = "waiting_for_start",
  IN_PROGRESS = "in_progress",
  FINISHED = "finished",
  ABANDONED = "abandoned"
}

export function createRoom(id: string): Room {
  const chess = new Chess();
  return {
    id,
    players: [],
    game: {
      fen: chess.fen(),
      turn: "w",
      moves: [],
      result: null,
      captured: {
        white: [],
        black: []
      },
      points: {
        white: 0,
        black: 0
      },
      isCheck: chess.isCheck(),
      isCheckmate: chess.isCheckmate(),
      isDraw: chess.isDraw(),
    },
    createdAt: Date.now(),
    status: RoomStatus.WAITING_FOR_PLAYERS,
    spectators: [],
    chat: []
  };
}

export function updateGameState(room: Room, chess: Chess): void {
  // Preserve previous values before overwriting
  const prevGame = room.game;

  room.game = {
    ...prevGame,
    fen: chess.fen(),
    turn: chess.turn() as "w" | "b",
    isCheck: chess.isCheck(),
    isCheckmate: chess.isCheckmate(),
    isDraw: chess.isDraw(),
    result: getGameResult(chess),
    // keep lastMove, captured, and points if already set elsewhere
    // lastMove: prevGame.lastMove,
    captured: prevGame.captured,
    points: prevGame.points,
  };

  room.lastMoveAt = Date.now();

  if (room.game.isCheckmate || room.game.isDraw) {
    room.status = RoomStatus.FINISHED;
  }
}


function getGameResult(chess: Chess): "1-0" | "0-1" | "1/2-1/2" | null {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? '0-1' : '1-0';
  }
  if (chess.isDraw()) {
    return '1/2-1/2';
  }
  return null;
}

// function getLastMove(game: GameState): Move | undefined {
//   return game.moves.at(-1);
// }

export function getOpponent(room: Room, playerId: string): Player | null {
  return room.players.find(p => p.id !== playerId) || null;
}

export function addSpectator(room: Room, spectatorId: string): void {
  if (!room.spectators) {
    room.spectators = [];
  }
  if (!room.spectators.includes(spectatorId)) {
    room.spectators.push(spectatorId);
  }
}

export function addChatMessage(room: Room, playerId: string, username: string, message: string): void {
  if (!room.chat) {
    room.chat = [];
  }
  room.chat.push({
    playerId,
    username,
    message,
    timestamp: Date.now()
  });
}

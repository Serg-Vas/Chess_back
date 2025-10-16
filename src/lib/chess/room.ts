import { Player, GameState } from "./types";

export interface Room {
  id: string;
  players: Player[];
  game: GameState;
  createdAt: number;
  lastMoveAt?: number;
}

export function createRoom(id: string, white: Player, black: Player): Room {
  return {
    id,
    players: [white, black],
    game: {
      fen: "startpos",
      turn: "w",
      moves: [],
      result: null,
    },
    createdAt: Date.now(),
  };
}

export function getOpponent(room: Room, playerId: string): Player | null {
  return room.players.find(p => p.id !== playerId) || null;
}


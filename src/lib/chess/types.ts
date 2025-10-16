// Who's turn it is
export type Color = "w" | "b";

// Represents a move (used for board updates or network messages)
export interface Move {
  from: string;   // "e2"
  to: string;     // "e4"
  promotion?: string; // "q" if applicable
}

// Result of engine analysis
export interface EngineAnalysis {
  bestMove: Move | null;
  evaluation: number | string; // normalized score or "Mate in N"
  depth?: number;
  pv?: string[]; // principal variation
}

// Game state snapshot
export interface GameState {
  fen: string;
  turn: Color;
  moves: Move[];
  result?: "1-0" | "0-1" | "1/2-1/2" | null;
}

// Used when communicating with backend
export interface AnalyzeRequest {
  fen: string;
  turn: Color;
}

export interface AnalyzeResponse {
  analysis: EngineAnalysis;
}

// Player info (for multiplayer)
export interface Player {
  id: string;     // unique socket id or uuid
  username: string;
  color: Color;
  rating?: number;
  isReady?: boolean;
}

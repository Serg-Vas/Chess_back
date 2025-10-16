import { Chess, Move, type Square} from "chess.js";

export const pieceValue: Record<string, number> = {
  P: 1,
  N: 3,
  B: 3,
  R: 5,
  Q: 9,
  K: 0,
};

export interface CapturedPieces {
  white: string[];
  black: string[];
}

export interface MaterialPoints {
  white: number;
  black: number;
}

export class ChessLogic {
  game: Chess;
  captured: CapturedPieces;
  points: MaterialPoints;

  constructor(fen?: string) {
    this.game = fen ? new Chess(fen) : new Chess();
    this.captured = { white: [], black: [] };
    this.points = { white: 0, black: 0 };
  }

  makeMove(from: string, to: string, promotion?: string): Move | null | undefined {
    const piece = this.game.get(from as Square);
    if (!piece) return null;

    try {
      let move: Move | null;

      // Handle pawn promotion
      if (
        piece.type === "p" &&
        ((piece.color === "w" && to[1] === "8") || (piece.color === "b" && to[1] === "1"))
      ) {
        move = this.game.move({ from, to, promotion: promotion || "q" });
      } else {
        move = this.game.move({ from, to });
      }
      console.log("move", move);
      
      if (!move) throw new Error(`Illegal move attempted from ${from} to ${to}`);

      this.handleCaptured(move);
      return move;
    } catch (err: any) {
      console.warn(`Illegal move attempted from ${from} to ${to}: ${err.message}`);
    }
  }

  private handleCaptured(move: Move) {
    if (move.captured) {
      const capturedPiece = (move.color === "w" ? "b" : "w") + move.captured.toUpperCase();
      const img = `/img/chessPieces/${capturedPiece}.png`;
      if (move.color === "w") {
        this.captured.white.push(img);
        this.points.white += pieceValue[move.captured.toUpperCase()];
      } else {
        this.captured.black.push(img);
        this.points.black += pieceValue[move.captured.toUpperCase()];
      }
    }
  }

  getWhiteAdvantage(): number {
    return this.points.white - this.points.black;
  }

  getBlackAdvantage(): number {
    return this.points.black - this.points.white;
  }

  resetGame() {
    this.game.reset();
    this.captured.white = [];
    this.captured.black = [];
    this.points.white = 0;
    this.points.black = 0;
  }

  handleDrop = (
    source: string,
    target: string,
    playSound: (file: string) => void,
    removeHighlights: () => void
  ): Move | "snapback" => {
    removeHighlights();

    if (source === target) return "snapback";

    const move = this.makeMove(source, target);
    if (!move) return "snapback";

    if (move.captured) playSound("capture.mp3");
    else if (move.flags.includes("k") || move.flags.includes("q")) playSound("castle.mp3");
    else if (move.flags.includes("p")) playSound("promote.mp3");
    else playSound("move-self.mp3");

    if (this.game.inCheck()) playSound("move-check.mp3");
    if (this.game.isGameOver()) playSound("game-end.mp3");

    return move;
  };

  handleSnapEnd(updateBoard: (fen: string) => void, removeHighlights: () => void) {
    removeHighlights();
    updateBoard(this.game.fen());
  }

  // ============================
  // нормализация
  // ============================
  private parseMateFromString(s?: string): number | null {
    if (!s) return null;
    const m = s.match(/mate(?:\s*in)?\s*(-?\d+)/i);
    if (m && m[1]) return parseInt(m[1], 10);
    return null;
  }

  normalizeEngineAnalysis(analysis: any): number | string {
    if (!analysis) return 0;

    const scoreField = analysis?.score ?? analysis?.eval ?? analysis?.cp ?? analysis;
    const mateField = analysis?.mate ?? analysis?.mateIn ?? null;

    let mateN: number | null = null;

    if (mateField !== null && mateField !== undefined) {
      mateN = Number(mateField);
    } else if (typeof scoreField === "string") {
      mateN = this.parseMateFromString(scoreField);
    }

    if (mateN !== null) {
      const sideToMove = this.game.turn();
      const mateSide = mateN > 0 ? sideToMove : sideToMove === "w" ? "b" : "w";
      return `Mate in ${Math.abs(mateN)} ${mateSide === "w" ? "W" : "B"}`;
    }

    let val = Number(scoreField ?? 0);
    if (isNaN(val)) {
      if (typeof scoreField === "object" && scoreField !== null) {
        val = Number(scoreField.cp ?? scoreField.score ?? 0);
      }
      if (isNaN(val)) return 0;
    }

    if (Math.abs(val) > 10) val = val / 100;

    const analysisSide = analysis?.side ?? analysis?.color ?? analysis?.turn ?? null;
    let perspectiveIsWhite: boolean | null = null;
    if (analysisSide !== null && analysisSide !== undefined) {
      perspectiveIsWhite = String(analysisSide).toLowerCase().startsWith("w");
    }
    if (perspectiveIsWhite === null) {
      perspectiveIsWhite = this.game.turn() === "w";
    }

    return perspectiveIsWhite ? val : -val;
  }
}

export function isUserTurn(game: Chess, userColor: "w" | "b") {
  return game.turn() === userColor;
}
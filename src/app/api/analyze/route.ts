import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { spawn } from "child_process";

const enginePath = path.join(
  process.cwd(),
  "stockfish",
  "stockfish-windows-x86-64-avx2.exe"
);

export async function POST(req: NextRequest) {
  try {
    const { moves } = await req.json();

    if (!Array.isArray(moves)) {
      return NextResponse.json({ error: "moves must be an array" }, { status: 400 });
    }

    const { bestMove, score } = await getBestMove(moves);
    return NextResponse.json({ bestMove, score });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function getBestMove(moves: string[]): Promise<{ bestMove: string; score: string }> {
  return new Promise((resolve, reject) => {
    const engine = spawn(enginePath);

    let bestMove = "";
    let score: string | undefined;
    let outputBuffer = "";

    engine.stdout.on("data", (data) => {
      const text = data.toString();
      outputBuffer += text;

      // Парсим оценку позиции
      const scoreMatch = text.match(/score (cp|mate) (-?\d+)/);
      if (scoreMatch) {
        if (scoreMatch[1] === "cp") {
          const cp = parseInt(scoreMatch[2], 10);
          score = (cp / 100).toFixed(2);
        } else if (scoreMatch[1] === "mate") {
          score = `Mate in ${scoreMatch[2]}`;
        }
      }

      // Парсим лучший ход
      const match = text.match(/bestmove\s([a-h][1-8][a-h][1-8][qrbn]?)/);
      if (match) {
        bestMove = match[1];
        engine.stdin.write("quit\n");
      }
    });

    engine.stderr.on("data", (data) => {
      console.error("Stockfish error:", data.toString());
    });

    engine.on("close", () => {
      if (bestMove) {
        console.log(`Best move: ${bestMove}, Score: ${score}`);
        resolve({ bestMove, score: score ?? "N/A" });
      } else {
        reject(new Error("No best move found. Output: " + outputBuffer));
      }
    });

    // UCI init
    engine.stdin.write("uci\n");
    engine.stdin.write("isready\n");

    // 🔥 Если ходов нет — просто startpos
    if (moves.length > 0) {
      engine.stdin.write(`position startpos moves ${moves.join(" ")}\n`);
    } else {
      engine.stdin.write("position startpos\n");
    }

    engine.stdin.write("go depth 15\n");
  });
}

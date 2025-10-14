import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const enginePath = path.join(
  process.cwd(),
  "stockfish",
  "stockfish-windows-x86-64-avx2.exe"
);

// Функция для анализа одной позиции
async function getBestMoveForPosition(moves: string[]): Promise<{ bestMove: string; score: string }> {
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
          score = (parseInt(scoreMatch[2], 10) / 100).toFixed(2);
        } else {
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
        resolve({ bestMove, score: score ?? "N/A" });
      } else {
        reject(new Error("No best move found. Output: " + outputBuffer));
      }
    });

    // UCI init
    engine.stdin.write("uci\n");
    engine.stdin.write("isready\n");

    // Позиція для цієї частини гри
    if (moves.length > 0) {
      engine.stdin.write(`position startpos moves ${moves.join(" ")}\n`);
    } else {
      engine.stdin.write("position startpos\n");
    }

    engine.stdin.write("go depth 15\n");
  });
}

// Функція для аналізу всієї партії
async function analyzeGame(moves: string[]): Promise<any[]> {
  const results: any[] = [];

  for (let i = 0; i <= moves.length; i++) {
    const movesSoFar = moves.slice(0, i);
    const result = await getBestMoveForPosition(movesSoFar);
    results.push({
      ply: i,
      move: moves[i - 1] || null,
      eval: result.score,
      bestMove: result.bestMove,
    });
  }

  return results;
}

export async function GET(req: NextRequest) {
  try {
    const movesPath = path.join(process.cwd(), "data/moveHistory.json");
    const moves: string[] = JSON.parse(fs.readFileSync(movesPath, "utf-8"));

    const analysis = await analyzeGame(moves);

    const outPath = path.join(process.cwd(), "data/analysis.json");
    fs.writeFileSync(outPath, JSON.stringify(analysis, null, 2), "utf-8");

    return NextResponse.json({ success: true, analysis });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}

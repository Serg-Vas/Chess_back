import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";

const enginePath = path.join(
  process.cwd(),
  "stockfish",
  "stockfish-windows-x86-64-avx2.exe"
);

// Функция для анализа партии
async function analyzeGame(moves: string[]): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const stockfish = spawn(enginePath);
    let results: any[] = [];
    let index = 0;

    const sendCommand = (cmd: string) => {
      stockfish.stdin.write(cmd + "\n");
    };

    const analyzeNext = () => {
      if (index > moves.length) {
        stockfish.kill();
        return resolve(results);
      }

      // позиция до хода index
      const pos = "position startpos moves " + moves.slice(0, index).join(" ");
      sendCommand(pos);
      sendCommand("go depth 15"); // глубину можно регулировать

      let buffer = "";
      stockfish.stdout.on("data", (data) => {
        buffer += data.toString();

        if (buffer.includes("bestmove")) {
          const lines = buffer.trim().split("\n");
          let score: number | string = 0;

          for (let line of lines) {
            if (line.includes("score")) {
              const match = line.match(/score (cp|mate) (-?\d+)/);
              if (match) {
                if (match[1] === "cp") {
                  score = parseInt(match[2]) / 100.0; // в пешках
                } else {
                  score = "M" + match[2]; // мат
                }
              }
            }
          }

          results.push({
            ply: index,
            move: moves[index - 1] || null,
            eval: score,
          });

          buffer = "";
          stockfish.stdout.removeAllListeners("data");
          index++;
          analyzeNext();
        }
      });
    };

    // Инициализация движка
    sendCommand("uci");
    sendCommand("ucinewgame");
    sendCommand("isready");

    analyzeNext();
  });
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

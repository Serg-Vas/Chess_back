import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const enginePath = path.join(__dirname, "stockfish", "stockfish-windows-x86-64-avx2.exe");

// Пример партии, 10 ходов, белые выигрывают
const movesSequence = [
  "e2e4", "g8f6", "d1f3", "f6h5", "f3h5"
];

const engine = spawn(enginePath);

engine.stdout.setEncoding("utf-8");
engine.stderr.setEncoding("utf-8");

// Чтобы Stockfish успевал, обернем в промисы
function sendCommand(cmd) {
  return new Promise((resolve) => {
    engine.stdin.write(cmd + "\n");
    // небольшая пауза, чтобы Stockfish обработал команду
    setTimeout(resolve, 50);
  });
}

function getScoreAfterMove(moves) {
  return new Promise((resolve) => {
    let scoreText = "N/A";

    function onData(data) {
      const text = data.toString();

      // Парсим score
      const scoreMatch = text.match(/score (cp|mate) (-?\d+)/);
      if (scoreMatch) {
        const kind = scoreMatch[1];
        const raw = parseInt(scoreMatch[2], 10);

        if (kind === "cp") {
          const val = Math.abs(raw / 100).toFixed(2);
          const side = raw > 0 ? "White" : raw < 0 ? "Black" : "Equal";
          scoreText = `${val} (${side} better)`;
        } else {
          const side = raw > 0 ? "White" : "Black";
          scoreText = `Mate in ${Math.abs(raw)} (${side} wins)`;
        }
      }

      // Ждем bestmove — значит Stockfish закончил анализ позиции
      const bestMoveMatch = text.match(/bestmove\s/);
      if (bestMoveMatch) {
        engine.stdout.off("data", onData);
        resolve(scoreText);
      }
    }

    engine.stdout.on("data", onData);

    // Отправляем команду Stockfish
    engine.stdin.write(`position startpos moves ${moves.join(" ")}\n`);
    engine.stdin.write("go depth 30\n");
  });
}

async function runGame() {
  const moves = [];
  for (let i = 0; i < movesSequence.length; i++) {
    moves.push(movesSequence[i]);
    const score = await getScoreAfterMove(moves);
    console.log(`Move ${i + 1}: ${movesSequence[i]} | Score: ${score}`);
  }
  engine.stdin.write("quit\n");
}

engine.stdin.write("uci\n");
engine.stdin.write("isready\n");

runGame();

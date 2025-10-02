import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_FILE = path.join(DATA_DIR, "moveHistory.json");

export async function POST(req: NextRequest) {
  try {
    const { move } = await req.json();
    console.log("Получен ход:", move);

    if (!move || typeof move !== "string") {
      return NextResponse.json({ error: "Некорректный ход" }, { status: 400 });
    }

    // --- создаём папку, если нет ---
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR);
    }

    // --- читаем историю ---
    let history: string[] = [];
    if (fs.existsSync(HISTORY_FILE)) {
      const content = fs.readFileSync(HISTORY_FILE, "utf-8");
      history = JSON.parse(content);
    }

    // --- добавляем ход ---
    history.push(move);

    // --- сохраняем файл ---
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");

    return NextResponse.json({ success: true, move, history });
  } catch (err) {
    console.error("Ошибка сервера:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

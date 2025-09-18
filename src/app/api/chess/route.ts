import { NextResponse } from "next/server";
import { askClaudeOnce } from "../../api";
import { log } from "console";

const modelId = "claude-sonnet-4-20250514";
const maxTokens = 200;

export async function POST(req: Request) {
  try {
    const { email, fen, message } = await req.json();

    // --- Prompt для Claude ---
    const prompt = `
      ${message ? `⚠️ Important note: ${message}\n` : ""}
      You are a chess engine. 
      
      The current board FEN is: ${fen}
      
      Return ONLY one move in strict JSON format:
      { "from": "e2", "to": "e4", "promotion": "q" }
    `;

    const result = await askClaudeOnce(email, prompt, modelId, maxTokens);
    log("Chess AI result:", message);

    return NextResponse.json({ move: JSON.parse(result) });
  } catch (err: any) {
    console.error("Chess AI error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const HISTORY_FILE = path.join(process.cwd(), "data", "moveHistory.json");

export async function DELETE() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([]));

    return NextResponse.json({ success: true, message: "History cleared" });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  }
}

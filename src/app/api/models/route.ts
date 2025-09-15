import { NextResponse } from "next/server";
import { models } from "@/lib/models";

export async function GET() {
  return NextResponse.json(models);
}

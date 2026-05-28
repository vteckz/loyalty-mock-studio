import { NextResponse } from "next/server";
import { recentLog } from "@/lib/state";

export async function GET() {
  return NextResponse.json({ entries: recentLog() });
}

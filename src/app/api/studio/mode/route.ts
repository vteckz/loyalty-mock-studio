import { NextResponse, type NextRequest } from "next/server";
import { getPromotionMode, setPromotionMode } from "@/lib/state";
import type { PromotionMode } from "@/types/studio";

const VALID: PromotionMode[] = ["auto", "gpm", "gmp"];

export async function GET() {
  return NextResponse.json({ promotionMode: getPromotionMode() });
}

export async function POST(req: NextRequest) {
  const { promotionMode } = (await req.json()) as { promotionMode?: PromotionMode };
  if (!promotionMode || !VALID.includes(promotionMode)) {
    return NextResponse.json({ error: "invalid_mode" }, { status: 400 });
  }
  setPromotionMode(promotionMode);
  return NextResponse.json({ promotionMode });
}

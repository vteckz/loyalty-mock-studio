import { NextResponse } from "next/server";
import { ENDPOINTS } from "@/lib/endpoints";
import { listAllScenarios } from "@/lib/fixtures";
import { state } from "@/lib/state";

export async function GET() {
  const scenarios = await listAllScenarios();
  const active: Record<string, string | null> = {};
  for (const e of ENDPOINTS) {
    active[e.id] = state.activeScenario.get(e.id) ?? scenarios[e.id]?.[0]?.id ?? null;
  }
  return NextResponse.json({
    endpoints: ENDPOINTS,
    scenarios,
    active,
    promotionMode: state.promotionMode ?? "auto",
  });
}

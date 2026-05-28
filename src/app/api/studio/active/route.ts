import { NextResponse, type NextRequest } from "next/server";
import { getEndpoint } from "@/lib/endpoints";
import { setActive, state } from "@/lib/state";

export async function POST(req: NextRequest) {
  const { endpointId, scenarioId } = (await req.json()) as {
    endpointId?: string;
    scenarioId?: string;
  };
  if (!endpointId || !scenarioId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!getEndpoint(endpointId)) {
    return NextResponse.json({ error: "unknown_endpoint" }, { status: 404 });
  }
  setActive(endpointId, scenarioId);
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const out: Record<string, string | null> = {};
  state.activeScenario.forEach((v, k) => {
    out[k] = v;
  });
  return NextResponse.json(out);
}

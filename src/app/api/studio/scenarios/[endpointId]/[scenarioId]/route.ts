import { NextResponse, type NextRequest } from "next/server";
import { readScenario, writeScenario } from "@/lib/fixtures";
import { getEndpoint } from "@/lib/endpoints";
import type { ScenarioFile } from "@/types/studio";

interface Params {
  params: Promise<{ endpointId: string; scenarioId: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { endpointId, scenarioId } = await params;
  if (!getEndpoint(endpointId)) {
    return NextResponse.json({ error: "unknown_endpoint" }, { status: 404 });
  }
  const scenario = await readScenario(endpointId, scenarioId);
  if (!scenario) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(scenario);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { endpointId, scenarioId } = await params;
  if (!getEndpoint(endpointId)) {
    return NextResponse.json({ error: "unknown_endpoint" }, { status: 404 });
  }
  const body = (await req.json()) as Partial<ScenarioFile>;
  const merged: ScenarioFile = {
    id: scenarioId,
    endpointId,
    name: body.name ?? scenarioId,
    description: body.description ?? "",
    request: body.request,
    response: body.response ?? { status: 200, body: {} },
    latencyMs: body.latencyMs,
    notes: body.notes,
  };
  await writeScenario(merged);
  return NextResponse.json(merged);
}

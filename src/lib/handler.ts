import { NextResponse, type NextRequest } from "next/server";
import { listScenarios, readScenario } from "@/lib/fixtures";
import { appendLog, getActive, setActive, getPromotionMode } from "@/lib/state";
import { activePromotionEndpoint, PROMOTION_ENDPOINT_IDS } from "@/lib/endpoints";
import type { ScenarioFile, RequestLogEntry, HttpMethod } from "@/types/studio";

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

async function pickScenario(
  endpointId: string,
  override: string | null,
): Promise<ScenarioFile | null> {
  if (override) {
    const s = await readScenario(endpointId, override);
    if (s) return s;
  }
  const activeId = getActive(endpointId);
  if (activeId) {
    const s = await readScenario(endpointId, activeId);
    if (s) return s;
  }
  const all = await listScenarios(endpointId);
  if (all.length === 0) return null;
  setActive(endpointId, all[0].id);
  return all[0];
}

async function parseBody(req: NextRequest): Promise<unknown> {
  const ct = req.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) return await req.json();
    if (ct.includes("application/x-www-form-urlencoded")) {
      const text = await req.text();
      const params = new URLSearchParams(text);
      return Object.fromEntries(params);
    }
    const text = await req.text();
    return text.length ? text : null;
  } catch {
    return null;
  }
}

function flattenHeaders(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  req.headers.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

function flattenQuery(req: NextRequest): Record<string, string> {
  const out: Record<string, string> = {};
  req.nextUrl.searchParams.forEach((v, k) => {
    out[k] = v;
  });
  return out;
}

export function makeHandler(endpointId: string) {
  return async function handle(req: NextRequest): Promise<NextResponse> {
    const started = Date.now();
    const override = req.headers.get("x-mock-scenario");

    const requestBody = await parseBody(req);
    const query = flattenQuery(req);
    const headers = flattenHeaders(req);

    // Promotion-mode guard: if the studio is focused on one promotion API and
    // the cartridge calls the other, answer with a loud 409 so a misconfigured
    // LoyaltyConfig.PROMOTION_API surfaces immediately instead of silently
    // hitting the wrong resource.
    const mode = getPromotionMode();
    if (mode !== "auto" && PROMOTION_ENDPOINT_IDS.includes(endpointId)) {
      const expected = activePromotionEndpoint(mode);
      if (expected && endpointId !== expected) {
        const body = {
          error: "wrong_promotion_mode",
          message: `Studio is in '${mode}' mode (serving '${expected}'), but the cartridge called '${endpointId}'. Check LoyaltyConfig.PROMOTION_API.`,
        };
        appendLog({
          id: genId(),
          ts: started,
          endpointId,
          method: req.method as HttpMethod,
          path: req.nextUrl.pathname,
          scenarioId: null,
          request: { headers, query, body: requestBody },
          response: { status: 409, body, latencyMs: 0 },
        });
        return NextResponse.json(body, { status: 409 });
      }
    }

    const scenario = await pickScenario(endpointId, override);

    if (!scenario) {
      const body = {
        error: "no_scenario",
        message: `No fixture defined for endpoint '${endpointId}'. Add one in fixtures/${endpointId}/.`,
      };
      const entry: RequestLogEntry = {
        id: genId(),
        ts: started,
        endpointId,
        method: req.method as HttpMethod,
        path: req.nextUrl.pathname,
        scenarioId: null,
        request: { headers, query, body: requestBody },
        response: { status: 404, body, latencyMs: 0 },
      };
      appendLog(entry);
      return NextResponse.json(body, { status: 404 });
    }

    const latency = scenario.latencyMs ?? 0;
    if (latency > 0) await new Promise((r) => setTimeout(r, latency));

    const entry: RequestLogEntry = {
      id: genId(),
      ts: started,
      endpointId,
      method: req.method as HttpMethod,
      path: req.nextUrl.pathname,
      scenarioId: scenario.id,
      request: { headers, query, body: requestBody },
      response: {
        status: scenario.response.status,
        body: scenario.response.body,
        latencyMs: Date.now() - started,
      },
    };
    appendLog(entry);

    return NextResponse.json(scenario.response.body, {
      status: scenario.response.status,
      headers: scenario.response.headers,
    });
  };
}

import { promises as fs } from "node:fs";
import path from "node:path";
import { ENDPOINTS } from "@/lib/endpoints";
import type { ScenarioFile } from "@/types/studio";

const FIXTURES_ROOT = path.resolve(process.cwd(), "fixtures");

function endpointDir(endpointId: string): string {
  return path.join(FIXTURES_ROOT, endpointId);
}

function scenarioPath(endpointId: string, scenarioId: string): string {
  return path.join(endpointDir(endpointId), `${scenarioId}.json`);
}

export async function listScenarios(endpointId: string): Promise<ScenarioFile[]> {
  const dir = endpointDir(endpointId);
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const files = entries.filter((f) => f.endsWith(".json")).sort();
  const out: ScenarioFile[] = [];
  for (const f of files) {
    const raw = await fs.readFile(path.join(dir, f), "utf8");
    const parsed = JSON.parse(raw) as Omit<ScenarioFile, "id" | "endpointId">;
    out.push({
      ...parsed,
      id: f.replace(/\.json$/, ""),
      endpointId,
    });
  }
  return out;
}

export async function readScenario(
  endpointId: string,
  scenarioId: string,
): Promise<ScenarioFile | null> {
  try {
    const raw = await fs.readFile(scenarioPath(endpointId, scenarioId), "utf8");
    const parsed = JSON.parse(raw) as Omit<ScenarioFile, "id" | "endpointId">;
    return { ...parsed, id: scenarioId, endpointId };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

export async function writeScenario(scenario: ScenarioFile): Promise<void> {
  const dir = endpointDir(scenario.endpointId);
  await fs.mkdir(dir, { recursive: true });
  const { id, endpointId, ...rest } = scenario;
  void id;
  void endpointId;
  const body = JSON.stringify(rest, null, 2) + "\n";
  await fs.writeFile(scenarioPath(scenario.endpointId, scenario.id), body, "utf8");
}

export async function listAllScenarios(): Promise<Record<string, ScenarioFile[]>> {
  const out: Record<string, ScenarioFile[]> = {};
  await Promise.all(
    ENDPOINTS.map(async (e) => {
      out[e.id] = await listScenarios(e.id);
    }),
  );
  return out;
}

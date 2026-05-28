import type { RequestLogEntry, PromotionMode } from "@/types/studio";

type Listener = (entry: RequestLogEntry) => void;

interface StudioState {
  /** endpointId -> active scenarioId (just the file basename, no extension) */
  activeScenario: Map<string, string>;
  /** Recent requests, newest first, capped at MAX_LOG. */
  log: RequestLogEntry[];
  /** SSE subscribers. */
  listeners: Set<Listener>;
  /** Promotion API the studio is focused on (mirrors adapter PROMOTION_API). */
  promotionMode: PromotionMode;
}

const MAX_LOG = 200;

declare global {
  // eslint-disable-next-line no-var
  var __loyaltyMockStudioState: StudioState | undefined;
}

function init(): StudioState {
  return {
    activeScenario: new Map(),
    log: [],
    listeners: new Set(),
    promotionMode: "auto",
  };
}

export const state: StudioState =
  globalThis.__loyaltyMockStudioState ?? (globalThis.__loyaltyMockStudioState = init());

export function setActive(endpointId: string, scenarioId: string): void {
  state.activeScenario.set(endpointId, scenarioId);
}

export function getActive(endpointId: string): string | undefined {
  return state.activeScenario.get(endpointId);
}

export function appendLog(entry: RequestLogEntry): void {
  state.log.unshift(entry);
  if (state.log.length > MAX_LOG) state.log.length = MAX_LOG;
  for (const l of state.listeners) {
    try {
      l(entry);
    } catch {
      // listener will be removed when its stream closes
    }
  }
}

export function recentLog(): RequestLogEntry[] {
  return state.log;
}

export function subscribe(l: Listener): () => void {
  state.listeners.add(l);
  return () => state.listeners.delete(l);
}

export function getPromotionMode(): PromotionMode {
  return state.promotionMode ?? "auto";
}

export function setPromotionMode(mode: PromotionMode): void {
  state.promotionMode = mode;
}

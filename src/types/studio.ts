export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

/**
 * Which promotion API the studio is focused on, mirroring the adapter's
 * LoyaltyConfig.PROMOTION_API. "auto" = serve both (no guarding).
 */
export type PromotionMode = "auto" | "gpm" | "gmp";

export interface EndpointMeta {
  id: string;
  name: string;
  method: HttpMethod;
  /** Studio-local path that the SFCC cartridge actually calls. */
  mockPath: string;
  /** Reference path on the real Salesforce Loyalty REST API (for the dev's reading). */
  sfPath: string;
  description: string;
}

export interface ScenarioFile {
  id: string;
  endpointId: string;
  name: string;
  description: string;
  /** Example request that produced this response (informational only). */
  request?: {
    body?: unknown;
    query?: Record<string, string>;
  };
  response: {
    status: number;
    headers?: Record<string, string>;
    body: unknown;
  };
  /** Artificial delay in ms before the response is sent. */
  latencyMs?: number;
  notes?: string;
}

export interface RequestLogEntry {
  id: string;
  ts: number;
  endpointId: string;
  method: HttpMethod;
  path: string;
  scenarioId: string | null;
  request: {
    headers: Record<string, string>;
    query: Record<string, string>;
    body: unknown;
  };
  response: {
    status: number;
    body: unknown;
    latencyMs: number;
  };
}

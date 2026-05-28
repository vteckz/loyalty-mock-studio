"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  EndpointMeta,
  PromotionMode,
  RequestLogEntry,
  ScenarioFile,
} from "@/types/studio";
import { EndpointTabs } from "@/components/studio/endpoint-tabs";
import { ScenarioList } from "@/components/studio/scenario-list";
import { ScenarioEditor } from "@/components/studio/scenario-editor";
import { RequestLog } from "@/components/studio/request-log";

interface StudioBootstrap {
  endpoints: EndpointMeta[];
  scenarios: Record<string, ScenarioFile[]>;
  active: Record<string, string | null>;
  promotionMode: PromotionMode;
}

const MODE_LABEL: Record<PromotionMode, string> = {
  auto: "Auto",
  gpm: "GPM",
  gmp: "GetMember",
};

export function StudioApp() {
  const [boot, setBoot] = useState<StudioBootstrap | null>(null);
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<RequestLogEntry[]>([]);
  const [baseUrl, setBaseUrl] = useState<string>("");
  const streamRef = useRef<EventSource | null>(null);

  const refresh = useCallback(async () => {
    const r = await fetch("/api/studio/endpoints", { cache: "no-store" });
    const data = (await r.json()) as StudioBootstrap;
    setBoot(data);
    setSelectedEndpointId((prev) => prev ?? data.endpoints[0]?.id ?? null);
  }, []);

  useEffect(() => {
    refresh();
    fetch("/api/studio/log")
      .then((r) => r.json())
      .then((d: { entries: RequestLogEntry[] }) => setLogEntries(d.entries));
    setBaseUrl(`${window.location.origin}`);
  }, [refresh]);

  useEffect(() => {
    const es = new EventSource("/api/studio/log/stream");
    streamRef.current = es;
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data);
        if (data?.id) {
          setLogEntries((prev) => [data as RequestLogEntry, ...prev].slice(0, 200));
        }
      } catch {
        // ignore malformed frames
      }
    };
    es.onerror = () => {
      // browser auto-reconnects; nothing to do
    };
    return () => {
      es.close();
    };
  }, []);

  useEffect(() => {
    if (!boot || !selectedEndpointId) return;
    const list = boot.scenarios[selectedEndpointId] ?? [];
    setSelectedScenarioId((prev) => {
      if (prev && list.some((s) => s.id === prev)) return prev;
      return boot.active[selectedEndpointId] ?? list[0]?.id ?? null;
    });
  }, [boot, selectedEndpointId]);

  const selectedEndpoint = useMemo(
    () => boot?.endpoints.find((e) => e.id === selectedEndpointId) ?? null,
    [boot, selectedEndpointId],
  );

  const scenariosForEndpoint = useMemo(
    () => (selectedEndpointId ? boot?.scenarios[selectedEndpointId] ?? [] : []),
    [boot, selectedEndpointId],
  );

  const selectedScenario = useMemo(
    () => scenariosForEndpoint.find((s) => s.id === selectedScenarioId) ?? null,
    [scenariosForEndpoint, selectedScenarioId],
  );

  const activeScenarioId = selectedEndpointId
    ? boot?.active[selectedEndpointId] ?? null
    : null;

  const handleSetActive = useCallback(
    async (endpointId: string, scenarioId: string) => {
      const r = await fetch("/api/studio/active", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpointId, scenarioId }),
      });
      if (!r.ok) {
        toast.error("Failed to set active scenario");
        return;
      }
      toast.success(`Active scenario set: ${scenarioId}`);
      await refresh();
    },
    [refresh],
  );

  const handleSaveScenario = useCallback(
    async (scenario: ScenarioFile) => {
      const r = await fetch(
        `/api/studio/scenarios/${scenario.endpointId}/${scenario.id}`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(scenario),
        },
      );
      if (!r.ok) {
        toast.error("Failed to save scenario");
        return;
      }
      toast.success(`Saved fixtures/${scenario.endpointId}/${scenario.id}.json`);
      await refresh();
    },
    [refresh],
  );

  const copyBaseUrl = () => {
    navigator.clipboard.writeText(baseUrl);
    toast.success("Base URL copied — paste into the cartridge service config");
  };

  const handleSetMode = useCallback(
    async (mode: PromotionMode) => {
      const r = await fetch("/api/studio/mode", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ promotionMode: mode }),
      });
      if (!r.ok) {
        toast.error("Failed to set promotion mode");
        return;
      }
      toast.success(
        mode === "auto"
          ? "Serving both promotion APIs"
          : `Promotion mode: ${MODE_LABEL[mode]} — the other promotion endpoint now returns 409`,
      );
      await refresh();
    },
    [refresh],
  );

  if (!boot) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b px-6 py-3">
        <div>
          <h1 className="text-lg font-semibold">Loyalty Mock Studio</h1>
          <p className="text-xs text-muted-foreground">
            Local SF Loyalty API mock
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Promotion API</span>
            <div className="flex items-center gap-0.5 rounded-md border p-0.5">
              {(["auto", "gpm", "gmp"] as PromotionMode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => handleSetMode(m)}
                  title={
                    m === "auto"
                      ? "Serve both promotion endpoints"
                      : `Focus on ${MODE_LABEL[m]}; the other promotion endpoint returns 409`
                  }
                  className={cn(
                    "rounded px-2 py-1 text-xs transition-colors",
                    boot.promotionMode === m
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {MODE_LABEL[m]}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 text-xs">{baseUrl || "—"}</code>
            <Button size="sm" variant="outline" onClick={copyBaseUrl} disabled={!baseUrl}>
              Copy base URL
            </Button>
          </div>
        </div>
      </header>

      <EndpointTabs
        endpoints={boot.endpoints}
        scenarios={boot.scenarios}
        active={boot.active}
        promotionMode={boot.promotionMode}
        selectedEndpointId={selectedEndpointId}
        onSelect={setSelectedEndpointId}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[260px_1fr_360px]">
        <ScenarioList
          endpoint={selectedEndpoint}
          scenarios={scenariosForEndpoint}
          selectedScenarioId={selectedScenarioId}
          activeScenarioId={activeScenarioId}
          onSelect={setSelectedScenarioId}
        />
        <ScenarioEditor
          endpoint={selectedEndpoint}
          scenario={selectedScenario}
          isActive={selectedScenario?.id === activeScenarioId}
          onSave={handleSaveScenario}
          onSetActive={(s) => handleSetActive(s.endpointId, s.id)}
          baseUrl={baseUrl}
        />
        <RequestLog
          entries={logEntries}
          highlightEndpointId={selectedEndpointId}
          onClear={() => setLogEntries([])}
        />
      </div>
    </div>
  );
}

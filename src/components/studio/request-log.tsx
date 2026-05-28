"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { RequestLogEntry } from "@/types/studio";

interface Props {
  entries: RequestLogEntry[];
  highlightEndpointId: string | null;
  onClear: () => void;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString([], { hour12: false }) + "." + d.getMilliseconds().toString().padStart(3, "0");
}

function statusVariant(status: number): "default" | "secondary" | "destructive" {
  if (status >= 500 || status >= 400) return "destructive";
  if (status >= 300) return "secondary";
  return "default";
}

export function RequestLog({ entries, highlightEndpointId, onClear }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterToSelected, setFilterToSelected] = useState(false);

  const visible = filterToSelected
    ? entries.filter((e) => e.endpointId === highlightEndpointId)
    : entries;

  return (
    <div className="flex min-h-0 flex-col border-l">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <h2 className="text-sm font-semibold">
          Request log <span className="text-xs text-muted-foreground">({visible.length})</span>
        </h2>
        <Button size="sm" variant="ghost" onClick={onClear} className="h-7 text-xs">
          Clear
        </Button>
      </div>
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Switch
          id="filter"
          checked={filterToSelected}
          onCheckedChange={setFilterToSelected}
        />
        <Label htmlFor="filter" className="text-xs">
          Filter to selected endpoint
        </Label>
      </div>
      <ScrollArea className="flex-1">
        {visible.length === 0 && (
          <div className="space-y-2 p-6 text-center text-xs text-muted-foreground">
            <p>Waiting for requests… try</p>
            <code className="inline-block rounded bg-muted px-2 py-1 text-[10px]">
              curl -X POST localhost:3000/api/loyalty/promotion-execution
            </code>
            <p className="text-[11px]">
              New here? Open the <strong>Guide</strong> (top-right).
            </p>
          </div>
        )}
        {visible.map((e) => {
          const expanded = expandedId === e.id;
          return (
            <button
              key={e.id}
              onClick={() => setExpandedId(expanded ? null : e.id)}
              className={cn(
                "flex w-full flex-col items-start gap-1 border-b px-3 py-2 text-left text-xs transition-colors",
                expanded ? "bg-muted" : "hover:bg-muted/50",
                e.endpointId === highlightEndpointId && !expanded && "border-l-2 border-l-primary",
              )}
            >
              <div className="flex w-full items-center gap-2">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {fmtTime(e.ts)}
                </span>
                <Badge variant="outline" className="font-mono text-[10px]">
                  {e.method}
                </Badge>
                <span className="flex-1 truncate font-medium">{e.endpointId}</span>
                <Badge variant={statusVariant(e.response.status)} className="text-[10px]">
                  {e.response.status}
                </Badge>
              </div>
              <div className="flex w-full items-center justify-between text-[10px] text-muted-foreground">
                <code className="truncate">{e.path}</code>
                <span>
                  {e.scenarioId ?? "—"} · {e.response.latencyMs}ms
                </span>
              </div>
              {expanded && (
                <div className="mt-2 w-full space-y-2 text-[11px]">
                  <details open className="rounded bg-background/60 p-2">
                    <summary className="cursor-pointer font-semibold">
                      Request body
                    </summary>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px]">
                      {JSON.stringify(e.request.body, null, 2)}
                    </pre>
                  </details>
                  <details className="rounded bg-background/60 p-2">
                    <summary className="cursor-pointer font-semibold">
                      Request headers
                    </summary>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px]">
                      {JSON.stringify(e.request.headers, null, 2)}
                    </pre>
                  </details>
                  <details open className="rounded bg-background/60 p-2">
                    <summary className="cursor-pointer font-semibold">
                      Response body
                    </summary>
                    <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px]">
                      {JSON.stringify(e.response.body, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </button>
          );
        })}
      </ScrollArea>
    </div>
  );
}

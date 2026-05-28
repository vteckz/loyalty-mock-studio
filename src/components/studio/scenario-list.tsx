"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { EndpointMeta, ScenarioFile } from "@/types/studio";

interface Props {
  endpoint: EndpointMeta | null;
  scenarios: ScenarioFile[];
  selectedScenarioId: string | null;
  activeScenarioId: string | null;
  onSelect: (id: string) => void;
}

function statusVariant(status: number): "default" | "secondary" | "destructive" {
  if (status >= 500) return "destructive";
  if (status >= 400) return "destructive";
  if (status >= 300) return "secondary";
  return "default";
}

export function ScenarioList({
  endpoint,
  scenarios,
  selectedScenarioId,
  activeScenarioId,
  onSelect,
}: Props) {
  if (!endpoint) {
    return <div className="border-r p-4 text-sm text-muted-foreground">No endpoint</div>;
  }

  return (
    <div className="flex flex-col border-r">
      <div className="border-b p-3">
        <h2 className="text-sm font-semibold">Scenarios</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          The active scenario is what every incoming request gets.
        </p>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col">
          {scenarios.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">
              No fixtures yet. Add one at
              <code className="ml-1 rounded bg-muted px-1 py-0.5 text-xs">
                fixtures/{endpoint.id}/
              </code>
            </div>
          )}
          {scenarios.map((s) => {
            const isSelected = s.id === selectedScenarioId;
            const isActive = s.id === activeScenarioId;
            return (
              <button
                key={s.id}
                onClick={() => onSelect(s.id)}
                className={cn(
                  "flex flex-col items-start gap-1 border-b px-3 py-2.5 text-left text-sm transition-colors",
                  isSelected ? "bg-muted" : "hover:bg-muted/50",
                )}
              >
                <div className="flex w-full items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 shrink-0 rounded-full",
                      isActive ? "bg-emerald-500" : "bg-border",
                    )}
                    title={isActive ? "active" : ""}
                  />
                  <span className="flex-1 truncate font-medium">{s.name}</span>
                  <Badge
                    variant={statusVariant(s.response.status)}
                    className="text-[10px]"
                  >
                    {s.response.status}
                  </Badge>
                </div>
                <code className="font-mono text-[10px] text-muted-foreground">{s.id}</code>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

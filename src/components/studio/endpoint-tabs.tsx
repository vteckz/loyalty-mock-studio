"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { activePromotionEndpoint, PROMOTION_ENDPOINT_IDS } from "@/lib/endpoints";
import type { EndpointMeta, PromotionMode, ScenarioFile } from "@/types/studio";

interface Props {
  endpoints: EndpointMeta[];
  scenarios: Record<string, ScenarioFile[]>;
  active: Record<string, string | null>;
  promotionMode: PromotionMode;
  selectedEndpointId: string | null;
  onSelect: (id: string) => void;
}

export function EndpointTabs({
  endpoints,
  scenarios,
  active,
  promotionMode,
  selectedEndpointId,
  onSelect,
}: Props) {
  const expectedPromotion = activePromotionEndpoint(promotionMode);
  return (
    <ScrollArea className="border-b">
      <div className="flex w-max gap-1 px-4 py-2">
        {endpoints.map((e) => {
          const count = scenarios[e.id]?.length ?? 0;
          const activeId = active[e.id];
          const isSelected = e.id === selectedEndpointId;
          const isPromotion = PROMOTION_ENDPOINT_IDS.includes(e.id);
          const isGuarded =
            promotionMode !== "auto" && isPromotion && e.id !== expectedPromotion;
          const isFocused =
            promotionMode !== "auto" && isPromotion && e.id === expectedPromotion;
          return (
            <button
              key={e.id}
              onClick={() => onSelect(e.id)}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
                isGuarded && !isSelected && "opacity-40",
              )}
            >
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-[10px] font-mono",
                  isSelected
                    ? "bg-primary-foreground/20"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {e.method}
              </span>
              <span>{e.name}</span>
              <Badge variant={isSelected ? "secondary" : "outline"} className="text-[10px]">
                {count}
              </Badge>
              {activeId && count > 0 && (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isSelected ? "bg-emerald-300" : "bg-emerald-500",
                  )}
                  title={`active: ${activeId}`}
                />
              )}
              {isFocused && (
                <Badge className="bg-emerald-500 text-[9px] text-white" title="active for the selected promotion mode">
                  mode
                </Badge>
              )}
              {isGuarded && (
                <Badge variant="destructive" className="text-[9px]" title="guarded — returns 409 in the selected mode">
                  409
                </Badge>
              )}
            </button>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

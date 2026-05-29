"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { activePromotionEndpoint, PROMOTION_ENDPOINT_IDS } from "@/lib/endpoints";
import { GROUP_ORDER, type EndpointMeta, type PromotionMode, type ScenarioFile } from "@/types/studio";

interface Props {
  endpoints: EndpointMeta[];
  scenarios: Record<string, ScenarioFile[]>;
  active: Record<string, string | null>;
  promotionMode: PromotionMode;
  selectedEndpointId: string | null;
  onSelect: (id: string) => void;
}

function groupRank(group: string | undefined): number {
  const i = GROUP_ORDER.indexOf((group ?? "") as (typeof GROUP_ORDER)[number]);
  return i === -1 ? GROUP_ORDER.length : i;
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

  // Group endpoints in GROUP_ORDER, preserving original order within each group.
  const groupNames: string[] = [];
  const byGroup = new Map<string, EndpointMeta[]>();
  for (const e of endpoints) {
    const g = e.group ?? "Other";
    if (!byGroup.has(g)) {
      byGroup.set(g, []);
      groupNames.push(g);
    }
    byGroup.get(g)!.push(e);
  }
  groupNames.sort((a, b) => groupRank(a) - groupRank(b) || a.localeCompare(b));

  // Native horizontal scroller: translate a vertical mouse wheel into
  // horizontal scroll so the tab bar is reachable without a trackpad/shift.
  // Attached as a NON-passive listener so we can preventDefault and stop the
  // page (or the bar's own residual overflow) from also scrolling vertically.
  const scrollerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return; // nothing to scroll
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // let native handle horizontal swipes
      el.scrollLeft += e.deltaY;
      e.preventDefault();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div ref={scrollerRef} className="tab-scroller overflow-x-auto overflow-y-hidden border-b">
      <div className="flex w-max items-stretch gap-1 px-4 py-2">
        {groupNames.map((group, gi) => (
          <div key={group} className="flex items-center gap-1">
            {gi > 0 && <div className="mx-1 h-8 w-px self-center bg-border" />}
            <span className="px-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70">
              {group}
            </span>
            {byGroup.get(group)!.map((e) => {
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
                  <span className="whitespace-nowrap">{e.name}</span>
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
        ))}
      </div>
    </div>
  );
}

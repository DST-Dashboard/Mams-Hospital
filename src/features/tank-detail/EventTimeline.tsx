"use client";

import { ArrowDownRight, ArrowUpRight, Calendar, Droplets } from "lucide-react";
import React from "react";
import { cm, stamp } from "@/lib/format";
import { useUi } from "@/lib/store";
import type { AnalyticsResponse } from "@/lib/types";

export function EventTimeline({ events }: { events: AnalyticsResponse["events"] }) {
  const tz = useUi((s) => s.tz);

  if (!events || events.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center text-center text-xs text-muted rounded-lg border hairline bg-raised/20 p-4">
        <Droplets size={20} className="opacity-40 mb-1" />
        <span>No fill or drain events recorded in this time window.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {events
        .slice()
        .reverse()
        .map((e, idx) => {
          const isFill = e.kind === "fill";
          const durationM = Math.max(1, Math.round((e.endT - e.startT) / 60_000));

          return (
            <div
              key={`${e.startT}-${idx}`}
              className="flex items-center justify-between gap-3 rounded-lg border hairline bg-raised/30 p-2.5 hover:bg-raised/60 transition-colors text-xs"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-md ${
                    isFill ? "bg-ok/15 text-ok" : "bg-info/15 text-info"
                  }`}
                >
                  {isFill ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                </span>

                <div>
                  <div className="font-semibold text-ink">
                    {isFill ? "Tank Refilled" : "Water Consumption Drain"}
                  </div>
                  <div className="text-[11px] text-muted">
                    {cm(e.startLevelCm)} → {cm(e.endLevelCm)} (Δ {cm(Math.abs(e.deltaCm))}) · {durationM} min
                  </div>
                </div>
              </div>

              <span className="font-mono text-[11px] text-muted text-right whitespace-nowrap">
                {stamp(e.startT, tz)}
              </span>
            </div>
          );
        })}
    </div>
  );
}

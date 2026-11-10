"use client";

import React, { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Clock, Droplets } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { fmtLitres, stamp } from "@/lib/format";
import { useUi } from "@/lib/store";
import { isUnstable } from "@/lib/series";

export interface EventItem {
  kind: "fill" | "drain";
  startT: number;
  endT: number;
  startLevelCm: number;
  endLevelCm: number;
  deltaCm: number;
}

export interface EventTimelineProps {
  events: EventItem[];
  tankHeightCm: number;
  tankCapacityL: number;
  className?: string;
}

export function EventTimeline({
  events = [],
  tankHeightCm,
  tankCapacityL,
  className,
}: EventTimelineProps) {
  const tz = useUi((s) => s.tz);
  const [expanded, setExpanded] = useState(false);

  const flapping = isUnstable(events);
  const displayedEvents = expanded ? events : events.slice(0, 12);

  if (events.length === 0) {
    return (
      <div className={className}>
        <div className="card p-6 text-center text-[var(--tx-quiet)] text-[13px]">
          No pump fill or rapid drain cycles recorded in this monitoring window.
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="card p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent-500)] uppercase">
              <Droplets size={13} aria-hidden />
              <span>HYDRAULIC ACTIVITY</span>
            </div>
            <h3 className="card-title text-[20px] font-bold text-[var(--tx-head)] font-['Merriweather',serif]">
              Fill and drain events
            </h3>
          </div>
          <span className="text-[12px] font-semibold text-[var(--tx-quiet)]">
            {events.length} detected events
          </span>
        </div>

        {flapping && (
          <div className="banner banner--warning text-[12px]">
            High event count ({events.length} events) indicates sensor flapping. Individual cycle volumes may be noisy.
          </div>
        )}

        {/* Timeline rows */}
        <div className="divide-y divide-[var(--bd-soft)]">
          {displayedEvents.map((ev, i) => {
            const isFill = ev.kind === "fill";
            const durationMin = Math.max(1, Math.round((ev.endT - ev.startT) / 60_000));

            // Litres calculation: |deltaCm| / heightCm * capacityL
            const volL =
              tankHeightCm > 0
                ? Math.round((Math.abs(ev.deltaCm) / tankHeightCm) * tankCapacityL)
                : null;

            return (
              <div
                key={i}
                className="py-3 flex items-center justify-between gap-4 text-[13px]"
              >
                {/* Kind & Icon */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isFill
                        ? "bg-[var(--ok-bg)] text-[var(--ok-tx)] border border-[var(--ok-bd)]"
                        : "bg-[var(--warn-bg)] text-[var(--warn-tx)] border border-[var(--warn-bd)]"
                    }`}
                  >
                    {isFill ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                  </div>

                  <div className="flex flex-col">
                    <span className="font-bold text-[var(--tx-head)]">
                      {isFill ? "Pump fill cycle" : "Rapid drain episode"}
                    </span>
                    <span className="text-[11px] text-[var(--tx-quiet)] flex items-center gap-1 font-mono">
                      <Clock size={11} />
                      <span>{stamp(ev.startT, tz)} ({durationMin} min duration)</span>
                    </span>
                  </div>
                </div>

                {/* Metrics */}
                <div className="flex items-center gap-6 text-right font-mono">
                  <div className="flex flex-col">
                    <span className="font-bold text-[var(--tx-head)]">
                      {isFill ? "+" : "-"}{Math.abs(Math.round(ev.deltaCm))} cm
                    </span>
                    <span className="text-[11px] text-[var(--tx-quiet)]">
                      {ev.startLevelCm} → {ev.endLevelCm} cm
                    </span>
                  </div>

                  <div className="w-20 text-right">
                    <span className="font-bold text-[var(--brand-800)]">
                      {volL !== null ? fmtLitres(volL) : "—"}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Expand / Collapse Button */}
        {events.length > 12 && (
          <div className="flex justify-center pt-2 border-t border-[var(--bd-soft)]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show fewer events" : `Show all ${events.length} events`}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import clsx from "clsx";
import React, { useState } from "react";
import type { HeatmapDTO } from "@/contracts";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function Heatmap({ data, className }: { data: HeatmapDTO; className?: string }) {
  const [hovered, setHovered] = useState<{
    dow: number;
    hour: number;
    avgPct: number | null;
    n: number;
  } | null>(null);

  // Index cells by `${dow}-${hour}`
  const cellMap = new Map<string, (typeof data.cells)[number]>();
  for (const c of data.cells) {
    cellMap.set(`${c.dow}-${c.hour}`, c);
  }

  const getCellColor = (avgPct: number | null) => {
    if (avgPct == null) return "bg-raised/40 border-line/20";
    if (avgPct < 20) return "bg-crit/80 hover:bg-crit text-white";
    if (avgPct < 40) return "bg-warn/70 hover:bg-warn text-bg";
    if (avgPct < 70) return "bg-tide/70 hover:bg-tide text-bg";
    return "bg-ok/75 hover:bg-ok text-bg";
  };

  return (
    <div className={clsx("w-full space-y-3", className)}>
      <div className="flex items-center justify-between text-xs text-muted">
        <span>7 Days × 24 Hours Pattern ({data.tz} Time)</span>
        {hovered ? (
          <span className="font-mono font-medium text-ink bg-raised px-2 py-0.5 rounded border hairline">
            {DAYS[hovered.dow]} at {String(hovered.hour).padStart(2, "0")}:00:{" "}
            <span className="text-tide font-bold">
              {hovered.avgPct != null ? `${Math.round(hovered.avgPct)}%` : "No data"}
            </span>{" "}
            ({hovered.n} samples)
          </span>
        ) : (
          <span>Hover cell for reading</span>
        )}
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Hours Header */}
          <div className="grid grid-cols-[48px_repeat(24,1fr)] gap-1 mb-1 text-[10px] text-muted font-mono text-center">
            <span className="text-left font-sans">Day</span>
            {HOURS.map((h) => (
              <span key={h} className="opacity-70">
                {h % 3 === 0 ? h : ""}
              </span>
            ))}
          </div>

          {/* Days Rows */}
          <div className="space-y-1">
            {DAYS.map((dayName, dow) => (
              <div key={dayName} className="grid grid-cols-[48px_repeat(24,1fr)] gap-1 items-center">
                <span className="text-xs font-medium text-muted">{dayName}</span>

                {HOURS.map((hour) => {
                  const cell = cellMap.get(`${dow}-${hour}`);
                  const avgPct = cell?.avgPct ?? null;
                  const n = cell?.n ?? 0;

                  return (
                    <div
                      key={hour}
                      tabIndex={0}
                      onMouseEnter={() => setHovered({ dow, hour, avgPct, n })}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered({ dow, hour, avgPct, n })}
                      onBlur={() => setHovered(null)}
                      className={clsx(
                        "h-6 rounded-xs transition-colors cursor-pointer border hairline",
                        getCellColor(avgPct)
                      )}
                      aria-label={`${dayName} ${hour}:00 - ${avgPct != null ? `${avgPct}%` : "No data"}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-muted border-t hairline pt-3">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-raised/40 border hairline" />
                <span>No Data</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-crit/80" />
                <span>&lt;20% (Crit)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-warn/70" />
                <span>20-40% (Warn)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-tide/70" />
                <span>40-70% (Normal)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-xs bg-ok/75" />
                <span>70-100% (High)</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

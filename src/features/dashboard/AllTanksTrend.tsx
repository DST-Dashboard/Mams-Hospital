"use client";

import React, { useState } from "react";
import { MultiTankChart } from "@/components/charts/MultiTankChart";
import { useCompare } from "@/lib/hooks";

export function AllTanksTrend() {
  const [res, setRes] = useState<"15m" | "1h" | "1d">("1h");
  const { data: compare, error, isLoading } = useCompare({ res });

  return (
    <div className="rounded-xl border hairline bg-surface p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b hairline pb-3">
        <div>
          <h3 className="text-base font-semibold text-ink">All Tanks Water Level Trends</h3>
          <p className="text-xs text-muted">
            Simultaneous multi-tank comparative water level % across hospital overhead storage
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-md border hairline p-0.5 bg-raised/30">
          {(["15m", "1h", "1d"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRes(r)}
              className={`rounded px-2.5 py-1 text-xs font-semibold transition-colors ${
                res === r ? "bg-raised text-tide shadow-xs font-bold" : "text-muted hover:text-ink"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-72 items-center justify-center text-xs text-muted">
          Loading comparative trend telemetry...
        </div>
      ) : error ? (
        <div role="alert" className="p-4 text-xs text-crit">
          Failed to load trend: {error.message}
        </div>
      ) : compare ? (
        <MultiTankChart compare={compare} height={320} />
      ) : null}
    </div>
  );
}

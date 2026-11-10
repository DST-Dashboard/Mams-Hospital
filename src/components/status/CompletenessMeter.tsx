"use client";

import clsx from "clsx";
import React from "react";

export function CompletenessMeter({
  pct,
  validCount,
  totalCount,
  className,
}: {
  pct: number | null | undefined;
  validCount?: number;
  totalCount?: number;
  className?: string;
}) {
  if (pct == null) {
    return <span className="text-xs text-muted">—</span>;
  }

  const rounded = Math.round(pct);
  const color = rounded >= 95 ? "bg-ok" : rounded >= 80 ? "bg-warn" : "bg-crit";
  const textColor = rounded >= 95 ? "text-ok" : rounded >= 80 ? "text-warn" : "text-crit";

  return (
    <div className={clsx("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">Completeness:</span>
        <span className={clsx("font-mono font-semibold", textColor)}>{rounded}%</span>
      </div>

      <div className="h-1.5 w-full rounded-full bg-raised overflow-hidden">
        <div style={{ width: `${Math.min(100, Math.max(0, rounded))}%` }} className={clsx("h-full", color)} />
      </div>

      {validCount != null && totalCount != null ? (
        <div className="text-[11px] text-muted text-right font-mono">
          {validCount} / {totalCount} readings
        </div>
      ) : null}
    </div>
  );
}

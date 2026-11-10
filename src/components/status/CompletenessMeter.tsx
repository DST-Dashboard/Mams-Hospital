"use client";

import React from "react";
import clsx from "clsx";

export interface CompletenessMeterProps {
  pct: number | null;
  showText?: boolean;
  className?: string;
}

export function CompletenessMeter({ pct, showText = true, className }: CompletenessMeterProps) {
  if (pct == null || Number.isNaN(pct)) {
    return (
      <div className={clsx("flex items-center gap-2", className)}>
        <div className="w-16 h-2 rounded-[4px] bg-[var(--bd-soft)]" />
        {showText && <span className="text-[11px] text-[var(--tx-muted)]">—</span>}
      </div>
    );
  }

  const val = Math.max(0, Math.min(100, Math.round(pct * 10) / 10));
  const isOk = val >= 95;
  const isWarn = val >= 80 && val < 95;

  const barColor = isOk
    ? "bg-[var(--ok-tx)]"
    : isWarn
    ? "bg-[var(--warn-tx)]"
    : "bg-[var(--err-tx)]";

  const textColor = isOk
    ? "text-[var(--ok-tx)]"
    : isWarn
    ? "text-[var(--warn-tx)]"
    : "text-[var(--err-tx)]";

  return (
    <div
      className={clsx("flex items-center gap-2", className)}
      title={`Completeness: ${val}%`}
      aria-label={`Completeness: ${val}%`}
    >
      <div className="w-16 h-2 rounded-[4px] bg-[var(--bd-soft)] overflow-hidden">
        <div
          className={clsx("h-full transition-all duration-300", barColor)}
          style={{ width: `${val}%` }}
        />
      </div>
      {showText && (
        <span className={clsx("text-[11px] font-semibold num", textColor)}>
          {val}%
        </span>
      )}
    </div>
  );
}

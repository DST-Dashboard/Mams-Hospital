"use client";

import React from "react";
import clsx from "clsx";
import { BatteryWarning } from "lucide-react";

export interface BatteryIconProps {
  pct: number | null;
  className?: string;
  showText?: boolean;
}

export function BatteryIcon({ pct, className, showText = false }: BatteryIconProps) {
  if (pct == null || Number.isNaN(pct)) {
    return (
      <span className={clsx("inline-flex items-center gap-1 text-[var(--tx-muted)] text-[12px]", className)}>
        <BatteryWarning size={16} aria-hidden />
        {showText && <span>—</span>}
      </span>
    );
  }

  const clamped = Math.max(0, Math.min(100, Math.round(pct)));
  const isLow = clamped < 20;
  const isMed = clamped >= 20 && clamped < 50;

  const colorClass = isLow
    ? "text-[var(--err-tx)]"
    : isMed
    ? "text-[var(--warn-tx)]"
    : "text-[var(--ok-tx)]";

  return (
    <span
      className={clsx("inline-flex items-center gap-1.5", colorClass, className)}
      title={`Battery: ${clamped}%`}
      aria-label={`Battery: ${clamped}%`}
    >
      <svg
        width="22"
        height="12"
        viewBox="0 0 22 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        aria-hidden
      >
        <rect
          x="0.5"
          y="0.5"
          width="18"
          height="11"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1"
        />
        <path d="M20 4V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <rect
          x="2"
          y="2"
          width={Math.max(1, (15 * clamped) / 100)}
          height="8"
          rx="1"
          fill="currentColor"
        />
      </svg>
      {showText && <span className="text-[12px] font-medium num">{clamped}%</span>}
    </span>
  );
}

"use client";

import clsx from "clsx";
import { Battery, BatteryCharging, BatteryLow, BatteryMedium, BatteryWarning } from "lucide-react";
import React from "react";

export function BatteryIcon({
  pct,
  showLabel = true,
  className,
}: {
  pct: number | null | undefined;
  showLabel?: boolean;
  className?: string;
}) {
  if (pct == null) {
    return (
      <span className={clsx("inline-flex items-center gap-1 text-xs text-muted", className)}>
        <Battery size={14} className="opacity-40" />
        {showLabel && <span>—</span>}
      </span>
    );
  }

  const isLow = pct < 20;
  const isWarn = pct >= 20 && pct < 50;

  const Icon = isLow ? BatteryLow : isWarn ? BatteryMedium : Battery;
  const color = isLow ? "text-crit" : isWarn ? "text-warn" : "text-ok";

  return (
    <span
      className={clsx("inline-flex items-center gap-1 text-xs font-mono font-medium", color, className)}
      title={`Battery: ${Math.round(pct)}%`}
    >
      <Icon size={15} aria-hidden="true" />
      {showLabel && <span>{Math.round(pct)}%</span>}
    </span>
  );
}

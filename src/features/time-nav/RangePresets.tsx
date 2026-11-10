"use client";

import clsx from "clsx";
import React from "react";
import type { RangeKey } from "@/lib/store";

export interface RangePresetsProps {
  value: RangeKey | string;
  onChange: (range: RangeKey) => void;
  options?: RangeKey[];
  className?: string;
  size?: "sm" | "md";
}

const DEFAULT_RANGES: RangeKey[] = ["6h", "24h", "7d"];

export function RangePresets({
  value,
  onChange,
  options = DEFAULT_RANGES,
  className,
  size = "md",
}: RangePresetsProps) {
  return (
    <div
      role="group"
      aria-label="Select telemetry time range"
      className={clsx(
        "inline-flex items-center rounded-md border hairline p-0.5 bg-surface shadow-xs",
        className
      )}
    >
      {options.map((r) => {
        const isSelected = value === r;
        return (
          <button
            key={r}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onChange(r)}
            className={clsx(
              "rounded font-mono font-medium transition-colors select-none",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-xs sm:text-sm",
              isSelected
                ? "bg-tide text-bg font-bold shadow-xs"
                : "text-muted hover:text-ink hover:bg-raised/60"
            )}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}

import React from "react";
import clsx from "clsx";

export interface SparklinePoint {
  t: number;
  pct: number | null;
}

export interface SparklineProps {
  points?: SparklinePoint[];
  color?: string;
  height?: number;
  className?: string;
  label?: string;
}

/**
 * Lightweight SVG sparkline for tank cards, tiles, and kiosk mode.
 * Draws continuous segments and respects null data gaps.
 */
export function Sparkline({
  points = [],
  color = "var(--data-600)",
  height = 28,
  className,
  label = "24-hour fill trend sparkline",
}: SparklineProps) {
  const valid = points.filter((p) => p.pct !== null && !Number.isNaN(p.pct));

  if (!points || points.length === 0 || valid.length < 2) {
    return (
      <div
        className={clsx("flex items-center justify-center text-[11px] text-[var(--tx-quiet)]", className)}
        style={{ height }}
        aria-hidden
      >
        —
      </div>
    );
  }

  const t0 = points[0]!.t;
  const tEnd = points[points.length - 1]!.t;
  const timeSpan = tEnd - t0 || 1;

  // Build SVG path commands, creating new M (move) segments across null gaps
  let d = "";
  let inSegment = false;

  for (let i = 0; i < points.length; i++) {
    const pt = points[i]!;
    if (pt.pct === null || Number.isNaN(pt.pct)) {
      inSegment = false;
      continue;
    }

    const x = (((pt.t - t0) / timeSpan) * 100).toFixed(1);
    // Y maps 0% to bottom (height - 2) and 100% to top (2)
    const y = ((1 - Math.max(0, Math.min(100, pt.pct)) / 100) * (height - 4) + 2).toFixed(1);

    if (!inSegment) {
      d += ` M ${x} ${y}`;
      inSegment = true;
    } else {
      d += ` L ${x} ${y}`;
    }
  }

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className={clsx("w-full select-none overflow-visible", className)}
      style={{ height }}
      role="img"
      aria-label={label}
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

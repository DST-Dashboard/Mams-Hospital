"use client";

import clsx from "clsx";
import React from "react";

export interface SparkPoint {
  t: number;
  pct: number | null;
}

export interface SparklineProps {
  points: SparkPoint[];
  height?: number;
  color?: string;
  fill?: boolean;
  className?: string;
  label?: string;
}

export function Sparkline({
  points,
  height = 32,
  color = "rgb(var(--tide))",
  fill = false,
  className,
  label = "Water level trend",
}: SparklineProps) {
  const valid = points.filter((p) => p.pct != null);

  if (valid.length < 2) {
    return <div style={{ height }} className={clsx("w-full opacity-40", className)} aria-hidden />;
  }

  const t0 = valid[0]!.t;
  const span = valid.at(-1)!.t - t0 || 1;

  // Map points to SVG coordinates (0..100 x 0..30)
  const coords = valid.map((p) => {
    const x = Number((((p.t - t0) / span) * 100).toFixed(1));
    const y = Number((30 - ((p.pct as number) / 100) * 28).toFixed(1));
    return { x, y };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L100 30 L0 30 Z`;

  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      style={{ height }}
      className={clsx("w-full overflow-visible", className)}
      role="img"
      aria-label={label}
    >
      {fill ? (
        <path d={areaPath} fill={color} fillOpacity="0.12" vectorEffect="non-scaling-stroke" />
      ) : null}
      <path
        d={linePath}
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

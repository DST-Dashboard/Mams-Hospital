"use client";

import React from "react";
import { TrendChart, type TrendSeries, type FillDrainEvent, type AlertMarker } from "./TrendChart";
import type { Win } from "@/lib/windows";

export interface MultiTankChartProps {
  title?: string;
  eyebrow?: string;
  explainer?: string;
  footnote?: string;
  series: TrendSeries[];
  win: Win;
  events?: FillDrainEvent[];
  alerts?: AlertMarker[];
  height?: number;
  enableBrush?: boolean;
  onBrushEnd?: (range: { from: number; to: number }) => void;
  isMock?: boolean;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

/**
 * MultiTankChart renders multiple tank time-series overlaid on a single plot.
 * Used for the Overview "LAST 24 HOURS" (Day panel) and "LAST 7 DAYS" (Week panel).
 */
export function MultiTankChart({
  title = "All tanks water level",
  eyebrow = "OVERVIEW TREND",
  explainer,
  footnote,
  series,
  win,
  events,
  alerts,
  height = 400,
  enableBrush = false,
  onBrushEnd,
  isMock = false,
  isLoading = false,
  error = null,
  onRetry,
  className,
}: MultiTankChartProps) {
  // Use standard hospital-wide default thresholds (40 / 20 / 5) for multi-tank overlays
  const defaultThresholds = {
    warnPct: 40,
    critPct: 20,
    emptyPct: 5,
  };

  return (
    <TrendChart
      title={title}
      eyebrow={eyebrow}
      explainer={explainer}
      footnote={footnote}
      series={series}
      win={win}
      thresholds={defaultThresholds}
      events={events}
      alerts={alerts}
      height={height}
      enableBrush={enableBrush}
      onBrushEnd={onBrushEnd}
      isMock={isMock}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      className={className}
    />
  );
}

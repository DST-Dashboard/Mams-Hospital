"use client";

import React from "react";
import { MultiTankChart } from "@/components/charts/MultiTankChart";
import type { TrendSeries, FillDrainEvent, AlertMarker } from "@/components/charts/TrendChart";
import type { Win } from "@/lib/windows";

export interface AllTanksTrendProps {
  mode: "day" | "week";
  series: TrendSeries[];
  win: Win;
  events?: FillDrainEvent[];
  alerts?: AlertMarker[];
  enableBrush?: boolean;
  onBrushEnd?: (range: { from: number; to: number }) => void;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function AllTanksTrend({
  mode,
  series,
  win,
  events,
  alerts,
  enableBrush = false,
  onBrushEnd,
  isLoading = false,
  error = null,
  onRetry,
  className,
}: AllTanksTrendProps) {
  const isDay = mode === "day";
  const title = isDay ? "Last 24 hours · All tanks" : "Last 7 days · All tanks";
  const eyebrow = isDay ? "DAY TREND (5-MIN CADENCE)" : "WEEK TREND (1-HOUR AVERAGES)";
  const explainer = isDay
    ? "High-cadence time-series showing water level percentage across all 5 rooftop tanks. The horizontal time axis spans the full 24-hour cycle."
    : "Hourly aggregated trend for the entire 7-day monitoring window. Click and drag across any period to zoom the day panel above.";

  return (
    <MultiTankChart
      title={title}
      eyebrow={eyebrow}
      explainer={explainer}
      footnote="Multi-tank hospital overview. Alert threshold dotted lines indicate standard hospital warning (40%), critical (20%), and emergency (5%) levels."
      series={series}
      win={win}
      events={events}
      alerts={alerts}
      height={380}
      enableBrush={enableBrush}
      onBrushEnd={onBrushEnd}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      className={className}
    />
  );
}

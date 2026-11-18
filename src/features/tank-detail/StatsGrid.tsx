"use client";

import React from "react";
import { Activity, ArrowDown, ArrowUp, BarChart2, Droplet, AlertTriangle } from "lucide-react";
import type { AnalyticsResponse } from "@/lib/types";
import { fmtLitres } from "@/lib/format";
import { isUnstable } from "@/lib/series";

export interface StatsGridProps {
  dayAnalytics?: AnalyticsResponse | null;
  weekAnalytics?: AnalyticsResponse | null;
  className?: string;
}

export function StatsGrid({ dayAnalytics, weekAnalytics, className }: StatsGridProps) {
  const isFlapping = isUnstable(weekAnalytics?.events) || isUnstable(dayAnalytics?.events);

  const dayStats = dayAnalytics?.levelPct;
  const weekStats = weekAnalytics?.levelPct;

  const dayMean = dayStats?.mean != null ? `${dayStats.mean.toFixed(1)}%` : "—";
  const weekMean = weekStats?.mean != null ? `${weekStats.mean.toFixed(1)}%` : "—";

  const dayMin = dayStats?.min != null ? `${dayStats.min.toFixed(1)}%` : "—";
  const weekMin = weekStats?.min != null ? `${weekStats.min.toFixed(1)}%` : "—";

  const dayMax = dayStats?.max != null ? `${dayStats.max.toFixed(1)}%` : "—";
  const weekMax = weekStats?.max != null ? `${weekStats.max.toFixed(1)}%` : "—";

  const dayStd = dayStats?.std != null ? `±${dayStats.std.toFixed(1)}%` : "—";
  const weekStd = weekStats?.std != null ? `±${weekStats.std.toFixed(1)}%` : "—";

  // Suppress litres if signal is flapping (Override O4-4)
  const dayConsumed = isFlapping
    ? "—"
    : dayAnalytics?.consumedL != null
    ? fmtLitres(dayAnalytics.consumedL)
    : "—";

  const weekConsumed = isFlapping
    ? "—"
    : weekAnalytics?.consumedL != null
    ? fmtLitres(weekAnalytics.consumedL)
    : "—";

  const dayInflow = isFlapping
    ? "—"
    : dayAnalytics?.pumpedInL != null
    ? fmtLitres(dayAnalytics.pumpedInL)
    : "—";

  const weekInflow = isFlapping
    ? "—"
    : weekAnalytics?.pumpedInL != null
    ? fmtLitres(weekAnalytics.pumpedInL)
    : "—";

  const statsList = [
    {
      label: "Mean fill",
      icon: Activity,
      dayVal: dayMean,
      weekVal: weekMean,
      desc: "Average water level over the monitoring window",
    },
    {
      label: "Lowest trough",
      icon: ArrowDown,
      dayVal: dayMin,
      weekVal: weekMin,
      desc: "Minimum recorded fill percentage",
    },
    {
      label: "Peak level",
      icon: ArrowUp,
      dayVal: dayMax,
      weekVal: weekMax,
      desc: "Maximum recorded fill percentage",
    },
    {
      label: "Total consumption",
      icon: Droplet,
      dayVal: dayConsumed,
      weekVal: weekConsumed,
      desc: isFlapping
        ? "Suppressed: flapping signal prevents reliable consumption math"
        : "Estimated liquid drained by hospital demand",
      warn: isFlapping,
    },
    {
      label: "Pumped inflow",
      icon: Droplet,
      dayVal: dayInflow,
      weekVal: weekInflow,
      desc: isFlapping
        ? "Suppressed: flapping signal prevents reliable pump math"
        : "Total volume introduced via pump fill cycles",
      warn: isFlapping,
    },
    {
      label: "Variability (σ)",
      icon: BarChart2,
      dayVal: dayStd,
      weekVal: weekStd,
      desc: "Standard deviation of water level percentage",
    },
  ];

  return (
    <div className={className}>
      <div className="flex flex-col gap-3">
        {isFlapping && (
          <div className="banner banner--warning text-[12px] flex items-center gap-2">
            <AlertTriangle size={15} aria-hidden />
            <span>
              <strong>Unstable signal (&gt;40 events):</strong> Ultrasonic reflection noise is
              causing alternating distance readings. Litres figures are suppressed to maintain data
              honesty.
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {statsList.map((stat, i) => (
            <div
              key={i}
              className="card p-3.5 bg-[var(--bg-card)] border border-[var(--bd)] rounded-xl flex flex-col justify-between"
            >
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--tx-quiet)] uppercase tracking-wider">
                <stat.icon size={12} className="text-[var(--brand-600)]" />
                <span className="truncate">{stat.label}</span>
              </div>

              <div className="my-2">
                <div className="text-[17px] font-black text-[var(--tx-head)] font-mono">
                  {stat.dayVal}
                </div>
                <div className="text-[11.5px] font-semibold text-[var(--tx-quiet)] font-mono mt-0.5">
                  7-Day: {stat.weekVal}
                </div>
              </div>

              <div className="text-[10px] text-[var(--tx-quiet)] line-clamp-2 leading-tight">
                {stat.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


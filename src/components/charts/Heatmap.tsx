"use client";

import React, { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { Download, Grid } from "lucide-react";
import { EChart } from "./EChart";
import { baseOption, scales, cssVar } from "./chart-theme";
import { Button } from "@/components/ui/Button";
import { SampleDataBadge } from "@/components/status/badges";
import { Skeleton, ErrorState } from "@/components/ui/primitives";
import { downloadCsv } from "@/lib/csv";
import type { HeatmapGrid } from "@/lib/heatmap";

export interface HeatmapProps {
  title?: string;
  eyebrow?: string;
  explainer?: string;
  footnote?: string;
  grid: HeatmapGrid;
  activeDayKey?: string;
  onSelectCell?: (dayKey: string, hour: number) => void;
  isMock?: boolean;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function Heatmap({
  title = "Week water level heatmap",
  eyebrow = "HOURLY PATTERNS",
  explainer = "Average fill percentage for each hour across the 7-day monitoring window. Blank cells denote periods without sensor uplinks.",
  footnote = "Blank cells = no data (sensor offline or packet gap), never 0%. Click any cell to inspect that specific hour in the 24-hour panel.",
  grid,
  activeDayKey,
  onSelectCell,
  isMock = false,
  isLoading = false,
  error = null,
  onRetry,
  className,
}: HeatmapProps) {
  const handleExportCsv = () => {
    const rows = grid.cells.map((c) => ({
      date: c.dayKey,
      dayLabel: c.dayLabel,
      hour: c.hour,
      hourFormatted: `${String(c.hour).padStart(2, "0")}:00 - ${String((c.hour + 1) % 24).padStart(2, "0")}:00`,
      avgLevelPct: c.pct !== null ? c.pct.toFixed(1) : "",
      readingCount: c.count,
    }));
    downloadCsv(`week-heatmap-${Date.now()}`, rows, [
      "date",
      "dayLabel",
      "hour",
      "hourFormatted",
      "avgLevelPct",
      "readingCount",
    ]);
  };

  const option: EChartsCoreOption = useMemo(() => {
    const opt = baseOption(title);
    const dayNames = grid.days.map((d) => (d.key === activeDayKey ? `{bold|${d.label}}` : d.label));
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

    opt.grid = {
      left: 110,
      right: 30,
      top: 50,
      bottom: 50,
      containLabel: true,
    };

    opt.xAxis = {
      type: "category",
      data: hours,
      splitArea: { show: true },
      axisLabel: {
        fontSize: 10,
        interval: 1, // Show every other hour on smaller displays
        color: cssVar("--tx-chart", "#294654"),
      },
      axisLine: { lineStyle: { color: cssVar("--bd-strong", "#cbd5e0") } },
    };

    opt.yAxis = {
      type: "category",
      data: dayNames,
      splitArea: { show: true },
      axisLabel: {
        fontSize: 11,
        color: cssVar("--tx-chart", "#294654"),
        rich: {
          bold: {
            fontWeight: 800,
            color: cssVar("--brand-800", "#003b6d"),
          },
        },
      },
      axisLine: { lineStyle: { color: cssVar("--bd-strong", "#cbd5e0") } },
    };

    opt.visualMap = {
      min: 0,
      max: 100,
      calculable: true,
      orient: "horizontal",
      left: "center",
      bottom: 6,
      itemWidth: 14,
      itemHeight: 140,
      inRange: {
        color: scales.thermal,
      },
      text: ["100 %", "0 %"],
      textStyle: {
        fontSize: 10,
        color: cssVar("--tx-quiet", "#627985"),
      },
    };

    // Transform cells to [x, y, value]
    // x = hour (0..23), y = dayIndex
    const cellData = grid.cells.map((c) => [
      c.hour,
      c.dayIndex,
      c.pct !== null ? c.pct : "-",
    ]);

    opt.tooltip = {
      trigger: "item",
      formatter: (p: unknown) => {
        const item = p as { value?: [number, number, unknown] };
        if (!item?.value) return "";
        const [hour, dayIdx, val] = item.value;
        const day = grid.days[dayIdx];
        if (!day) return "";
        const nextHour = (hour + 1) % 24;
        const timeSpan = `${String(hour).padStart(2, "0")}:00–${String(nextHour).padStart(2, "0")}:00`;

        if (val === "-" || val === null || val === undefined) {
          return `
            <div style="font-size:12px;">
              <strong>${day.label}</strong><br/>
              <span style="color:var(--tx-quiet);">${timeSpan}</span><br/>
              <span style="color:var(--tx-soft); font-style:italic;">No sensor readings (gap)</span>
            </div>
          `;
        }

        return `
          <div style="font-size:12px;">
            <strong style="color:var(--tx-head);">${day.label}</strong><br/>
            <span style="color:var(--tx-quiet); font-size:11px;">${timeSpan}</span>
            <div style="margin-top:4px; font-weight:bold; color:var(--brand-800);">
              Fill: ${Number(val).toFixed(1)} %
            </div>
          </div>
        `;
      },
    };

    opt.series = [
      {
        name: "Fill %",
        type: "heatmap",
        data: cellData,
        label: {
          show: false,
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 8,
            shadowColor: "rgba(0, 0, 0, 0.4)",
          },
        },
      },
    ];

    return opt;
  }, [title, grid, activeDayKey]);

  const handleEvents = useMemo<Record<string, (params: unknown) => void> | undefined>(() => {
    if (!onSelectCell) return undefined;
    return {
      click: (p: unknown) => {
        const item = p as { componentType?: string; value?: [number, number] };
        if (item?.componentType === "series" && item.value) {
          const [hour, dayIdx] = item.value;
          const day = grid.days[dayIdx];
          if (day) {
            onSelectCell(day.key, hour);
          }
        }
      },
    };
  }, [grid, onSelectCell]);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="w-56 h-6" />
            <Skeleton className="w-20 h-8 rounded-lg" />
          </div>
          <Skeleton className="w-full h-[320px] rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="card p-6">
          <ErrorState
            title="Failed to load heatmap"
            message={error.message || "An error occurred while aggregating week heatmap data."}
            onRetry={onRetry}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="card p-6 flex flex-col gap-3">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {eyebrow && (
              <div className="eyebrow flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent-500)] uppercase tracking-wider">
                <Grid size={13} aria-hidden />
                <span>{eyebrow}</span>
              </div>
            )}
            <h2 className="card-title text-[20px] font-bold text-[var(--tx-head)] font-['Merriweather',serif]">
              {title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {isMock && <SampleDataBadge />}

            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleExportCsv}
              aria-label="Download week heatmap as CSV"
            >
              CSV
            </Button>
          </div>
        </div>

        {/* Explainer */}
        {explainer && (
          <div className="explainer text-[13px] text-[var(--tx-body)] bg-[var(--bg-explain)] border-l-4 border-[var(--bd-explain)] p-3 rounded">
            {explainer}
          </div>
        )}

        {/* Heatmap Chart */}
        <div className="plot relative rounded-lg border border-[var(--bd-soft)] bg-[var(--bg-card)] overflow-hidden">
          <EChart
            option={option}
            height={320}
            label={title}
            onEvents={handleEvents}
          />
        </div>

        {/* Footnote */}
        {footnote && (
          <p className="card-foot text-[11.5px] text-[var(--tx-quiet)] border-t border-[var(--bd-soft)] pt-2 mt-1">
            {footnote}
          </p>
        )}
      </div>
    </div>
  );
}

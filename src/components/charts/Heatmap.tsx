"use client";

import React, { useMemo, useState, useEffect } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { Download, Grid } from "lucide-react";
import { EChart } from "./EChart";
import { baseOption, cssVar } from "./chart-theme";
import { Button } from "@/components/ui/Button";
import { SampleDataBadge } from "@/components/status/badges";
import { Skeleton, ErrorState } from "@/components/ui/primitives";
import { downloadCsv } from "@/lib/csv";
import type { HeatmapGrid } from "@/lib/heatmap";

// Authoritative hospital threshold constants
export const THRESHOLDS = {
  emergency: 5,
  critical: 20,
  warning: 40,
} as const;

/**
 * Single source of truth for fill level colour mapping.
 * Below warning threshold: FILLED warm alert colours (no selective borders):
 * - 0 - 5%: Deep red (#7A1F14 -> #B42318)
 * - 5 - 20%: Critical (#B42318 -> #E4572E)
 * - 20 - <40%: Warning amber (#E4572E -> #F2B13C)
 * At and above 40%: Clean sequential blue ramp with wide dynamic range:
 * - 40%: #D6E6F5 -> 55%: #A9CBE8 -> 70%: #6FA6D6 -> 85%: #2F6FAE -> 100%: #0F2F5C
 */
function interpolateHex(c1: string, c2: string, t: number): string {
  const clampedT = Math.max(0, Math.min(1, t));
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);

  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * clampedT);
  const g = Math.round(g1 + (g2 - g1) * clampedT);
  const b = Math.round(b1 + (b2 - b1) * clampedT);

  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export function fillColor(v: number): string {
  const val = Math.max(0, Math.min(100, v));

  // Emergency zone: 0 - 5% (#7A1F14 to #B42318)
  if (val <= THRESHOLDS.emergency) {
    return interpolateHex("#7A1F14", "#B42318", val / THRESHOLDS.emergency);
  }
  // Critical zone: 5 - 20% (#B42318 to #E4572E)
  if (val <= THRESHOLDS.critical) {
    return interpolateHex("#B42318", "#E4572E", (val - THRESHOLDS.emergency) / (THRESHOLDS.critical - THRESHOLDS.emergency));
  }
  // Warning zone: 20 - <40% (#E4572E to #F2B13C amber)
  if (val < THRESHOLDS.warning) {
    return interpolateHex("#E4572E", "#F2B13C", (val - THRESHOLDS.critical) / (THRESHOLDS.warning - THRESHOLDS.critical));
  }
  // Crisp color break at 40%: Wide dynamic range sequential blue ramp
  // 40% - 55% (#D6E6F5 to #A9CBE8)
  if (val <= 55) {
    return interpolateHex("#D6E6F5", "#A9CBE8", (val - 40) / 15);
  }
  // 55% - 70% (#A9CBE8 to #6FA6D6)
  if (val <= 70) {
    return interpolateHex("#A9CBE8", "#6FA6D6", (val - 55) / 15);
  }
  // 70% - 85% (#6FA6D6 to #2F6FAE)
  if (val <= 85) {
    return interpolateHex("#6FA6D6", "#2F6FAE", (val - 70) / 15);
  }
  // 85% - 100% (#2F6FAE to #0F2F5C)
  return interpolateHex("#2F6FAE", "#0F2F5C", (val - 85) / 15);
}

// 101 sample stops (0% to 100%) for exact 1:1 color matching between cells and visualMap
export const FILL_STOPS: string[] = Array.from({ length: 101 }, (_, i) => fillColor(i));

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
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const checkWidth = () => {
      setIsNarrow(window.innerWidth < 640);
    };
    checkWidth();
    window.addEventListener("resize", checkWidth);
    return () => window.removeEventListener("resize", checkWidth);
  }, []);

  const handleExportCsv = () => {
    const rows = grid.cells.map((c) => ({
      date: c.dayKey,
      dayLabel: c.dayLabel,
      hour: c.hour,
      hourFormatted: `${String(c.hour).padStart(2, "0")}:00 - ${String((c.hour + 1) % 24).padStart(2, "0")}:00`,
      avgLevelPct: c.pct !== null ? c.pct.toFixed(1) : "",
      readingCount: c.count,
    }));
    downloadCsv(`mams-week-heatmap-${Date.now()}`, rows, [
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
    opt.title = { show: false };
    opt.legend = { show: false };

    // Y-axis day names: newest at top (ECharts category y-axis places index 0 at bottom, index N at top)
    const dayNames = grid.days.map((d) => {
      const isCurrentActive = d.key === activeDayKey;
      const labelBase = d.label.replace(" (partial)", "");
      const prefix = isCurrentActive ? `{bold|${labelBase}}` : `{day|${labelBase}}`;
      return d.partial ? `${prefix} {partial|(partial)}` : prefix;
    });

    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

    // Clean grid margins: right margin accommodates slim colour bar
    opt.grid = {
      left: isNarrow ? 76 : 100,
      right: isNarrow ? 20 : 76,
      top: 36,
      bottom: isNarrow ? 60 : 36,
      containLabel: true,
    };

    // Dedicated header row for toolbox icons at top right (never overlapping the color bar or plot)
    opt.toolbox = {
      top: 4,
      right: 14,
      feature: {
        saveAsImage: {
          name: "mams-week-heatmap",
          title: "Save as PNG",
          pixelRatio: 2,
        },
      },
    };

    opt.xAxis = {
      type: "category",
      data: hours,
      splitArea: { show: false },
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: {
        show: true,
        alignWithLabel: true,
        lineStyle: { color: cssVar("--bd", "#cbd5e1") },
      },
      axisLabel: {
        fontSize: 10,
        interval: isNarrow ? 3 : 1, // Every 4h on mobile ("00:00", "04:00", ...), every 2h on desktop
        color: cssVar("--tx-quiet", "#64748b"),
        fontFamily: "Inter, sans-serif",
      },
    };

    opt.yAxis = {
      type: "category",
      data: dayNames,
      splitArea: { show: false },
      splitLine: { show: false },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        fontSize: 11,
        align: "right",
        margin: 10,
        rich: {
          day: {
            fontSize: 11,
            color: cssVar("--tx-main", "#475569"),
            fontWeight: 500,
            fontFamily: "Inter, sans-serif",
          },
          bold: {
            fontSize: 11,
            fontWeight: 800,
            color: cssVar("--brand-900", "#002b4d"),
            fontFamily: "Inter, sans-serif",
          },
          partial: {
            fontSize: 9.5,
            color: cssVar("--tx-quiet", "#94a3b8"),
            fontStyle: "italic",
            fontFamily: "Inter, sans-serif",
          },
        },
      },
    };

    // Continuous visualMap using FILL_STOPS (101 colors)
    opt.visualMap = {
      type: "continuous",
      min: 0,
      max: 100,
      calculable: false,
      orient: isNarrow ? "horizontal" : "vertical",
      ...(isNarrow
        ? {
            left: "center",
            bottom: 6,
            itemWidth: 10,
            itemHeight: 140,
          }
        : {
            right: 18,
            top: 36,
            bottom: 40,
            itemWidth: 11,
          }),
      inRange: {
        color: FILL_STOPS,
      },
      text: ["100%", "0%"],
      textStyle: {
        fontSize: 9.5,
        color: cssVar("--tx-quiet", "#64748b"),
        fontFamily: "Inter, sans-serif",
      },
    };

    // Uniform cell gap: every cell has the EXACT SAME 1px gap matching card background.
    // Zero per-cell conditional borders anywhere.
    const cellData = grid.cells.map((c) => {
      const isNull = c.pct === null || c.pct === undefined;

      if (isNull) {
        return {
          value: [c.hour, c.dayIndex, "-"],
          itemStyle: {
            color: "#EEF1F5",
            borderColor: cssVar("--bg-card", "#ffffff"),
            borderWidth: 1,
            borderRadius: 2,
            decal: {
              symbol: "rect",
              dashArrayX: [1, 0],
              dashArrayY: [2, 5],
              rotation: 0.785,
              color: "rgba(148, 163, 184, 0.45)",
            },
          },
        };
      }

      const val = c.pct as number;
      return {
        value: [c.hour, c.dayIndex, val],
        itemStyle: {
          color: fillColor(val),
          borderColor: cssVar("--bg-card", "#ffffff"),
          borderWidth: 1,
          borderRadius: 2,
        },
      };
    });

    opt.tooltip = {
      trigger: "item",
      backgroundColor: "var(--bg-card, #ffffff)",
      borderColor: "var(--bd, #cbd5e1)",
      borderWidth: 1,
      padding: [8, 12],
      textStyle: {
        color: "var(--tx-main, #1e293b)",
        fontFamily: "Inter, sans-serif",
      },
      extraCssText: "box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12); border-radius: 8px;",
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
            <div style="font-size:12px; font-family:Inter, sans-serif; line-height:1.4;">
              <div style="font-weight:700; color:var(--tx-head, #001f3f);">${day.label} · ${timeSpan}</div>
              <div style="margin-top:6px; display:inline-flex; align-items:center; gap:5px; font-size:11px; padding:2px 8px; border-radius:9999px; background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1;">
                <span>No sensor data</span>
              </div>
            </div>
          `;
        }

        const numVal = Number(val);
        let chipBg = "var(--ok-bg, #ecfdf5)";
        let chipTx = "var(--ok-tx, #065f46)";
        let chipBd = "var(--ok-bd, #a7f3d0)";
        let chipText = "Normal";

        if (numVal <= THRESHOLDS.emergency) {
          chipBg = "#fef2f2";
          chipTx = "#7A1F14";
          chipBd = "#B42318";
          chipText = "Emergency (≤ 5%)";
        } else if (numVal <= THRESHOLDS.critical) {
          chipBg = "#fff1f2";
          chipTx = "#9f1239";
          chipBd = "#E4572E";
          chipText = "Critical (≤ 20%)";
        } else if (numVal < THRESHOLDS.warning) {
          chipBg = "#fffbeb";
          chipTx = "#92400e";
          chipBd = "#F2B13C";
          chipText = "Warning (< 40%)";
        }

        return `
          <div style="font-size:12px; font-family:Inter, sans-serif; line-height:1.4;">
            <div style="font-weight:700; color:var(--tx-head, #001f3f);">${day.label} · ${timeSpan}</div>
            <div style="margin-top:4px; font-size:13px; font-weight:700; color:var(--brand-900, #002b4d);">
              Average fill: ${numVal.toFixed(1)}%
            </div>
            <div style="margin-top:6px;">
              <span style="display:inline-flex; align-items:center; font-size:11px; font-weight:600; padding:2px 8px; border-radius:9999px; background:${chipBg}; color:${chipTx}; border:1px solid ${chipBd};">
                ${chipText}
              </span>
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
        itemStyle: {
          borderRadius: 2,
        },
        emphasis: {
          itemStyle: {
            borderColor: "#0F2F5C",
            borderWidth: 1.5,
            shadowBlur: 0,
          },
        },
      },
    ];

    return opt;
  }, [title, grid, activeDayKey, isNarrow]);

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
          <Skeleton className="w-full h-[280px] rounded-lg" />
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

        {/* Legend strip: Solid threshold chips & No-data indicator with exact zone colors */}
        <div className="flex flex-wrap items-center justify-between text-[12px] text-[var(--tx-main)] px-1 py-0.5">
          <div className="flex items-center flex-wrap gap-4">
            <span className="font-semibold text-[var(--tx-head)]">Thresholds:</span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span
                className="w-3 h-3 rounded-[3px] border border-black/15 shadow-sm inline-block flex-shrink-0"
                style={{ backgroundColor: "#F2B13C" }}
                aria-hidden
              />
              <span>Warning ≤ 40%</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span
                className="w-3 h-3 rounded-[3px] border border-black/15 shadow-sm inline-block flex-shrink-0"
                style={{ backgroundColor: "#E4572E" }}
                aria-hidden
              />
              <span>Critical ≤ 20%</span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <span
                className="w-3 h-3 rounded-[3px] border border-black/15 shadow-sm inline-block flex-shrink-0"
                style={{ backgroundColor: "#B42318" }}
                aria-hidden
              />
              <span>Emergency ≤ 5%</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            <span
              className="w-3 h-3 rounded-[3px] border border-[var(--bd-strong)] shadow-sm inline-block flex-shrink-0"
              style={{
                backgroundColor: "#EEF1F5",
                backgroundImage:
                  "repeating-linear-gradient(45deg, #cbd5e1 0, #cbd5e1 1.5px, transparent 0, transparent 4px)",
              }}
              aria-hidden
            />
            <span>No data</span>
          </div>
        </div>

        {/* Heatmap Chart */}
        <div className="plot relative rounded-lg border border-[var(--bd-soft)] bg-[var(--bg-card)] overflow-hidden">
          <EChart
            option={option}
            height={280}
            label={title}
            onEvents={handleEvents}
          />
        </div>

        {/* Footnote */}
        {footnote && (
          <p className="card-foot text-[11.5px] text-[var(--tx-quiet)] border-t border-[var(--bd-soft)] pt-2 mt-0">
            {footnote}
          </p>
        )}
      </div>
    </div>
  );
}

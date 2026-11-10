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

    // Format day labels: newest at top (ECharts category y-axis places index 0 at bottom and index N at top)
    const dayNames = grid.days.map((d) => {
      const isCurrentActive = d.key === activeDayKey;
      const labelBase = d.label.replace(" (partial)", "");
      const prefix = isCurrentActive ? `{bold|${labelBase}}` : `{day|${labelBase}}`;
      return d.partial ? `${prefix} {partial|(partial)}` : prefix;
    });

    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);

    // Reserve clean margins: right margin accommodates slim colour bar
    opt.grid = {
      left: isNarrow ? 80 : 110,
      right: isNarrow ? 24 : 76,
      top: 32,
      bottom: isNarrow ? 64 : 36,
      containLabel: true,
    };

    // Dedicated header row for toolbox icons
    opt.toolbox = {
      top: 6,
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
        fontFamily: "Inter, monospace",
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
        margin: 12,
        rich: {
          day: {
            fontSize: 11,
            color: cssVar("--tx-main", "#475569"),
            fontWeight: 500,
          },
          bold: {
            fontSize: 11,
            fontWeight: 800,
            color: cssVar("--brand-900", "#002b4d"),
          },
          partial: {
            fontSize: 9.5,
            color: cssVar("--tx-quiet", "#94a3b8"),
            fontStyle: "italic",
          },
        },
      },
    };

    // Continuous sequential single-hue brand blue scale: #EEF4FA (0%) -> #12365F (100%)
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
        color: [
          "#EEF4FA", // 0%
          "#C6DBEF", // ~16%
          "#9ECAE1", // ~33%
          "#6BAED6", // ~50%
          "#3182BD", // ~66%
          "#1F5C99", // ~83%
          "#12365F", // 100%
        ],
      },
      text: ["100%", "0%"],
      textStyle: {
        fontSize: 9.5,
        color: cssVar("--tx-quiet", "#64748b"),
        fontFamily: "Inter, monospace",
      },
    };

    // Cell data with subtle threshold borders and uniform hatched no-data styling
    const cellData = grid.cells.map((c) => {
      const isNull = c.pct === null || c.pct === undefined;

      // Subtle threshold borders: Amber for warning, Red-Orange for critical, Burgundy for emergency
      let borderColor = cssVar("--bg-card", "#ffffff");
      let borderWidth = 1;

      if (!isNull && typeof c.pct === "number") {
        const val = c.pct;
        if (val <= 5) {
          borderColor = "#933629"; // Emergency thin border
          borderWidth = 1.5;
        } else if (val <= 20) {
          borderColor = "#c05a3c"; // Critical thin border
          borderWidth = 1.5;
        } else if (val <= 40) {
          borderColor = "#e89228"; // Warning thin border
          borderWidth = 1.5;
        }
      }

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

      return {
        value: [c.hour, c.dayIndex, c.pct],
        itemStyle: {
          borderColor,
          borderWidth,
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

        if (numVal <= 5) {
          chipBg = "var(--emg-bg, #fef2f2)";
          chipTx = "var(--emg-tx, #991b1b)";
          chipBd = "var(--emg-bd, #fecaca)";
          chipText = "Emergency (≤ 5%)";
        } else if (numVal <= 20) {
          chipBg = "var(--err-bg, #fff1f2)";
          chipTx = "var(--err-tx, #9f1239)";
          chipBd = "var(--err-bd, #fecdd3)";
          chipText = "Critical (≤ 20%)";
        } else if (numVal <= 40) {
          chipBg = "var(--warn-bg, #fffbeb)";
          chipTx = "var(--warn-tx, #92400e)";
          chipBd = "var(--warn-bd, #fde68a)";
          chipText = "Warning (≤ 40%)";
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
            borderColor: cssVar("--brand-900", "#002b4d"),
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

        {/* Legend strip: Threshold hints & No-data indicator beside/under chart */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--tx-quiet)] px-1 pt-1">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[var(--tx-main)]">Thresholds:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-[2px] bg-[#dbeafe] border-[1.5px] border-[#e89228]" />
              <span>≤ 40% Warning</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-[2px] bg-[#dbeafe] border-[1.5px] border-[#c05a3c]" />
              <span>≤ 20% Critical</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-[2px] bg-[#dbeafe] border-[1.5px] border-[#933629]" />
              <span>≤ 5% Emergency</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="inline-block w-3 h-3 rounded-[2px] border border-[var(--bd)]"
              style={{
                backgroundColor: "#EEF1F5",
                backgroundImage:
                  "repeating-linear-gradient(45deg, #cbd5e1 0, #cbd5e1 1px, transparent 0, transparent 4px)",
              }}
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

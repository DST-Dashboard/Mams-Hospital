"use client";

import React, { useMemo, useState } from "react";
import clsx from "clsx";
import type { EChartsCoreOption } from "echarts/core";
import { Table, Download, Layers } from "lucide-react";
import { EChart } from "./EChart";
import {
  baseOption,
  thresholdMarkLines,
  fullAxis,
  seriesColor,
  colorIndexOf,
  cssVar,
} from "./chart-theme";
import { Button } from "@/components/ui/Button";
import { SampleDataBadge } from "@/components/status/badges";
import { Skeleton, EmptyState, ErrorState } from "@/components/ui/primitives";
import { fmtCm, fmtFill, fmtLitres, stamp } from "@/lib/format";
import { useUi } from "@/lib/store";
import { downloadCsv, type CsvCell } from "@/lib/csv";
import type { Win } from "@/lib/windows";

export interface TrendSeries {
  tankId: number;
  label: string;
  simulated: boolean;
  points: {
    t: number;
    levelPct: number | null;
    levelCm?: number | null;
    distanceCm?: number | null;
    volumeL?: number | null;
  }[];
}

export interface FillDrainEvent {
  kind: "fill" | "drain";
  startT: number;
  endT: number;
  startLevelCm: number;
  endLevelCm: number;
  deltaCm: number;
}

export interface AlertMarker {
  id: number;
  t: number;
  severity: "info" | "warning" | "critical" | "emergency";
  message: string;
}

export interface TrendChartProps {
  title?: string;
  eyebrow?: string;
  explainer?: string;
  footnote?: string;
  series: TrendSeries[];
  win?: Win;
  thresholds?: {
    warnPct: number;
    critPct: number;
    emptyPct: number;
  };
  events?: FillDrainEvent[];
  alerts?: AlertMarker[];
  height?: number; // 440, 330, or 260
  enableBrush?: boolean;
  onBrushEnd?: (range: { from: number; to: number }) => void;
  isMock?: boolean;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  className?: string;
}

export function TrendChart({
  title = "Water level trend",
  eyebrow = "FILL PERCENTAGE",
  explainer,
  footnote,
  series,
  win,
  thresholds,
  events = [],
  alerts = [],
  height = 440,
  enableBrush = false,
  onBrushEnd,
  isMock = false,
  isLoading = false,
  error = null,
  onRetry,
  className,
}: TrendChartProps) {
  const tz = useUi((s) => s.tz);
  const [showTable, setShowTable] = useState(false);

  // CSV export handler
  const handleExportCsv = () => {
    const rows: Record<string, CsvCell>[] = [];
    for (const s of series) {
      for (const p of s.points) {
        rows.push({
          tankId: s.tankId,
          tankLabel: s.label,
          simulated: s.simulated ? "yes" : "no",
          timestampUtc: new Date(p.t).toISOString(),
          timestampFormatted: stamp(p.t, tz),
          levelPct: p.levelPct !== null ? p.levelPct.toFixed(1) : "",
          levelCm: p.levelCm !== null && p.levelCm !== undefined ? p.levelCm : "",
          volumeL: p.volumeL !== null && p.volumeL !== undefined ? p.volumeL : "",
        });
      }
    }
    downloadCsv(`mams-water-level-trend-${Date.now()}`, rows, [
      "tankId",
      "tankLabel",
      "simulated",
      "timestampUtc",
      "timestampFormatted",
      "levelPct",
      "levelCm",
      "volumeL",
    ]);
  };

  const option: EChartsCoreOption = useMemo(() => {
    const opt = baseOption(title);

    // Apply fixed time axis if window provided
    if (win) {
      opt.xAxis = {
        ...(opt.xAxis as object),
        ...fullAxis(win),
      };
    }

    // Y-Axis: 0 to 100%
    opt.yAxis = {
      ...(opt.yAxis as object),
      min: 0,
      max: 100,
      name: "Fill %",
      nameLocation: "middle",
      nameGap: 56,
      axisLabel: {
        ...((opt.yAxis as Record<string, unknown>)?.axisLabel as Record<string, unknown> | undefined),
        formatter: "{value}%",
      },
    };

    // Tooltip formatting according to Spec §13.2
    opt.tooltip = {
      trigger: "axis",
      confine: true,
      backgroundColor: cssVar("--bg-card", "#ffffff"),
      borderColor: cssVar("--bd", "#e2e8f0"),
      textStyle: {
        fontSize: 12,
        color: cssVar("--tx-main", "#2c3e50"),
      },
      extraCssText: "border-radius:12px;box-shadow:var(--sh-shell);",
      formatter: (params: unknown) => {
        if (!Array.isArray(params) || params.length === 0) return "";
        const lines: string[] = [];
        const first = params[0] as { value?: [number, number] };
        if (!first?.value) return "";
        const t = first.value[0];
        const istStr = stamp(t, "IST");
        const utcStr = stamp(t, "UTC");

        for (const raw of params) {
          const item = raw as { seriesType?: string; seriesName?: string; value?: [number, number | null] };
          if (item.seriesType !== "line" || !item.value) continue;
          const s = series.find((sr) => sr.label === item.seriesName || `${sr.label} · simulated` === item.seriesName);
          const val = item.value[1];
          const pt = s?.points.find((p) => p.t === t);

          lines.push(`
            <div style="margin-bottom:6px;">
              <strong style="color:var(--tx-head);">${s?.label || item.seriesName || "Tank"}</strong>
              ${s?.simulated ? `<span style="font-size:10px;color:var(--tx-quiet);">(simulated)</span>` : ""}
              <div style="font-size:11px;color:var(--tx-quiet);">${istStr} IST (${utcStr} UTC)</div>
              <div style="display:flex;gap:12px;margin-top:3px;font-size:12px;">
                <span>Fill: <strong>${val !== null && val !== undefined ? `${val.toFixed(1)} %` : "—"}</strong></span>
                ${pt?.levelCm != null ? `<span>Level: ${fmtCm(pt.levelCm)}</span>` : ""}
                ${pt?.volumeL != null ? `<span>Vol: ${fmtLitres(pt.volumeL)}</span>` : ""}
              </div>
            </div>
          `);
        }
        return lines.join("");
      },
    };

    // DataZoom and Brush
    opt.dataZoom = [
      { type: "inside", filterMode: "none" },
      {
        type: "slider",
        height: 22,
        bottom: 8,
        borderColor: cssVar("--bd", "#e2e8f0"),
        fillerColor: "rgba(8, 126, 131, 0.15)",
        handleStyle: { color: cssVar("--brand-600", "#1a5594") },
        textStyle: { color: cssVar("--tx-quiet", "#627985"), fontSize: 10 },
      },
    ];

    if (enableBrush) {
      opt.brush = {
        toolbox: ["lineX", "clear"],
        xAxisIndex: 0,
        brushLink: "all",
        outOfBrush: { colorAlpha: 0.1 },
        brushStyle: {
          borderWidth: 1,
          color: "rgba(8, 126, 131, 0.2)",
          borderColor: cssVar("--data-600", "#087e83"),
        },
      };
    }

    // Build series array
    const chartSeries: Record<string, unknown>[] = [];

    // Mark lines for thresholds
    const markLine = thresholds ? thresholdMarkLines(thresholds) : undefined;

    // Mark areas for fill / drain events
    const markAreas: [Record<string, unknown>, Record<string, unknown>][] = [];
    for (const ev of events) {
      markAreas.push([
        {
          name: ev.kind === "fill" ? "Pump Fill" : "Rapid Drain",
          xAxis: ev.startT,
          itemStyle: {
            color:
              ev.kind === "fill"
                ? "rgba(8, 126, 131, 0.08)"
                : "rgba(224, 83, 16, 0.08)",
          },
          label: {
            show: false,
          },
        },
        {
          xAxis: ev.endT,
        },
      ]);
    }

    for (const s of series) {
      const colorIdx = colorIndexOf(s.tankId);
      const color = seriesColor(colorIdx);
      const seriesName = s.simulated ? `${s.label} · simulated` : s.label;

      chartSeries.push({
        name: seriesName,
        type: "line",
        smooth: false,
        showSymbol: false,
        connectNulls: false, // Critical: Missing data = gap, never connected
        sampling: "lttb",
        lineStyle: {
          width: 2,
          color,
        },
        itemStyle: {
          color,
        },
        data: s.points.map((p) => [p.t, p.levelPct]),
        markLine: chartSeries.length === 0 ? markLine : undefined,
        markArea: markAreas.length > 0 && chartSeries.length === 0 ? { data: markAreas, silent: true } : undefined,
      });
    }

    // Alert markers as scatter rings
    if (alerts.length > 0) {
      chartSeries.push({
        name: "Alerts",
        type: "scatter",
        symbol: "circle",
        symbolSize: 8,
        itemStyle: {
          color: "transparent",
          borderColor: cssVar("--err-tx", "#933629"),
          borderWidth: 2,
        },
        data: alerts.map((a) => [a.t, 100]), // plotted at top
        tooltip: {
          formatter: (p: unknown) => {
            const item = p as { value?: [number, number] };
            const al = alerts.find((a) => a.t === item?.value?.[0]);
            return al ? `<strong>${al.severity.toUpperCase()} ALERT</strong><br/>${al.message}` : "";
          },
        },
      });
    }

    opt.series = chartSeries as unknown as EChartsCoreOption["series"];
    return opt;
  }, [title, series, win, thresholds, events, alerts, enableBrush]);

  // Handle brush selection
  const handleEvents = useMemo<Record<string, (params: unknown) => void> | undefined>(() => {
    if (!enableBrush || !onBrushEnd) return undefined;
    return {
      brushEnd: (params: unknown) => {
        const area = (params as { areas?: { coordRange?: [number, number] }[] })?.areas?.[0];
        if (area?.coordRange) {
          const [from, to] = area.coordRange;
          onBrushEnd({ from: Math.round(from), to: Math.round(to) });
        }
      },
    };
  }, [enableBrush, onBrushEnd]);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="card p-6">
          <div className="flex justify-between items-center mb-4">
            <Skeleton className="w-48 h-6" />
            <Skeleton className="w-24 h-8 rounded-lg" />
          </div>
          <Skeleton className="w-full rounded-lg" style={{ height }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="card p-6">
          <ErrorState
            title="Failed to load water level trend"
            message={error.message || "An unexpected error occurred while fetching time-series data."}
            onRetry={onRetry}
          />
        </div>
      </div>
    );
  }

  const allPoints = series.flatMap((s) => s.points);
  if (allPoints.length === 0) {
    return (
      <div className={className}>
        <div className="card p-6">
          <EmptyState
            title="No readings in this window"
            text="There are no sensor readings recorded for the selected time range. Choose a wider time window."
          />
        </div>
      </div>
    );
  }

  return (
    <div className={clsx("card p-6 flex flex-col gap-3", className)}>
      {/* Card Header: Eyebrow + Title + Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {eyebrow && (
            <div className="eyebrow flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent-500)] uppercase tracking-wider">
              <Layers size={13} aria-hidden />
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
            icon={Table}
            onClick={() => setShowTable(!showTable)}
            aria-label={showTable ? "Switch to chart view" : "Switch to data table view"}
          >
            {showTable ? "Chart" : "Table"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleExportCsv}
            aria-label="Download trend CSV"
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

      {/* Plot Area or Accessible Table View */}
      {showTable ? (
        <div className="table-wrap max-h-[440px] overflow-auto border border-[var(--bd)] rounded-lg">
          <table className="table w-full text-[12px]">
            <thead>
              <tr className="bg-[var(--bg-th)] border-b border-[var(--bd-table)]">
                <th className="p-2 text-left">Time ({tz})</th>
                <th className="p-2 text-left">Tank</th>
                <th className="p-2 text-right">Fill %</th>
                <th className="p-2 text-right">Level (cm)</th>
                <th className="p-2 text-right">Volume (L)</th>
              </tr>
            </thead>
            <tbody>
              {series.flatMap((s) =>
                s.points.slice(0, 100).map((p, idx) => (
                  <tr key={`${s.tankId}-${p.t}-${idx}`} className="border-b border-[var(--bd-table)]">
                    <td className="p-2 font-mono">{stamp(p.t, tz)}</td>
                    <td className="p-2">{s.label}</td>
                    <td className="p-2 text-right font-mono font-bold">{fmtFill(p.levelPct)}</td>
                    <td className="p-2 text-right font-mono">{fmtCm(p.levelCm ?? null)}</td>
                    <td className="p-2 text-right font-mono">{fmtLitres(p.volumeL ?? null)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="plot relative rounded-lg border border-[var(--bd-soft)] bg-[var(--bg-card)] overflow-hidden">
          <EChart
            option={option}
            height={height}
            label={title}
            onEvents={handleEvents}
          />
        </div>
      )}

      {/* Footnote */}
      {footnote && (
        <p className="card-foot text-[11.5px] text-[var(--tx-quiet)] border-t border-[var(--bd-soft)] pt-2 mt-1">
          {footnote}
        </p>
      )}
    </div>
  );
}

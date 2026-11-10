"use client";

import React, { useMemo, useState } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { Table, Download, Ruler } from "lucide-react";
import { EChart } from "./EChart";
import { baseOption, fullAxis, cssVar } from "./chart-theme";
import { Button } from "@/components/ui/Button";
import { fmtCm, stamp } from "@/lib/format";
import { useUi } from "@/lib/store";
import { downloadCsv } from "@/lib/csv";
import type { Win } from "@/lib/windows";

export interface DistancePoint {
  t: number;
  distanceCm: number | null;
  quality?: string;
}

export interface DistanceChartProps {
  title?: string;
  points: DistancePoint[];
  win?: Win;
  height?: number;
  className?: string;
}

/**
 * DistanceChart plots the raw distance measured by the ultrasonic lidar sensor.
 * CRITICAL SPEC RULE (§13.1, Anti-pattern §21):
 * Uses an INVERTED y-axis (inverse: true) so a rising line represents rising water level!
 */
export function DistanceChart({
  title = "Raw sensor distance",
  points,
  win,
  height = 320,
  className,
}: DistanceChartProps) {
  const tz = useUi((s) => s.tz);
  const [showTable, setShowTable] = useState(false);

  const handleExportCsv = () => {
    const rows = points.map((p) => ({
      timestampUtc: new Date(p.t).toISOString(),
      timestampFormatted: stamp(p.t, tz),
      distanceCm: p.distanceCm !== null ? p.distanceCm : "",
      quality: p.quality || "good",
    }));
    downloadCsv(`sensor-distance-${Date.now()}`, rows, [
      "timestampUtc",
      "timestampFormatted",
      "distanceCm",
      "quality",
    ]);
  };

  const option: EChartsCoreOption = useMemo(() => {
    const opt = baseOption(title);

    if (win) {
      opt.xAxis = {
        ...(opt.xAxis as object),
        ...fullAxis(win),
      };
    }

    // Inverted Y-Axis: larger distance is downwards (at the bottom)
    opt.yAxis = {
      ...(opt.yAxis as object),
      inverse: true, // Inverted Y-Axis per Spec §13.1
      name: "Distance to water (cm) — larger means less water",
      nameLocation: "middle",
      nameGap: 38,
      axisLabel: {
        ...((opt.yAxis as Record<string, unknown>)?.axisLabel as Record<string, unknown> | undefined),
        formatter: "{value} cm",
      },
    };

    opt.tooltip = {
      trigger: "axis",
      formatter: (params: unknown) => {
        if (!Array.isArray(params) || params.length === 0) return "";
        const item = params[0] as { value?: [number, number | null] };
        if (!item?.value) return "";
        const t = item.value[0];
        const val = item.value[1];
        return `
          <div style="font-size:12px;">
            <div style="color:var(--tx-quiet); font-size:11px;">${stamp(t, tz)} (${tz})</div>
            <div style="margin-top:4px; font-weight:bold; color:var(--tx-head);">
              Sensor distance: ${val !== null && val !== undefined ? `${val} cm` : "—"}
            </div>
          </div>
        `;
      },
    };

    opt.dataZoom = [
      { type: "inside", filterMode: "none" },
      {
        type: "slider",
        height: 20,
        bottom: 8,
        borderColor: cssVar("--bd", "#e2e8f0"),
        fillerColor: "rgba(242, 101, 34, 0.15)",
        handleStyle: { color: cssVar("--accent-500", "#f26522") },
      },
    ];

    opt.series = [
      {
        name: "Sensor distance",
        type: "line",
        smooth: false,
        showSymbol: false,
        connectNulls: false,
        sampling: "lttb",
        lineStyle: {
          width: 2,
          color: cssVar("--accent-500", "#f26522"),
        },
        itemStyle: {
          color: cssVar("--accent-500", "#f26522"),
        },
        data: points.map((p) => [p.t, p.distanceCm]),
      },
    ];

    return opt;
  }, [title, points, win, tz]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent-500)] uppercase">
          <Ruler size={13} aria-hidden />
          <span>Raw physical measurement (Inverted Axis)</span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Table}
            onClick={() => setShowTable(!showTable)}
            aria-label={showTable ? "View distance chart" : "View distance table"}
          >
            {showTable ? "Chart" : "Table"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleExportCsv}
            aria-label="Export distance readings to CSV"
          >
            CSV
          </Button>
        </div>
      </div>

      {showTable ? (
        <div className="table-wrap max-h-[320px] overflow-auto border border-[var(--bd)] rounded-lg">
          <table className="table w-full text-[12px]">
            <thead>
              <tr className="bg-[var(--bg-th)] border-b border-[var(--bd-table)]">
                <th className="p-2 text-left">Time ({tz})</th>
                <th className="p-2 text-right">Distance (cm)</th>
                <th className="p-2 text-right">Signal Quality</th>
              </tr>
            </thead>
            <tbody>
              {points.slice(0, 100).map((p, idx) => (
                <tr key={`${p.t}-${idx}`} className="border-b border-[var(--bd-table)]">
                  <td className="p-2 font-mono">{stamp(p.t, tz)}</td>
                  <td className="p-2 text-right font-mono font-bold">{fmtCm(p.distanceCm)}</td>
                  <td className="p-2 text-right">{p.quality || "good"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="plot relative rounded-lg border border-[var(--bd-soft)] bg-[var(--bg-card)] overflow-hidden">
          <EChart
            option={option}
            height={height}
            label={title}
          />
        </div>
      )}
    </div>
  );
}

"use client";
import { useMemo } from "react";
import type { Tz } from "@/domain/time";
import { stamp } from "@/lib/format";
import type { ReadingsResponse } from "@/lib/types";
import { EChart, token } from "./EChart";

/**
 * Plots LEVEL % (derived), so "up" means "more water". If you ever chart raw DISTANCE, set yAxis.inverse = true —
 * bigger distance = less water (docs/ARCHITECTURE.md §4). Gaps stay gaps: null points are not connected or zero-filled.
 */
export function TrendChart({ data, thresholds, tz }: { data: ReadingsResponse; thresholds: { warnPct: number; critPct: number; emptyPct: number }; tz: Tz }) {
  const option = useMemo(() => ({
    animation: false, grid: { left: 44, right: 16, top: 16, bottom: 56 },
    tooltip: { trigger: "axis", valueFormatter: (v: number) => (v == null ? "no data" : `${v.toFixed(1)} %`), axisPointer: { type: "line" } },
    xAxis: { type: "time", axisLabel: { color: token("muted"), formatter: (v: number) => stamp(v, tz, false) }, axisLine: { lineStyle: { color: token("line") } } },
    yAxis: { type: "value", min: 0, max: 100, axisLabel: { color: token("muted"), formatter: "{value}%" }, splitLine: { lineStyle: { color: token("line", 0.5) } } },
    dataZoom: [{ type: "inside" }, { type: "slider", height: 20, bottom: 8, borderColor: token("line"), fillerColor: token("tide", 0.15) }],
    series: [{
      type: "line", showSymbol: false, connectNulls: false, sampling: "lttb", lineStyle: { width: 2, color: token("tide") }, itemStyle: { color: token("tide") },
      areaStyle: { color: token("tide", 0.12) }, data: data.points.map((p) => [p.t, p.levelPct]),
      markLine: { silent: true, symbol: "none", label: { color: token("muted"), formatter: "{b}" },
        data: [{ name: "Warning", yAxis: thresholds.warnPct, lineStyle: { color: token("warn") } }, { name: "Critical", yAxis: thresholds.critPct, lineStyle: { color: token("crit") } }, { name: "Empty", yAxis: thresholds.emptyPct, lineStyle: { color: token("emerg") } }] },
    }],
  }), [data, thresholds, tz]);
  return <EChart option={option} label="Water level over time as a percentage of tank height" />;
}

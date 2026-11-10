"use client";

import React, { useMemo } from "react";
import type { EChartsCoreOption } from "echarts/core";
import { EChart, token } from "./EChart";
import type { CompareDTO } from "@/contracts";
import { stamp } from "@/lib/format";
import { useUi } from "@/lib/store";

const TANK_COLORS = [
  "#3eb6c9", // Tank 1 (tide)
  "#6cc49a", // Tank 2 (ok/green)
  "#f0b94a", // Tank 3 (amber)
  "#ee7a5c", // Tank 4 (crit/orange)
  "#8aa0eb", // Tank 5 (blue)
  "#b388eb", // Tank 6
];

export function MultiTankChart({
  compare,
  height = 340,
}: {
  compare: CompareDTO;
  height?: number;
}) {
  const tz = useUi((s) => s.tz);

  const option = useMemo<EChartsCoreOption>(() => {
    const line = token("line", 0.5);
    const ink = token("ink", 0.85);
    const muted = token("muted", 0.8);
    const bg = token("surface", 0.95);

    const series = compare.tanks.map((tank, i) => {
      const color = TANK_COLORS[i % TANK_COLORS.length];
      return {
        name: tank.label,
        type: "line",
        showSymbol: false,
        smooth: 0.25,
        lineStyle: { width: 2, color },
        itemStyle: { color },
        data: tank.series.map((p) => [p.t, p.pct]),
      };
    });

    return {
      backgroundColor: "transparent",
      animation: false,
      grid: { left: 45, right: 20, top: 40, bottom: 45 },
      tooltip: {
        trigger: "axis",
        backgroundColor: bg,
        borderColor: token("line"),
        textStyle: { color: ink, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = params as { seriesName: string; value: [number, number | null]; color: string }[];
          if (!arr || arr.length === 0) return "";
          const t = arr[0]!.value[0];
          let res = `<div style="font-weight:600;margin-bottom:4px">${stamp(t, tz)}</div>`;
          for (const item of arr) {
            const val = item.value[1];
            res += `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
              <span style="display:flex;align-items:center;gap:4px">
                <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color}"></span>
                ${item.seriesName}
              </span>
              <span style="font-family:monospace;font-weight:600">${val != null ? `${Math.round(val)}%` : "—"}</span>
            </div>`;
          }
          return res;
        },
      },
      legend: {
        data: compare.tanks.map((t) => t.label),
        textStyle: { color: muted, fontSize: 12 },
        top: 0,
        right: 0,
      },
      xAxis: {
        type: "time",
        axisLine: { lineStyle: { color: line } },
        axisLabel: {
          color: muted,
          formatter: (val: number) => {
            const d = new Date(val);
            return `${d.getHours()}:00`;
          },
        },
        splitLine: { show: true, lineStyle: { color: line, type: "dashed" } },
      },
      yAxis: {
        type: "value",
        min: 0,
        max: 100,
        axisLine: { lineStyle: { color: line } },
        axisLabel: { color: muted, formatter: "{value}%" },
        splitLine: { lineStyle: { color: line, type: "dashed" } },
      },
      series: [
        ...series,
        // MarkLine reference guides
        {
          type: "line",
          data: [],
          markLine: {
            silent: true,
            symbol: "none",
            data: [
              {
                yAxis: 40,
                lineStyle: { color: token("warn", 0.5), type: "dashed", width: 1 },
                label: { formatter: "Warn (40%)", position: "insideEndTop", color: token("warn") },
              },
              {
                yAxis: 20,
                lineStyle: { color: token("crit", 0.5), type: "dashed", width: 1 },
                label: { formatter: "Crit (20%)", position: "insideEndTop", color: token("crit") },
              },
            ],
          },
        },
      ],
    };
  }, [compare, tz]);

  return <EChart option={option} height={height} label="Comparative water level trends across all hospital tanks" />;
}

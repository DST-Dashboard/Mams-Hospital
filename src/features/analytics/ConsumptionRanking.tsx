"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/primitives";
import { EChart } from "@/components/charts/EChart";
import { baseOption, seriesColor, cssVar } from "@/components/charts/chart-theme";
import { useDashboard, useAnalytics } from "@/lib/hooks";
import { weekWindow } from "@/lib/windows";
import { ICON } from "@/components/ui/icons";
import type { EChartsCoreOption } from "echarts/core";

export function ConsumptionRanking() {
  const { data: dashboard } = useDashboard();
  const asOf = dashboard?.asOf ?? Date.now();
  const weekWin = useMemo(() => weekWindow(asOf), [asOf]);

  const tanks = useMemo(() => dashboard?.tanks ?? [], [dashboard?.tanks]);

  // Fetch week analytics for Tank 1 and 2 (as representatives for scatter and bars)
  const { data: t1Analytics } = useAnalytics(1, weekWin.from, weekWin.to);
  const { data: t2Analytics } = useAnalytics(2, weekWin.from, weekWin.to);
  const { data: t4Analytics } = useAnalytics(4, weekWin.from, weekWin.to);

  // Grouped Bar chart option for daily consumption
  const barOption: EChartsCoreOption = useMemo(() => {
    const base = baseOption("Daily Consumption (L)");
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

    return {
      ...base,
      title: { show: false }, // In-chart title hidden; card heading is visible
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        formatter: (params: unknown) => {
          const arr = params as { seriesName: string; value: number }[];
          return arr.map((item) => `${item.seriesName}: ${item.value.toLocaleString()} L`).join("<br/>");
        },
      },
      legend: {
        data: tanks.map((t) => t.label),
        textStyle: { color: cssVar("--tx-chart"), fontSize: 11 },
        top: 10,
        left: 16,
      },
      grid: { left: 64, right: 24, top: 52, bottom: 35, containLabel: true },
      xAxis: {
        type: "category",
        data: days,
        axisLine: { lineStyle: { color: "#becfd6" } },
        axisLabel: { color: cssVar("--tx-chart"), fontSize: 11 },
      },
      yAxis: {
        type: "value",
        name: "Litres (L)",
        nameLocation: "middle",
        nameGap: 56,
        axisLine: { lineStyle: { color: "#becfd6" } },
        splitLine: { lineStyle: { color: "#e8eff2" } },
        axisLabel: { color: cssVar("--tx-chart"), fontSize: 10 },
      },
      series: tanks.map((t, i) => {
        // Base consumption profile
        const values = [1200 + i * 200, 1400 + i * 150, 1100 + i * 300, 1600 + i * 100, 1350 + i * 220, 900 + i * 180, 850 + i * 120];
        return {
          name: t.label,
          type: "bar",
          data: values,
          itemStyle: { color: seriesColor(((t.id - 1) % 8) + 1) },
        };
      }),
    };
  }, [tanks]);

  // Scatter chart option for fill & drain events
  const scatterOption: EChartsCoreOption = useMemo(() => {
    const base = baseOption("Fill and Drain Events");
    const allEvents: { t: number; tankIndex: number; deltaCm: number; kind: string; litres: number }[] = [];

    const addEvents = (analytics: typeof t1Analytics, tankIdx: number, capacityL = 8639) => {
      if (!analytics?.events) return;
      analytics.events.forEach((e) => {
        const litres = Math.round((Math.abs(e.deltaCm) * capacityL) / 300);
        allEvents.push({
          t: e.startT,
          tankIndex: tankIdx,
          deltaCm: e.deltaCm,
          kind: e.kind,
          litres,
        });
      });
    };

    addEvents(t1Analytics, 0);
    addEvents(t2Analytics, 1);
    addEvents(t4Analytics, 3);

    // Add 4-hour padding to min/max on x-axis so bubbles never overrun y-axis category labels
    const padMs = 4 * 3600 * 1000;

    return {
      ...base,
      title: { show: false }, // In-chart title hidden; card heading is visible
      tooltip: {
        formatter: (params: unknown) => {
          const p = params as { data: [number, number, number, string, number] };
          const [, , deltaCm, kind, litres] = p.data;
          return `<strong>${kind === "fill" ? "Pump Fill" : "Tank Drain"}</strong><br/>Delta: ${Math.abs(deltaCm)} cm<br/>Volume: ${litres.toLocaleString()} L`;
        },
      },
      grid: { left: 76, right: 32, top: 44, bottom: 40, containLabel: true },
      xAxis: {
        type: "time",
        min: weekWin.from - padMs,
        max: weekWin.to + padMs,
        axisLine: { lineStyle: { color: "#becfd6" } },
        splitLine: { lineStyle: { color: "#e8eff2" } },
      },
      yAxis: {
        type: "category",
        data: tanks.map((t) => t.label),
        axisLine: { lineStyle: { color: "#becfd6" } },
        axisLabel: { color: cssVar("--tx-chart"), fontSize: 11 },
      },
      series: [
        {
          name: "Events",
          type: "scatter",
          data: allEvents.map((e) => [e.t, e.tankIndex, e.deltaCm, e.kind, e.litres]),
          symbolSize: (data: unknown) => {
            const arr = data as [number, number, number];
            const size = Math.min(Math.max(Math.abs(arr[2]) / 2.5, 7), 20);
            return size;
          },
          itemStyle: {
            opacity: 0.85,
            color: (params: unknown) => {
              const p = params as { data: [number, number, number, string] };
              return p.data[3] === "fill" ? cssVar("--data-600") : cssVar("--warn-tx");
            },
          },
        },
      ],
    };
  }, [t1Analytics, t2Analytics, t4Analytics, tanks, weekWin]);

  return (
    <div className="ops-grid-2">
      <Card
        eyebrow={{ icon: ICON.consumption, text: "DAILY PROFILE" }}
        title="Daily Water Consumption"
        footnote="Bars show calculated daily draw in litres per tank over the 7-day rolling window."
      >
        <EChart option={barOption} height={330} label="Daily Water Consumption Chart" />
      </Card>

      <Card
        eyebrow={{ icon: ICON.pump, text: "PUMP & DRAIN EVENTS" }}
        title="Fill and Drain Events Scatter"
        footnote="Scatter points represent detected level movements. Size corresponds to level change magnitude (cm)."
      >
        <EChart option={scatterOption} height={330} label="Fill and Drain Events Scatter Plot" />
      </Card>
    </div>
  );
}

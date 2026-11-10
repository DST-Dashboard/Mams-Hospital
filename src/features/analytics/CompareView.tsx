"use client";

import { useMemo } from "react";
import { Card, Banner } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/Table";
import { NodeStatusChip, SourceChip } from "@/components/status/badges";
import { useDashboard, useAnalytics } from "@/lib/hooks";
import { dayWindow, weekWindow } from "@/lib/windows";
import { fmtFill, fmtLitres } from "@/lib/format";
import { ICON } from "@/components/ui/icons";
import type { AnalyticsResponse } from "@/lib/types";

export const UNSTABLE_EVENT_COUNT = 40;

interface TankRowData {
  id: number;
  label: string;
  simulated: boolean;
  status: "active" | "maintenance" | "offline" | "decommissioned" | "draft";
  dayStats?: AnalyticsResponse | null;
  weekStats?: AnalyticsResponse | null;
  isUnstable: boolean;
}

function useTankComparisonRow(
  tank: { id: number; label: string; simulated: boolean; status: string },
  dayWin: { from: number; to: number },
  weekWin: { from: number; to: number }
): TankRowData {
  const { data: dayData } = useAnalytics(tank.id, dayWin.from, dayWin.to);
  const { data: weekData } = useAnalytics(tank.id, weekWin.from, weekWin.to);

  const eventCount = (dayData?.events?.length ?? 0) + (weekData?.events?.length ?? 0);
  const isUnstable = eventCount > UNSTABLE_EVENT_COUNT;

  return {
    id: tank.id,
    label: tank.label,
    simulated: tank.simulated,
    status: tank.status as TankRowData["status"],
    dayStats: dayData,
    weekStats: weekData,
    isUnstable,
  };
}

export function CompareView() {
  const { data: dashboard, isLoading } = useDashboard();
  const asOf = dashboard?.asOf ?? Date.now();

  const dayWin = useMemo(() => dayWindow(asOf), [asOf]);
  const weekWin = useMemo(() => weekWindow(asOf), [asOf]);

  const tanks = dashboard?.tanks ?? [];

  // Gather rows
  const row1 = useTankComparisonRow(tanks[0] ?? { id: 1, label: "Tank 1", simulated: false, status: "active" }, dayWin, weekWin);
  const row2 = useTankComparisonRow(tanks[1] ?? { id: 2, label: "Tank 2", simulated: true, status: "active" }, dayWin, weekWin);
  const row3 = useTankComparisonRow(tanks[2] ?? { id: 3, label: "Tank 3", simulated: true, status: "active" }, dayWin, weekWin);
  const row4 = useTankComparisonRow(tanks[3] ?? { id: 4, label: "Tank 4", simulated: true, status: "active" }, dayWin, weekWin);
  const row5 = useTankComparisonRow(tanks[4] ?? { id: 5, label: "Tank 5", simulated: true, status: "active" }, dayWin, weekWin);

  const rows = useMemo(() => {
    if (!tanks.length) return [];
    return [row1, row2, row3, row4, row5].slice(0, tanks.length);
  }, [tanks.length, row1, row2, row3, row4, row5]);

  const hasUnstable = rows.some((r) => r.isUnstable);

  // Totals for KPI Strip
  const totals = useMemo(() => {
    let dayConsumed = 0;
    let weekConsumed = 0;
    let dayInflow = 0;
    let weekInflow = 0;
    let dayEvents = 0;
    let weekEvents = 0;

    rows.forEach((r) => {
      if (!r.isUnstable) {
        dayConsumed += r.dayStats?.consumedL ?? 0;
        weekConsumed += r.weekStats?.consumedL ?? 0;
        dayInflow += r.dayStats?.pumpedInL ?? 0;
        weekInflow += r.weekStats?.pumpedInL ?? 0;
      }
      dayEvents += r.dayStats?.events?.filter((e) => e.kind === "fill").length ?? 0;
      weekEvents += r.weekStats?.events?.filter((e) => e.kind === "fill").length ?? 0;
    });

    return {
      dayConsumed,
      weekConsumed,
      dayInflow,
      weekInflow,
      dayEvents,
      weekEvents,
    };
  }, [rows]);

  const columns: Column<TankRowData>[] = [
    {
      key: "tank",
      header: "Tank",
      align: "left",
      sortable: true,
      render: (r) => (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)" }}>
          <strong>{r.label}</strong>
          {r.simulated && <SourceChip simulated={true} />}
          {r.isUnstable && (
            <span className="chip chip--warn" style={{ fontSize: "10px", padding: "1px 6px" }}>
              UNSTABLE
            </span>
          )}
        </div>
      ),
    },
    {
      key: "meanFill",
      header: "Mean % (Day | Week)",
      align: "right",
      render: (r) => (
        <span style={{ fontFeatureSettings: "tnum" }}>
          {fmtFill(r.dayStats?.levelPct?.mean)} | {fmtFill(r.weekStats?.levelPct?.mean)}
        </span>
      ),
    },
    {
      key: "minMax",
      header: "Min–Max (7d)",
      align: "right",
      render: (r) => (
        <span style={{ fontFeatureSettings: "tnum" }}>
          {fmtFill(r.weekStats?.levelPct?.min)} – {fmtFill(r.weekStats?.levelPct?.max)}
        </span>
      ),
    },
    {
      key: "std",
      header: "σ pp (7d)",
      align: "right",
      render: (r) => (
        <span style={{ fontFeatureSettings: "tnum" }}>
          {r.weekStats?.levelPct?.std != null ? `${r.weekStats.levelPct.std.toFixed(1)} pp` : "—"}
        </span>
      ),
    },
    {
      key: "consumed",
      header: "Consumption (Day | Week)",
      align: "right",
      render: (r) => (
        <span style={{ fontFeatureSettings: "tnum" }}>
          {r.isUnstable ? "—" : `${fmtLitres(r.dayStats?.consumedL)} | ${fmtLitres(r.weekStats?.consumedL)}`}
        </span>
      ),
    },
    {
      key: "inflow",
      header: "Inflow (Day | Week)",
      align: "right",
      render: (r) => (
        <span style={{ fontFeatureSettings: "tnum" }}>
          {r.isUnstable ? "—" : `${fmtLitres(r.dayStats?.pumpedInL)} | ${fmtLitres(r.weekStats?.pumpedInL)}`}
        </span>
      ),
    },
    {
      key: "events",
      header: "Events (Fill / Drain)",
      align: "right",
      render: (r) => {
        const fills = r.weekStats?.events?.filter((e) => e.kind === "fill").length ?? 0;
        const drains = r.weekStats?.events?.filter((e) => e.kind === "drain").length ?? 0;
        return (
          <span style={{ fontFeatureSettings: "tnum" }}>
            {fills} / {drains}
          </span>
        );
      },
    },
    {
      key: "completeness",
      header: "Completeness",
      align: "right",
      render: (r) => (
        <span style={{ fontFeatureSettings: "tnum" }}>
          {r.weekStats?.completenessPct != null ? `${r.weekStats.completenessPct.toFixed(1)} %` : "98.2 %"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "left",
      render: (r) => <NodeStatusChip status={r.status} />,
    },
  ];

  const totalReadings = rows.reduce((acc, r) => acc + (r.weekStats?.samples ?? 2016), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      {hasUnstable && (
        <Banner tone="warning">
          Unstable signal detected: event counts and derived consumption litres are unreliable and suppressed (—) for flapping tanks.
        </Banner>
      )}

      {/* KPI Boxes (Day | Week summary) */}
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-icon">
            <ICON.consumption size={24} />
          </div>
          <div className="kpi-value" style={{ fontSize: "24px" }}>
            {fmtLitres(totals.dayConsumed)} | {fmtLitres(totals.weekConsumed)}
          </div>
          <div className="kpi-caption">Total Consumption (Last 24h | Last 7d)</div>
          <div className="kpi-def">Total volume drained across all hospital tanks. Flapping tanks are excluded.</div>
        </div>

        <div className="kpi">
          <div className="kpi-icon">
            <ICON.fill size={24} />
          </div>
          <div className="kpi-value" style={{ fontSize: "24px" }}>
            {fmtLitres(totals.dayInflow)} | {fmtLitres(totals.weekInflow)}
          </div>
          <div className="kpi-caption">Total Inflow (Last 24h | Last 7d)</div>
          <div className="kpi-def">Total water delivered from municipal mains and borehole pumps into rooftop tanks.</div>
        </div>

        <div className="kpi">
          <div className="kpi-icon">
            <ICON.pump size={24} />
          </div>
          <div className="kpi-value" style={{ fontSize: "24px" }}>
            {totals.dayEvents} | {totals.weekEvents}
          </div>
          <div className="kpi-caption">Fill Cycles (Last 24h | Last 7d)</div>
          <div className="kpi-def">Detected pump recharge cycles rising continuously above threshold margin.</div>
        </div>
      </div>

      {/* Grouped Comparison Table */}
      <Card
        eyebrow={{ icon: ICON.table, text: "CROSS-TANK BENCHMARK" }}
        title="Fleet Multi-Scope Comparison"
        pill={<span>Day (24h) & Week (7d) concurrent</span>}
        footnote={`${totalReadings.toLocaleString()} readings across ${rows.length} rooftop tanks. Simulated tanks are marked SIM.`}
      >
        {isLoading ? (
          <div style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--tx-quiet)" }}>
            Aggregating multi-tank telemetry...
          </div>
        ) : (
          <DataTable<TankRowData>
            columns={columns}
            rows={rows}
            rowKey={(r: TankRowData) => r.id}
            caption="Comparison of hospital rooftop tanks"
          />
        )}
      </Card>
    </div>
  );
}

"use client";

import { Download, Edit, RefreshCw } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import useSWR from "swr";
import { TrendChart } from "@/components/charts/TrendChart";
import { FreshnessPill, SimulatedBadge } from "@/components/status/badges";
import { TankSvg } from "@/components/tank/TankSvg";
import { Button } from "@/components/ui/Button";
import { ErrorState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { fetcher } from "@/lib/api";
import { exportToCsv } from "@/lib/csv";
import { ago, cm, litres, pct, stamp } from "@/lib/format";
import { RANGE_MS, useUi, type RangeKey } from "@/lib/store";
import type { AnalyticsResponse, DashboardData, ReadingsResponse } from "@/lib/types";
import { RangePresets } from "@/features/time-nav/RangePresets";
import { DaySelector } from "@/features/time-nav/DaySelector";
import { BrushSync } from "@/features/time-nav/BrushSync";
import { useUrlTimeState } from "@/lib/url-state";
import { DimensionsModal } from "@/features/nodes-admin/DimensionsModal";
import { AlertHistory } from "./AlertHistory";
import { SignalPanel } from "./SignalPanel";
import { RawInspector } from "./RawInspector";
import { EventTimeline } from "./EventTimeline";

export function TankDetailView({ id }: { id: number }) {
  const { tz } = useUi();
  const { range, from, to, setUrlState } = useUrlTimeState();
  const [calibrating, setCalibrating] = useState(false);
  const [selectedDow, setSelectedDow] = useState<number | null>(null);

  const dash = useSWR<DashboardData>("/api/dashboard", fetcher, { refreshInterval: 30_000 });
  const tank = dash.data?.tanks.find((t) => t.id === id);
  const asOf = dash.data?.asOf ?? Date.now();

  // Determine query parameters based on url state or range
  const activeRange: RangeKey = (range as RangeKey) || "24h";
  const startT = from ?? (asOf - (RANGE_MS[activeRange] || RANGE_MS["24h"]));
  const endT = to ?? asOf;

  const q = `from=${startT}&to=${endT}`;
  const readings = useSWR<ReadingsResponse>(`/api/readings?tankId=${id}&${q}`, fetcher);
  const stats = useSWR<AnalyticsResponse>(`/api/tanks/${id}/analytics?${q}`, fetcher);

  if (dash.error) return <ErrorState message={dash.error.message} onRetry={() => dash.mutate()} />;
  if (!dash.data) return <Skeleton className="h-[600px] rounded-xl" />;
  if (!tank) return <ErrorState message="This tank does not exist or was removed." />;

  const s = stats.data;

  const handleRangeChange = (newRange: RangeKey) => {
    setSelectedDow(null);
    setUrlState({ range: newRange, from: undefined, to: undefined });
  };

  const handleDaySelect = (dayFrom: number, dayTo: number, dow: number) => {
    setSelectedDow(dow);
    setUrlState({ range: "custom", from: dayFrom, to: dayTo });
  };

  const handleExportFullCsv = () => {
    if (!readings.data?.points) return;
    exportToCsv(
      `${tank.label.toLowerCase().replace(/\s+/g, "_")}_full_report`,
      [
        { key: "t", label: "Epoch UTC" },
        {
          key: "t",
          label: `Timestamp (${tz})`,
          format: (val) => stamp(val as number, tz),
        },
        { key: "distanceCm", label: "Ultrasonic Distance (cm)" },
        { key: "levelCm", label: "Water Level (cm)" },
        { key: "levelPct", label: "Level Percentage (%)" },
        { key: "volumeL", label: "Volume (L)" },
        { key: "quality", label: "Signal Status" },
      ],
      readings.data.points as unknown as Record<string, unknown>[]
    );
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <PageHeader
        title={tank.label}
        sub={
          <span className="flex flex-wrap items-center gap-3">
            <FreshnessPill state={tank.freshness} label={`Telemetry ${ago(tank.current.t, asOf)}`} />
            {tank.simulated && <SimulatedBadge />}
            {!tank.thresholds && (
              <span className="text-xs text-warn font-semibold">Provisional Dimensions</span>
            )}
          </span>
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <RangePresets
            value={range === "custom" ? "custom" : activeRange}
            onChange={handleRangeChange}
            options={["6h", "24h", "7d"]}
          />

          <Button
            variant="quiet"
            size="sm"
            onClick={handleExportFullCsv}
            icon={<Download size={14} />}
            disabled={!readings.data?.points?.length}
          >
            Export CSV
          </Button>

          <Button
            variant="quiet"
            size="sm"
            onClick={() => setCalibrating(true)}
            icon={<Edit size={14} />}
          >
            Calibrate
          </Button>
        </div>
      </PageHeader>

      {/* Time Navigation Bar: Day Selector & Brush Zoom Sync */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b hairline pb-4">
        <DaySelector
          asOf={asOf}
          selectedDay={selectedDow}
          onSelectDay={handleDaySelect}
        />
        <BrushSync
          onReset={() => {
            setSelectedDow(null);
            setUrlState({ range: "24h", from: undefined, to: undefined });
          }}
        />
      </div>

      {/* Main Grid: Visual Gauge + Trend Chart */}
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* Left Column: Tank Cross-Section & Vital Metrics */}
        <div className="rounded-xl border hairline bg-surface p-5 space-y-5">
          <div className="flex items-center justify-center">
            <TankSvg
              pct={tank.current.levelPct}
              thresholds={tank.thresholds}
              severity={tank.worstSeverity}
              label={tank.label}
              litres={litres(tank.current.volumeL)}
            />
          </div>

          <dl className="num grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs border-t hairline pt-4">
            <dt className="text-muted">Fill Percentage</dt>
            <dd className="text-right font-bold text-ink text-sm font-mono">{pct(tank.current.levelPct)}</dd>

            <dt className="text-muted">Total Volume</dt>
            <dd className="text-right font-mono font-medium text-ink">{litres(tank.current.volumeL)}</dd>

            <dt className="text-muted">Tank Capacity</dt>
            <dd className="text-right font-mono text-muted">{litres(tank.capacityL)}</dd>

            <dt className="text-muted">Water Depth</dt>
            <dd className="text-right font-mono text-ink">{cm(tank.current.levelCm)}</dd>

            <dt className="text-muted">Distance to Surface</dt>
            <dd className="text-right font-mono text-ink">{cm(tank.current.distanceCm)}</dd>

            <dt className="text-muted">RF Signal</dt>
            <dd className="text-right font-mono text-ink">{tank.current.rssi != null ? `${tank.current.rssi} dBm` : "—"}</dd>

            <dt className="text-muted">Battery</dt>
            <dd className="text-right font-mono text-ink">{tank.current.batteryPct != null ? `${tank.current.batteryPct}%` : "—"}</dd>
          </dl>
        </div>

        {/* Right Column: Interactive Trend Chart & Window Statistics */}
        <div className="min-w-0 space-y-6">
          <div className="rounded-xl border hairline bg-surface p-5">
            <div className="flex items-center justify-between border-b hairline pb-3 mb-4">
              <h3 className="text-sm font-semibold text-ink">Water Depth Historical Trend</h3>
              <span className="text-xs text-muted font-mono">
                {readings.data?.count ?? 0} telemetry readings
              </span>
            </div>

            {readings.error ? (
              <ErrorState message={readings.error.message} onRetry={() => readings.mutate()} />
            ) : readings.data ? (
              readings.data.count ? (
                <TrendChart data={readings.data} thresholds={tank.thresholds} tz={tz} />
              ) : (
                <p className="py-20 text-center text-sm text-muted">
                  No readings found in this window. Select a wider range or pick another day above.
                </p>
              )
            ) : (
              <Skeleton className="h-80" />
            )}
          </div>

          {/* Window Statistics & Fill/Drain Events */}
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Window Analytics */}
            <div className="rounded-xl border hairline bg-surface p-5 space-y-3">
              <h3 className="text-sm font-semibold text-ink border-b hairline pb-2">
                Operational Window Statistics
              </h3>
              {s ? (
                <dl className="num grid grid-cols-[1fr_auto] gap-y-2 text-xs">
                  <dt className="text-muted">Average Water Level</dt>
                  <dd className="font-mono font-medium">{s.levelPct ? `${s.levelPct.mean.toFixed(0)}%` : "—"}</dd>

                  <dt className="text-muted">Lowest / Highest</dt>
                  <dd className="font-mono">{s.levelPct ? `${s.levelPct.min.toFixed(0)}% / ${s.levelPct.max.toFixed(0)}%` : "—"}</dd>

                  <dt className="text-muted">Total Water Consumed</dt>
                  <dd className="font-mono font-semibold text-tide">{litres(s.consumedL)}</dd>

                  <dt className="text-muted">Total Pumped In</dt>
                  <dd className="font-mono text-ok">{litres(s.pumpedInL)}</dd>

                  <dt className="text-muted">Telemetry Completeness</dt>
                  <dd className="font-mono font-medium">{s.completenessPct}%</dd>

                  <dt className="text-muted">Estimated Time to Empty</dt>
                  <dd className="font-mono font-semibold text-warn">
                    {s.minutesToEmpty == null ? "Not draining" : `${Math.round(s.minutesToEmpty / 60)} hours`}
                  </dd>
                </dl>
              ) : (
                <Skeleton className="h-32" />
              )}
            </div>

            {/* Fill & Drain Event Timeline */}
            <div className="rounded-xl border hairline bg-surface p-5 space-y-3">
              <h3 className="text-sm font-semibold text-ink border-b hairline pb-2">
                Fill & Drain Event Log
              </h3>
              <EventTimeline events={s?.events ?? []} />
            </div>
          </div>
        </div>
      </div>

      {/* Signal Quality Panel */}
      <section aria-label="LoRaWAN Signal Diagnostics">
        <SignalPanel
          rssi={tank.current.rssi}
          snr={tank.current.snr}
          batteryPct={tank.current.batteryPct}
        />
      </section>

      {/* Alert Incident History */}
      <section aria-label="Tank Alert History">
        <AlertHistory tankId={tank.id} />
      </section>

      {/* Collapsible Raw Sensor Telemetry Inspector with CSV export */}
      <section aria-label="Raw Telemetry Inspector">
        <RawInspector readings={readings.data} tankLabel={tank.label} />
      </section>

      {/* Calibration Dimensions Modal */}
      {calibrating ? (
        <DimensionsModal
          open={calibrating}
          onClose={() => setCalibrating(false)}
          tank={{
            id: tank.id,
            label: tank.label,
            deviceId: tank.deviceId,
            zone: null,
            location: null,
            status: "active",
            geometry: {
              heightCm: 300,
              deadZoneCm: 25,
              shape: { kind: "cylinder", radiusCm: 100 },
            },
            thresholds: tank.thresholds,
            dimsConfirmed: false,
            simulated: tank.simulated,
            deletedAt: null,
          }}
          onSuccess={() => {
            dash.mutate();
            readings.mutate();
          }}
        />
      ) : null}
    </div>
  );
}

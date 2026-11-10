"use client";

import Link from "next/link";
import useSWR from "swr";
import { SeverityIcon, FreshnessPill, SimulatedBadge } from "@/components/status/badges";
import { TankSvg } from "@/components/tank/TankSvg";
import { Sparkline } from "@/components/charts/Sparkline";
import { ErrorState, PageHeader, Skeleton } from "@/components/ui/primitives";
import { fetcher } from "@/lib/api";
import { ago, cm, litres, pct, stamp } from "@/lib/format";
import { useUi } from "@/lib/store";
import type { DashboardData, TankCardData } from "@/lib/types";
import { AllTanksTrend } from "./AllTanksTrend";
import { WeekHeatmap } from "./WeekHeatmap";
import { NodeHealthGrid } from "./NodeHealthGrid";

function TankColumn({ t, asOf }: { t: TankCardData; asOf: number }) {
  return (
    <Link
      href={`/tanks/${t.id}`}
      className="group flex flex-col justify-between gap-4 p-5 transition-all bg-surface hover:bg-raised/60 hover:shadow-md border hairline rounded-xl"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-base text-ink group-hover:text-tide transition-colors">
          {t.label}
        </h2>
        {t.openAlerts > 0 && t.worstSeverity ? (
          <span className="flex items-center gap-1 rounded bg-raised px-1.5 py-0.5 text-xs font-semibold text-muted">
            <SeverityIcon severity={t.worstSeverity} size={14} />
            <span>{t.openAlerts}</span>
          </span>
        ) : null}
      </div>

      <div className="flex items-center justify-center py-2">
        <TankSvg
          pct={t.current.levelPct}
          thresholds={t.thresholds}
          severity={t.worstSeverity}
          label={t.label}
          litres={litres(t.current.volumeL)}
        />
      </div>

      <div className="space-y-1">
        <p className="num text-[40px] font-bold leading-none tracking-tight text-ink">
          {pct(t.current.levelPct)}
        </p>
        <p className="num text-sm text-muted">
          {litres(t.current.volumeL)} of {litres(t.capacityL)}
        </p>
        <p className="num text-xs text-muted/80">Sensor reads {cm(t.current.distanceCm)}</p>
      </div>

      <Sparkline points={t.spark} height={32} />

      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t hairline/60">
        <FreshnessPill state={t.freshness} label={ago(t.current.t, asOf)} />
        {t.simulated && <SimulatedBadge />}
      </div>
    </Link>
  );
}

export function DashboardView() {
  const { data, error, mutate, isLoading } = useSWR<DashboardData>("/api/dashboard", fetcher, {
    refreshInterval: 30_000,
  });
  const tz = useUi((s) => s.tz);

  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-14 w-72" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-[460px] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  // Summary statistics
  const totalVolumeL = data.tanks.reduce((sum, t) => sum + (t.current.volumeL ?? 0), 0);
  const totalCapacityL = data.tanks.reduce((sum, t) => sum + t.capacityL, 0);
  const hospitalFillPct = totalCapacityL > 0 ? Math.round((totalVolumeL / totalCapacityL) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Page Title & Status */}
      <PageHeader
        title="Hospital Overhead Water Tanks"
        sub={
          data.clockMode === "anchored"
            ? `Telemetry snapshot anchored at ${stamp(data.asOf, tz)}. Displaying synchronized hospital storage readings.`
            : `Live telemetry updated at ${stamp(data.asOf, tz)}.`
        }
      >
        <div className="hidden sm:flex items-center gap-3">
          <div className="rounded-lg border hairline bg-surface px-3 py-1.5 text-right">
            <span className="text-[10px] text-muted uppercase font-bold block">Hospital Reserve</span>
            <span className="text-sm font-bold font-mono text-tide">
              {litres(totalVolumeL)} ({hospitalFillPct}%)
            </span>
          </div>
        </div>
      </PageHeader>

      {/* Unconfirmed Dimensions Alert Banner */}
      {data.summary.unconfirmed > 0 ? (
        <div className="rounded-lg border border-warn/40 bg-warn/10 p-4 text-xs sm:text-sm text-ink flex items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-warn">Provisional Geometry: </span>
            {data.summary.unconfirmed} tank dimensions have not been confirmed by facility engineers. Level percentages
            and litres are calculated from defaults.
          </div>
          <Link
            href="/admin/nodes"
            className="shrink-0 font-semibold text-warn underline hover:text-warn/80"
          >
            Confirm Dimensions
          </Link>
        </div>
      ) : null}

      {/* 5 Graduated Overhead Tanks Grid */}
      <section aria-label="Tank overview cards">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {data.tanks.map((t) => (
            <TankColumn key={t.id} t={t} asOf={data.asOf} />
          ))}
        </div>
      </section>

      {/* Cross-Tank Comparative Trend */}
      <section aria-label="Multi-tank comparative trends">
        <AllTanksTrend />
      </section>

      {/* Weekly Level Heatmap Analysis */}
      <section aria-label="Weekly water consumption heatmap">
        <WeekHeatmap defaultTankId={data.tanks[0]?.id ?? 1} />
      </section>

      {/* LoRaWAN Hardware Telemetry Health Grid */}
      <section aria-label="Sensor hardware telemetry health">
        <NodeHealthGrid />
      </section>
    </div>
  );
}

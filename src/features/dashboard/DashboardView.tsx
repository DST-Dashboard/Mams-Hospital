"use client";
import Link from "next/link";
import useSWR from "swr";
import { SeverityIcon, FreshnessPill, SimulatedBadge } from "@/components/status/badges";
import { TankSvg } from "@/components/tank/TankSvg";
import { ErrorState, PageHeader, Planned, Skeleton } from "@/components/ui/primitives";
import { fetcher } from "@/lib/api";
import { ago, cm, litres, pct, stamp } from "@/lib/format";
import { useUi } from "@/lib/store";
import type { DashboardData, TankCardData } from "@/lib/types";

function Spark({ points }: { points: TankCardData["spark"] }) {
  const v = points.filter((p) => p.pct != null);
  if (v.length < 2) return <div className="h-8" aria-hidden />;
  const t0 = v[0]!.t, span = v.at(-1)!.t - t0 || 1;
  const d = v.map((p, i) => `${i ? "L" : "M"}${(((p.t - t0) / span) * 100).toFixed(1)} ${(30 - ((p.pct as number) / 100) * 28).toFixed(1)}`).join(" ");
  return <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-full" role="img" aria-label="Last 24 hours of water level"><path d={d} fill="none" stroke="rgb(var(--tide))" strokeWidth="1.5" vectorEffect="non-scaling-stroke" /></svg>;
}

function TankColumn({ t, asOf }: { t: TankCardData; asOf: number }) {
  return (
    <Link href={`/tanks/${t.id}`} className="group flex flex-col gap-3 px-5 py-6 transition-colors hover:bg-surface">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-medium">{t.label}</h2>
        {t.openAlerts > 0 && t.worstSeverity && <span className="flex items-center gap-1 text-xs text-muted"><SeverityIcon severity={t.worstSeverity} />{t.openAlerts}</span>}
      </div>
      <TankSvg pct={t.current.levelPct} thresholds={t.thresholds} severity={t.worstSeverity} label={t.label} litres={litres(t.current.volumeL)} />
      <div>
        <p className="num text-[44px] font-semibold leading-none tracking-tight">{pct(t.current.levelPct)}</p>
        <p className="num mt-1 text-sm text-muted">{litres(t.current.volumeL)} of {litres(t.capacityL)}</p>
        <p className="num text-sm text-muted">Sensor reads {cm(t.current.distanceCm)}</p>
      </div>
      <Spark points={t.spark} />
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <FreshnessPill state={t.freshness} label={ago(t.current.t, asOf)} />
        {t.simulated && <SimulatedBadge />}
      </div>
    </Link>
  );
}

export function DashboardView() {
  const { data, error, mutate } = useSWR<DashboardData>("/api/dashboard", fetcher, { refreshInterval: 30_000 });
  const tz = useUi((s) => s.tz);
  if (error) return <ErrorState message={error.message} onRetry={() => mutate()} />;
  if (!data) return <div className="grid gap-px md:grid-cols-5">{Array.from({ length: 5 }, (_, i) => <Skeleton key={i} className="h-[520px]" />)}</div>;

  return (
    <>
      <PageHeader title="Water tanks"
        sub={data.clockMode === "anchored" ? `Snapshot of the last reading, ${stamp(data.asOf, tz)}. Times are measured from that moment.` : `Live. Updated ${stamp(data.asOf, tz)}.`} />
      {data.alerts.length > 0 && (
        <div role="alert" className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-1 rounded border border-crit/50 bg-crit/10 px-4 py-3 text-sm">
          {data.alerts.slice(0, 3).map((a) => <span key={a.id} className="flex items-center gap-2"><SeverityIcon severity={a.severity} />{a.message}</span>)}
          <Link href="/alerts" className="ml-auto font-medium underline underline-offset-4">View {data.alerts.length} alert{data.alerts.length > 1 ? "s" : ""}</Link>
        </div>
      )}
      {data.summary.unconfirmed > 0 && (
        <p className="mb-6 rounded border hairline bg-surface px-4 py-3 text-sm">
          Tank dimensions haven’t been confirmed, so percentages and litres are provisional and level alerts are paused. <Link href="/admin/nodes" className="font-medium underline underline-offset-4">Confirm dimensions</Link>
        </p>
      )}
      <div className="grid grid-cols-1 divide-y hairline border-y hairline sm:grid-cols-2 sm:divide-y-0 md:grid-cols-3 xl:grid-cols-5 xl:divide-x">
        {data.tanks.map((t) => <TankColumn key={t.id} t={t} asOf={data.asOf} />)}
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <Planned title="Week heatmap" phase="Phase 1" items={["F-03 7 days × 24 hours, click to zoom", "F-05 Day selector", "F-06 Time-range presets"]} />
        <Planned title="All tanks trend" phase="Phase 1" items={["F-04 Brush-drag zoom, synced widgets", "N-05 Cross-tank comparison", "F-09 Node health grid"]} />
      </div>
    </>
  );
}

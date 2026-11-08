"use client";
import clsx from "clsx";
import useSWR from "swr";
import { TrendChart } from "@/components/charts/TrendChart";
import { FreshnessPill, SimulatedBadge } from "@/components/status/badges";
import { TankSvg } from "@/components/tank/TankSvg";
import { ErrorState, PageHeader, Planned, Skeleton } from "@/components/ui/primitives";
import { fetcher } from "@/lib/api";
import { ago, cm, litres, pct, stamp } from "@/lib/format";
import { RANGE_MS, useUi, type RangeKey } from "@/lib/store";
import type { AnalyticsResponse, DashboardData, ReadingsResponse } from "@/lib/types";

const RANGES: RangeKey[] = ["6h", "24h", "7d"];

export function TankDetailView({ id }: { id: number }) {
  const { tz, range, setRange } = useUi();
  const dash = useSWR<DashboardData>("/api/dashboard", fetcher, { refreshInterval: 30_000 });
  const tank = dash.data?.tanks.find((t) => t.id === id);
  const asOf = dash.data?.asOf;
  const q = asOf ? `from=${asOf - RANGE_MS[range]}&to=${asOf}` : null;
  const readings = useSWR<ReadingsResponse>(q ? `/api/readings?tankId=${id}&${q}` : null, fetcher);
  const stats = useSWR<AnalyticsResponse>(q ? `/api/tanks/${id}/analytics?${q}` : null, fetcher);

  if (dash.error) return <ErrorState message={dash.error.message} onRetry={() => dash.mutate()} />;
  if (!dash.data) return <Skeleton className="h-[600px]" />;
  if (!tank || asOf == null) return <ErrorState message="This tank doesn’t exist or was removed." />;
  const s = stats.data;

  return (
    <>
      <PageHeader title={tank.label} sub={<span className="flex flex-wrap items-center gap-3"><FreshnessPill state={tank.freshness} label={`Updated ${ago(tank.current.t, asOf)}`} />{tank.simulated && <SimulatedBadge />}</span>}>
        <div className="flex rounded border hairline p-0.5" role="group" aria-label="Time range">
          {RANGES.map((r) => <button key={r} aria-pressed={range === r} onClick={() => setRange(r)} className={clsx("h-8 rounded px-3 text-sm num", range === r ? "bg-tide text-bg" : "text-muted hover:text-ink")}>{r}</button>)}
        </div>
      </PageHeader>

      <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
        <div>
          <TankSvg pct={tank.current.levelPct} thresholds={tank.thresholds} severity={tank.worstSeverity} label={tank.label} litres={litres(tank.current.volumeL)} />
          <dl className="num mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted">Full</dt><dd className="text-right font-medium">{pct(tank.current.levelPct)}</dd>
            <dt className="text-muted">Volume</dt><dd className="text-right">{litres(tank.current.volumeL)}</dd>
            <dt className="text-muted">Water depth</dt><dd className="text-right">{cm(tank.current.levelCm)}</dd>
            <dt className="text-muted">Sensor reads</dt><dd className="text-right">{cm(tank.current.distanceCm)}</dd>
            <dt className="text-muted">Signal</dt><dd className="text-right">{tank.current.rssi ?? "—"} dBm</dd>
            <dt className="text-muted">Battery</dt><dd className="text-right">{tank.current.batteryPct ?? "—"}%</dd>
          </dl>
        </div>
        <div className="min-w-0">
          {readings.error ? <ErrorState message={readings.error.message} onRetry={() => readings.mutate()} />
            : readings.data ? (readings.data.count ? <TrendChart data={readings.data} thresholds={tank.thresholds} tz={tz} /> : <p className="py-16 text-center text-muted">No readings in this window. Try a longer range.</p>)
            : <Skeleton className="h-80" />}
          <section className="mt-8 grid gap-x-10 gap-y-6 sm:grid-cols-2">
            <div>
              <h2 className="mb-2 font-medium">This window</h2>
              {s ? (
                <dl className="num grid grid-cols-[1fr_auto] gap-y-1 text-sm">
                  <dt className="text-muted">Average level</dt><dd>{s.levelPct ? `${s.levelPct.mean.toFixed(0)}%` : "—"}</dd>
                  <dt className="text-muted">Lowest / highest</dt><dd>{s.levelPct ? `${s.levelPct.min.toFixed(0)}% / ${s.levelPct.max.toFixed(0)}%` : "—"}</dd>
                  <dt className="text-muted">Water used</dt><dd>{litres(s.consumedL)}</dd>
                  <dt className="text-muted">Pumped in</dt><dd>{litres(s.pumpedInL)}</dd>
                  <dt className="text-muted">Readings received</dt><dd>{s.completenessPct}%</dd>
                  <dt className="text-muted">Estimated time to empty</dt><dd>{s.minutesToEmpty == null ? "Not draining" : `${Math.round(s.minutesToEmpty / 60)} h`}</dd>
                </dl>
              ) : <Skeleton className="h-32" />}
            </div>
            <div>
              <h2 className="mb-2 font-medium">Fill and drain events</h2>
              {!s ? <Skeleton className="h-32" /> : s.events.length === 0 ? <p className="text-sm text-muted">No fill or drain events in this window.</p> : (
                <ul className="num max-h-48 space-y-1 overflow-auto text-sm">
                  {s.events.slice(-12).reverse().map((e) => (
                    <li key={e.startT} className="flex justify-between gap-3"><span>{e.kind === "fill" ? "Filled" : "Drained"} {Math.abs(Math.round(e.deltaCm))} cm</span><span className="text-muted">{stamp(e.startT, tz)}</span></li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
      <div className="mt-10"><Planned title="Still to build on this page" phase="Phase 1–2" items={["A-12 Alert history for this tank", "F-10 Signal quality panel", "Raw data inspector (collapsible)", "U-12 CSV export"]} /></div>
    </>
  );
}

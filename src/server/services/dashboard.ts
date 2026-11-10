import { derive, severityRank, DAY, MIN, volumeLitres, type Severity } from "@/domain";
import { rollup } from "@/analytics";
import { clockMode, now } from "../clock";
import * as alerts from "../repos/alerts";
import * as readings from "../repos/readings";
import { listTanks } from "../repos/tanks";

export type Freshness = "fresh" | "stale" | "offline" | "none";
export const freshnessOf = (ageMin: number | null): Freshness => (ageMin == null ? "none" : ageMin <= 10 ? "fresh" : ageMin <= 30 ? "stale" : "offline");

/** One call powers the whole dashboard: no N+1 from the browser. */
export function buildDashboard() {
  const asOf = now();
  const open = alerts.listOpen();
  const tanks = listTanks().map((t) => {
    const last = t.deviceId ? readings.latest(t.deviceId, asOf) : undefined;
    const d = derive(last?.distanceCm, t.geometry);
    const ageMin = last ? Math.round((asOf - last.t) / MIN) : null;
    const spark = t.deviceId
      ? rollup(readings.range(t.deviceId, asOf - DAY, asOf), 15 * MIN).map((b) => ({ t: b.t, pct: derive(b.distanceCm, t.geometry).levelPct }))
      : [];
    const mine = open.filter((a) => a.tankId === t.id);
    const worst = mine.reduce<Severity | null>((w, a) => (w == null || severityRank[a.severity] > severityRank[w] ? a.severity : w), null);
    return {
      id: t.id, label: t.label, zone: t.zone, status: t.status, simulated: t.simulated, dimsConfirmed: t.dimsConfirmed,
      capacityL: Math.round(volumeLitres(t.geometry.shape, t.geometry.heightCm)),
      current: { ...d, t: last?.t ?? null, ageMin, rssi: last?.rssi ?? null, snr: last?.snr ?? null, batteryPct: last?.batteryPct ?? null },
      freshness: freshnessOf(ageMin), thresholds: { warnPct: t.thresholds.warnPct, critPct: t.thresholds.critPct, emptyPct: t.thresholds.emptyPct },
      spark, openAlerts: mine.length, worstSeverity: worst,
    };
  });
  const labels = new Map(tanks.map((t) => [t.id, t.label]));
  return {
    asOf, clockMode: clockMode(), tanks,
    alerts: open.map((a) => ({ ...a, tankLabel: labels.get(a.tankId) ?? `Tank ${a.tankId}` })),
    summary: { total: tanks.length, withAlerts: tanks.filter((t) => t.openAlerts).length, unconfirmed: tanks.filter((t) => !t.dimsConfirmed).length },
  };
}

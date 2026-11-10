import { derive } from "./derive";
import type { Reading, Severity, TankGeometry, Thresholds } from "./types";

export type AlertType =
  | "LOW_LEVEL" | "CRITICAL_LOW" | "EMPTY" | "OVERFLOW_RISK" | "SENSOR_FAULT" | "NO_DATA"
  // Registered for Phase 2 (see docs/ALERTING.md) — evaluators intentionally not implemented yet:
  | "RAPID_DRAIN" | "BATTERY_LOW" | "PREDICTED_EMPTY" | "FLATLINE" | "PUMP_STUCK" | "DATA_GAP" | "GATEWAY_OFFLINE";

export interface RuleResult {
  type: AlertType;
  severity: Severity;
  raise: boolean; // condition met (and persisted) → open an alert if none open
  clear: boolean; // condition cleared (with hysteresis) → resolve the open alert
  message: (tankLabel: string) => string;
  value?: number | null;
}

export interface RuleContext {
  readings: Reading[]; // ascending by t; at least the last `persistence + 5` recommended
  geometry: TankGeometry;
  th: Thresholds;
  now: number; // epoch ms (from the Clock — never Date.now() inside rules)
}

const last = <T,>(a: T[], n: number) => a.slice(Math.max(0, a.length - n));
const median = (a: number[]) => {
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};

/** Pure: same inputs → same outputs. The server's alert engine reconciles results with stored alerts. */
export function evaluateRules(ctx: RuleContext): RuleResult[] {
  const { readings, geometry: g, th, now } = ctx;
  const out: RuleResult[] = [];
  const latest = readings.at(-1);
  const recent = last(readings, th.persistence).map((r) => derive(r.distanceCm, g));
  const d = latest ? derive(latest.distanceCm, g) : null;

  // ── NO_DATA ────────────────────────────────────────────────
  const silentMin = latest ? (now - latest.t) / 60_000 : Infinity;
  out.push({
    type: "NO_DATA", severity: "warning",
    raise: silentMin > th.noDataMin, clear: silentMin <= th.noDataMin,
    value: Number.isFinite(silentMin) ? Math.round(silentMin) : null,
    message: (n) => `${n} silent for ${Number.isFinite(silentMin) ? Math.round(silentMin) : "?"} min — check device`,
  });
  if (!latest || !d) return out;

  // ── SENSOR_FAULT ───────────────────────────────────────────
  //  (a) latest reading is invalid or beyond the tank floor → faulty NOW
  //  (b) the PREVIOUS reading jumped > spikeCm from the recent median and the latest has returned → transient spike.
  //      Judged one reading late on purpose: a real fast refill (e.g. −155 cm in one step) does NOT revert, so it is never flagged.
  const bad = d.quality === "invalid" || d.quality === "out_of_range";
  const n = readings.length;
  const cand = readings[n - 2];
  const prior = readings.slice(Math.max(0, n - 7), n - 2).map((r) => r.distanceCm).filter((x): x is number => x != null);
  let spike = false;
  if (cand?.distanceCm != null && latest.distanceCm != null && prior.length >= 3) {
    const m = median(prior);
    spike = Math.abs(cand.distanceCm - m) > th.spikeCm && Math.abs(latest.distanceCm - m) <= th.spikeCm / 2;
  }
  out.push({
    type: "SENSOR_FAULT", severity: "critical",
    raise: bad || spike, clear: !bad && !spike, value: spike ? (cand?.distanceCm ?? null) : latest.distanceCm,
    message: (nm) => `${nm} sensor reporting an implausible value (${spike ? cand?.distanceCm : (latest.distanceCm ?? "none")} cm)`,
  });
  if (bad) return out; // never derive level alerts from an unusable reading

  // ── Level ladder (exclusive bands so only ONE level alert is open) ──
  const ladder = [
    { type: "LOW_LEVEL" as const, severity: "warning" as const, lo: th.critPct, hi: th.warnPct, word: "below warning threshold" },
    { type: "CRITICAL_LOW" as const, severity: "critical" as const, lo: th.emptyPct, hi: th.critPct, word: "critically low — refill needed" },
    { type: "EMPTY" as const, severity: "emergency" as const, lo: -Infinity, hi: th.emptyPct, word: "nearly empty — immediate action" },
  ];
  const enough = recent.length >= th.persistence;
  for (const b of ladder) {
    const inBand = (p: number | null) => p != null && p >= b.lo && p < b.hi;
    const pct = d.levelPct;
    out.push({
      type: b.type, severity: b.severity,
      raise: enough && recent.every((x) => inBand(x.levelPct)),
      clear: pct != null && (pct >= b.hi + th.hysteresisPct || pct < b.lo),
      value: pct,
      message: (n) => `${n} at ${pct}% — ${b.word}`,
    });
  }

  // ── OVERFLOW_RISK: sensor close to the water surface ──
  const limit = g.deadZoneCm + th.overflowMarginCm;
  out.push({
    type: "OVERFLOW_RISK", severity: "critical",
    raise: enough && last(readings, th.persistence).every((r) => r.distanceCm != null && r.distanceCm <= limit),
    clear: latest.distanceCm != null && latest.distanceCm > limit + 5,
    value: latest.distanceCm,
    message: (n) => `${n} near sensor dead zone (${latest.distanceCm} cm) — possible overflow`,
  });
  return out;
}

export const severityRank: Record<Severity, number> = { info: 0, warning: 1, critical: 2, emergency: 3 };

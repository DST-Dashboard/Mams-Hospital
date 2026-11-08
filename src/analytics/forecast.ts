import type { LevelPoint } from "./events";

/** Least-squares slope (cm per minute) over the points. */
export function slopePerMin(p: LevelPoint[]): number | null {
  if (p.length < 3) return null;
  const t0 = p[0]!.t;
  const xs = p.map((q) => (q.t - t0) / 60_000), ys = p.map((q) => q.v);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) { num += (xs[i]! - mx) * (ys[i]! - my); den += (xs[i]! - mx) ** 2; }
  return den === 0 ? null : num / den;
}

/** Minutes until empty at the current drain rate, or null when level is stable/rising. */
export function minutesToEmpty(recent: LevelPoint[]): number | null {
  const s = slopePerMin(recent);
  const now = recent.at(-1)?.v;
  if (s == null || now == null || s >= -0.01) return null;
  return Math.round(now / -s);
}

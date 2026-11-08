import type { NormalizedUplink } from "./normalize";

export interface SeriesReport {
  deviceId: string; count: number; startT: number; endT: number;
  medianCadenceS: number; gaps: { from: number; to: number; missed: number }[];
  duplicateTimestamps: number; fCntBreaks: number; payloadMismatches: number;
  minDistanceCm: number; maxDistanceCm: number; ok: boolean; problems: string[];
}

/** Input MUST be ascending. A series is "ok" when cadence is steady and counters are continuous. */
export function validateSeries(deviceId: string, rows: NormalizedUplink[], cadenceMs = 300_000, toleranceMs = 15_000): SeriesReport {
  const problems: string[] = [];
  const gaps: SeriesReport["gaps"] = [];
  const deltas: number[] = [];
  let dup = 0, fBreaks = 0;
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1]!, b = rows[i]!, dt = b.t - a.t;
    deltas.push(dt);
    if (dt === 0) dup++;
    else if (dt > cadenceMs + toleranceMs) gaps.push({ from: a.t, to: b.t, missed: Math.round(dt / cadenceMs) - 1 });
    if (a.fCnt != null && b.fCnt != null && b.fCnt !== a.fCnt + 1) fBreaks++;
  }
  const sorted = [...deltas].sort((x, y) => x - y);
  const med = sorted.length ? sorted[Math.floor(sorted.length / 2)]! : 0;
  const mism = rows.filter((r) => r.payloadMatches === false).length;
  if (dup) problems.push(`${dup} duplicate timestamps`);
  if (gaps.length) problems.push(`${gaps.length} gaps (${gaps.reduce((s, g) => s + g.missed, 0)} missed uplinks)`);
  if (fBreaks) problems.push(`${fBreaks} f_cnt breaks`);
  if (mism) problems.push(`${mism} payload/decoder mismatches`);
  if (Math.abs(med - cadenceMs) > toleranceMs) problems.push(`median cadence ${med / 1000}s, expected ${cadenceMs / 1000}s`);
  const d = rows.map((r) => r.distanceCm);
  return {
    deviceId, count: rows.length, startT: rows[0]?.t ?? 0, endT: rows.at(-1)?.t ?? 0,
    medianCadenceS: med / 1000, gaps, duplicateTimestamps: dup, fCntBreaks: fBreaks, payloadMismatches: mism,
    minDistanceCm: Math.min(...d), maxDistanceCm: Math.max(...d), ok: problems.length === 0, problems,
  };
}

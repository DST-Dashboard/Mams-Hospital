import type { Reading } from "@/domain/types";

export interface CompletenessResult {
  expected: number;
  received: number;
  completenessPct: number;
  missing: number;
  gaps: { from: number; to: number; missing: number }[];
}

export function completeness(readings: Reading[], from: number, to: number, cadenceMs = 5 * 60_000): CompletenessResult {
  const points = readings
    .filter((reading) => reading.t >= from && reading.t <= to)
    .sort((a, b) => a.t - b.t);
  const expected = to >= from ? Math.floor((to - from) / cadenceMs) + 1 : 0;
  const gaps: CompletenessResult["gaps"] = [];
  const missing = Math.max(0, expected - points.length);
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1]!;
    const current = points[index]!;
    const absent = Math.max(0, Math.round((current.t - previous.t) / cadenceMs) - 1);
    if (absent > 0) gaps.push({ from: previous.t, to: current.t, missing: absent });
  }
  return {
    expected,
    received: points.length,
    completenessPct: expected ? Math.round((points.length / expected) * 1000) / 10 : 0,
    missing: Math.max(missing, gaps.reduce((sum, gap) => sum + gap.missing, 0)),
    gaps,
  };
}

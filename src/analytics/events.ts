export interface LevelPoint { t: number; v: number } // v = level in cm
export interface TankEvent { kind: "fill" | "drain"; startT: number; endT: number; startLevelCm: number; endLevelCm: number; deltaCm: number }

/**
 * Zig-zag swing detection in LEVEL space. A swing counts only if it moves ≥ thresholdCm,
 * which filters ±1–3 cm sensor noise. Δlevel > 0 ⇒ fill, Δlevel < 0 ⇒ drain.
 */
export function detectEvents(series: LevelPoint[], thresholdCm = 15): TankEvent[] {
  if (series.length < 2) return [];
  const pivots = [0];
  let dir: 0 | 1 | -1 = 0;
  let ext = 0;
  for (let i = 1; i < series.length; i++) {
    const v = series[i]!.v;
    const pv = series[pivots.at(-1)!]!.v;
    if (dir === 0) {
      if (v - pv >= thresholdCm) { dir = 1; ext = i; }
      else if (pv - v >= thresholdCm) { dir = -1; ext = i; }
    } else if (dir === 1) {
      if (v >= series[ext]!.v) ext = i;
      else if (series[ext]!.v - v >= thresholdCm) { pivots.push(ext); dir = -1; ext = i; }
    } else {
      if (v <= series[ext]!.v) ext = i;
      else if (v - series[ext]!.v >= thresholdCm) { pivots.push(ext); dir = 1; ext = i; }
    }
  }
  if (dir !== 0) pivots.push(ext);
  const events: TankEvent[] = [];
  for (let k = 0; k + 1 < pivots.length; k++) {
    const a = series[pivots[k]!]!, b = series[pivots[k + 1]!]!;
    const delta = b.v - a.v;
    if (Math.abs(delta) < thresholdCm) continue;
    events.push({ kind: delta > 0 ? "fill" : "drain", startT: a.t, endT: b.t, startLevelCm: a.v, endLevelCm: b.v, deltaCm: delta });
  }
  return events;
}

/** Litres consumed / pumped in = Σ event swings × base area. Event-based so sensor noise doesn't accumulate. */
export function volumeFromEvents(events: TankEvent[], baseAreaCm2: number) {
  let drainL = 0, fillL = 0;
  for (const e of events) {
    if (e.kind === "drain") drainL += (-e.deltaCm * baseAreaCm2) / 1000;
    else fillL += (e.deltaCm * baseAreaCm2) / 1000;
  }
  return { consumedL: Math.round(drainL), pumpedInL: Math.round(fillL) };
}

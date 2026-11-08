// Dev tool: replays the whole week through the pure rule engine to sanity-check thresholds against real data.
import { evaluateRules, DEFAULT_THRESHOLDS, type Reading, type TankGeometry } from "../src/domain";
import { loadDevices, loadReadings } from "../src/dataset/files";

const g: TankGeometry = { heightCm: 300, deadZoneCm: 25, shape: { kind: "cylinder", radiusCm: 100 } };
for (const d of loadDevices()) {
  const rows: Reading[] = loadReadings(d.deviceId).rows.map((r) => ({ t: r[0]!, distanceCm: r[1] ?? null }));
  const fired = new Map<string, number>();
  for (let i = 12; i < rows.length; i++) {
    for (const r of evaluateRules({ readings: rows.slice(i - 12, i + 1), geometry: g, th: DEFAULT_THRESHOLDS, now: rows[i]!.t }))
      if (r.raise) fired.set(r.type, (fired.get(r.type) ?? 0) + 1);
  }
  console.log(d.deviceId, Object.fromEntries(fired));
}

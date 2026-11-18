import type { Reading } from "../types";

const LOW_BATTERY_PCT = 20;

export function batteryLow(readings: Reading[], now: number) {
  const latest = readings.filter((reading) => reading.t <= now).at(-1);
  const batteryPct = latest?.batteryPct;
  return {
    raise: batteryPct != null && batteryPct < LOW_BATTERY_PCT,
    clear: batteryPct != null && batteryPct >= LOW_BATTERY_PCT,
    batteryPct: batteryPct ?? null,
  };
}

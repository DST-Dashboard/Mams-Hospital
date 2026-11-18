// [BE-09] OWNER: backend
import { describe, expect, it } from "vitest";
import { evaluateRules } from "@/domain/rules";
import { DEFAULT_THRESHOLDS, type AlertType, type Reading, type TankGeometry } from "@/domain";

describe("rules-phase2", () => {
  const now = Date.UTC(2026, 9, 30, 12);
  const geometry: TankGeometry = { heightCm: 300, deadZoneCm: 20, shape: { kind: "cylinder", radiusCm: 100 } };
  const reading = (minutesAgo: number, levelCm: number, extra: Partial<Reading> = {}): Reading => ({
    t: now - minutesAgo * 60_000,
    distanceCm: geometry.heightCm - levelCm,
    ...extra,
  });
  const evaluate = (type: AlertType, readings: Reading[]) =>
    evaluateRules({ readings, geometry, th: DEFAULT_THRESHOLDS, now }).find((rule) => rule.type === type);

  it("RAPID_DRAIN uses level-space deltas", () => {
    const result = evaluate("RAPID_DRAIN", [reading(10, 120), reading(5, 95)]);
    expect(result?.raise).toBe(true);
    expect(result?.value).toBe(25);
  });

  it("PREDICTED_EMPTY fires below 60 minutes to empty", () => {
    const readings = Array.from({ length: 10 }, (_, index) => reading((9 - index) * 5, 100 - index * 10));
    const result = evaluate("PREDICTED_EMPTY", readings);
    expect(result?.raise).toBe(true);
    expect(result?.value).toBeLessThan(60);
  });

  it("FLATLINE fires after six hours below full", () => {
    const readings = Array.from({ length: 7 }, (_, index) => reading((6 - index) * 60, 100));
    expect(evaluate("FLATLINE", readings)?.raise).toBe(true);
    expect(evaluate("FLATLINE", [...readings.slice(0, -1), reading(0, 290)])?.raise).toBe(false);
  });

  it("DATA_GAP fires on a frame-counter skip", () => {
    const result = evaluate("DATA_GAP", [reading(5, 100, { fCnt: 10 }), reading(0, 100, { fCnt: 12 })]);
    expect(result?.raise).toBe(true);
  });

  it("BATTERY_LOW fires below twenty percent", () => {
    const result = evaluate("BATTERY_LOW", [reading(0, 100, { batteryPct: 19 })]);
    expect(result?.raise).toBe(true);
    expect(evaluate("BATTERY_LOW", [reading(0, 100, { batteryPct: 20 })])?.raise).toBe(false);
  });

  it("FLAPPING fires on repeated alternating large level changes", () => {
    const levels = [100, 125, 100, 125, 100, 125];
    const readings = levels.map((level, index) => reading((levels.length - index - 1) * 5, level));
    expect(evaluate("FLAPPING", readings)?.raise).toBe(true);
  });
});

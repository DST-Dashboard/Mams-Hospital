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

  it("PREDICTED_EMPTY fires below 60 minutes to empty", () => {
    const readings = Array.from({ length: 10 }, (_, index) => reading((9 - index) * 5, 100 - index * 10));
    const result = evaluate("PREDICTED_EMPTY", readings);
    expect(result?.raise).toBe(true);
    expect(result?.value).toBeLessThan(60);
  });

  it("BATTERY_LOW fires at or below twenty percent", () => {
    const result = evaluate("BATTERY_LOW", [reading(0, 100, { batteryPct: 20 })]);
    expect(result?.raise).toBe(true);
    expect(evaluate("BATTERY_LOW", [reading(0, 100, { batteryPct: 21 })])?.raise).toBe(false);
  });

  it("FLAPPING fires on repeated alternating large level changes", () => {
    const levels = [100, 125, 100, 125, 100, 125];
    const readings = levels.map((level, index) => reading((levels.length - index - 1) * 5, level));
    expect(evaluate("FLAPPING", readings)?.raise).toBe(true);
  });
});

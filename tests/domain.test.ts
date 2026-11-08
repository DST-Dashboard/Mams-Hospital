import { describe, expect, it } from "vitest";
import { derive, distanceForPct, evaluateRules, DEFAULT_THRESHOLDS, type Reading, type TankGeometry } from "@/domain";

const g: TankGeometry = { heightCm: 300, deadZoneCm: 25, shape: { kind: "cylinder", radiusCm: 100 } };
const mk = (ds: (number | null)[], t0 = 0): Reading[] => ds.map((d, i) => ({ t: t0 + i * 300_000, distanceCm: d }));

describe("derive — the worked example from the project definition", () => {
  it("202 cm on a 300 cm × R100 tank = 98 cm, 32.7 %, 3,079 L", () => {
    const d = derive(202, g);
    expect(d).toMatchObject({ levelCm: 98, levelPct: 32.7, volumeL: 3079, quality: "ok" });
  });
  it("bigger distance means less water", () => expect(derive(250, g).levelCm!).toBeLessThan(derive(100, g).levelCm!));
  it("never invents a level for bad input", () => {
    for (const bad of [null, undefined, -3, NaN]) expect(derive(bad as number, g)).toMatchObject({ levelCm: null, levelPct: null, volumeL: null, quality: "invalid" });
    expect(derive(310, g)).toMatchObject({ levelCm: null, quality: "out_of_range" });
  });
  it("flags the sensor dead zone", () => expect(derive(10, g).quality).toBe("dead_zone"));
  it("rectangular tanks", () => expect(derive(200, { ...g, shape: { kind: "rectangle", widthCm: 100, lengthCm: 200 } }).volumeL).toBe(2000));
  it("distanceForPct inverts derive", () => expect(derive(distanceForPct(40, g), g).levelPct).toBe(40));
});

describe("rules", () => {
  const run = (ds: (number | null)[], now?: number) => evaluateRules({ readings: mk(ds), geometry: g, th: DEFAULT_THRESHOLDS, now: now ?? (ds.length - 1) * 300_000 });
  const get = (r: ReturnType<typeof run>, type: string) => r.find((x) => x.type === type)!;

  it("needs 3 consecutive low readings (persistence) before raising", () => {
    expect(get(run([100, 100, 190, 190]), "LOW_LEVEL").raise).toBe(false);
    expect(get(run([100, 190, 190, 190]), "LOW_LEVEL").raise).toBe(true); // 190 cm distance → 36.7 %
  });
  it("level ladder is exclusive: critical band does not also raise LOW_LEVEL", () => {
    const r = run([250, 250, 250, 250]); // 16.7 %
    expect(get(r, "CRITICAL_LOW").raise).toBe(true);
    expect(get(r, "LOW_LEVEL").raise).toBe(false);
  });
  it("hysteresis: LOW_LEVEL stays open at 41 % and clears only above 45 %", () => {
    expect(get(run([100, 100, 100, 177]), "LOW_LEVEL").clear).toBe(false); // 41 %
    expect(get(run([100, 100, 100, 160]), "LOW_LEVEL").clear).toBe(true); // 46.7 %
  });
  it("a fast refill (−155 cm in one step) is NOT a sensor fault", () => {
    expect(get(run([275, 275, 275, 275, 120, 120]), "SENSOR_FAULT").raise).toBe(false);
  });
  it("a transient spike that reverts IS a sensor fault", () => {
    expect(get(run([236, 236, 236, 236, 236, 109, 236]), "SENSOR_FAULT").raise).toBe(true);
  });
  it("beyond the tank floor is a fault and suppresses level alerts", () => {
    const r = run([200, 200, 200, 400]);
    expect(get(r, "SENSOR_FAULT").raise).toBe(true);
    expect(r.find((x) => x.type === "LOW_LEVEL")).toBeUndefined();
  });
  it("NO_DATA when silent beyond the limit", () => expect(get(run([200], 20 * 60_000), "NO_DATA").raise).toBe(true));
});

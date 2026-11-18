import { describe, expect, it } from "vitest";
import {
  detectEvents, describe as stats, minutesToEmpty, rollup, volumeFromEvents, heatmap,
  compareTanks, detectAnomalies, completeness, detectNightDrain, waterCost,
} from "@/analytics";
import type { Reading, TankGeometry } from "@/domain";

const pts = (vs: number[]) => vs.map((v, i) => ({ t: i * 300_000, v }));
const geometry: TankGeometry = { heightCm: 300, deadZoneCm: 20, shape: { kind: "cylinder", radiusCm: 100 } };
describe("events (level space: Δ>0 = filling)", () => {
  it("finds a drain then a fill and ignores ±2 cm noise", () => {
    const e = detectEvents(pts([200, 201, 199, 150, 100, 101, 99, 180, 200, 199]), 15);
    expect(e.map((x) => x.kind)).toEqual(["drain", "fill"]);
    expect(e[0]!.deltaCm).toBe(-101);
  });
  it("pure noise yields no events", () => expect(detectEvents(pts([100, 102, 99, 101, 100, 103, 98]), 15)).toEqual([]));
  it("litres come from swings, not noisy steps", () => expect(volumeFromEvents(detectEvents(pts([200, 100]), 15), 31_416).consumedL).toBe(3142));
});
it("rollup averages distance and skips nulls", () => {
  const b = rollup([{ t: 0, distanceCm: 100 }, { t: 1000, distanceCm: 200 }, { t: 2000, distanceCm: null }], 60_000);
  expect(b).toHaveLength(1); expect(b[0]).toMatchObject({ distanceCm: 150, n: 2 });
});
it("describe + forecast", () => {
  expect(stats([1, 2, 3, 4, 5])).toMatchObject({ mean: 3, min: 1, max: 5, p50: 3 });
  expect(minutesToEmpty(pts([100, 90, 80, 70, 60]))).toBe(Math.round(60 / (10 / 5)));
  expect(minutesToEmpty(pts([50, 50, 50, 50]))).toBeNull();
});
it("heatmap creates a complete Monday-first local-time grid", () => {
  const t = Date.UTC(2026, 0, 5, 18, 30);
  const result = heatmap([{ t, distanceCm: 150 }], geometry, t, t, "IST");
  expect(result).toHaveLength(168);
  expect(result.find((cell) => cell.dow === 1 && cell.hour === 0)).toMatchObject({ avgPct: 50, minPct: 50, n: 1 });
});
it("compare normalizes bucketed tank level and computes fill/drain volumes", () => {
  const readings: Reading[] = [
    { t: 0, distanceCm: 200 },
    { t: 5 * 60_000, distanceCm: 170 },
    { t: 10 * 60_000, distanceCm: 200 },
  ];
  const [result] = compareTanks([{ tankId: 1, label: "Tank 1", simulated: false, geometry, readings }], 0, 15 * 60_000, "1h");
  expect(result).toMatchObject({ currentPct: 33.3, meanPct: 36.6, trend: "stable", series: [{ t: 0, pct: 36.6 }] });
  expect(result?.consumedL).toBeGreaterThan(0);
  expect(result?.pumpedInL).toBeGreaterThan(0);
});
it("detects rolling outliers and reports expected reading gaps", () => {
  expect(detectAnomalies([...pts([10, 10, 10]), { t: 900_000, v: 100 }], 3, 3)).toHaveLength(1);
  const samples: Reading[] = [{ t: 0, distanceCm: 10 }, { t: 10 * 60_000, distanceCm: 12 }];
  expect(completeness(samples, 0, 10 * 60_000)).toMatchObject({ expected: 3, received: 2, completenessPct: 66.7, missing: 1 });
});
it("flags substantial overnight water losses and computes rupee estimates only with a configured rate", () => {
  const first = Date.UTC(2026, 0, 5, 18, 30);
  expect(detectNightDrain([{ t: first, v: 200 }, { t: first + 30 * 60_000, v: 170 }], first, first + 30 * 60_000)).toHaveLength(1);
  expect(waterCost(1000, 0.02)).toEqual({ consumedL: 1000, ratePerLitre: 0.02, estimatedCost: 20 });
  expect(waterCost(1000, null).estimatedCost).toBeNull();
});

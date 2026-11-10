import { describe, expect, it } from "vitest";
import { detectEvents, describe as stats, minutesToEmpty, rollup, volumeFromEvents } from "@/analytics";

const pts = (vs: number[]) => vs.map((v, i) => ({ t: i * 300_000, v }));
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

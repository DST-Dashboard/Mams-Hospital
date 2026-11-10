import { describe, it, expect } from "vitest";
import {
  buildSeries,
  minMax,
  downsample,
  inferPump,
  isUnstable,
  weekRange,
  UNSTABLE_EVENT_COUNT,
} from "@/lib/series";

describe("fe-series: buildSeries & gaps", () => {
  const win = { from: 1000, to: 5000 };

  it("filters points to the window and sorts by timestamp", () => {
    const raw = [
      { t: 6000, levelPct: 50 },
      { t: 2000, levelPct: 30 },
      { t: 500, levelPct: 10 },
      { t: 3000, levelPct: 40 },
    ];
    const s = buildSeries(raw, win, 1000);
    expect(s.map((p) => p.t)).toEqual([2000, 3000]);
  });

  it("inserts null gaps when delta t > 2x cadence", () => {
    const raw = [
      { t: 1000, levelPct: 50 },
      { t: 4000, levelPct: 55 }, // gap = 3000 > 2 * 1000
    ];
    const s = buildSeries(raw, win, 1000);
    expect(s.length).toBe(3);
    expect(s[0]!.pct).toBe(50);
    expect(s[1]!.pct).toBeNull(); // Gap sentinel
    expect(s[1]!.t).toBe(2000);
    expect(s[2]!.pct).toBe(55);
  });

  it("never zero-fills missing data", () => {
    const raw = [{ t: 2000, levelPct: null }];
    const s = buildSeries(raw, win, 1000);
    expect(s[0]!.pct).toBeNull();
    expect(s[0]!.pct).not.toBe(0);
  });
});

describe("fe-series: minMax & downsample", () => {
  it("computes min and max while ignoring nulls", () => {
    const pts = [
      { pct: null },
      { pct: 45 },
      { pct: 12 },
      { pct: 89 },
      { pct: null },
    ];
    expect(minMax(pts)).toEqual({ min: 12, max: 89 });
  });

  it("downsamples using LTTB when threshold is exceeded", () => {
    const pts = Array.from({ length: 3000 }, (_, i) => ({
      t: i * 100,
      pct: Math.sin(i / 10) * 50 + 50,
    }));
    const res = downsample(pts, 500);
    expect(res.length).toBe(500);
    expect(res[0]!.t).toBe(0);
    expect(res[res.length - 1]!.t).toBe(pts[pts.length - 1]!.t);
  });
});

describe("fe-series: inferPump & isUnstable", () => {
  const asOf = 100_000_000;

  it("infers filling when fill event ended within 15 min of asOf", () => {
    const events = [
      { kind: "fill" as const, startT: asOf - 30 * 60 * 1000, endT: asOf - 5 * 60 * 1000 },
    ];
    const pump = inferPump(events, asOf);
    expect(pump.state).toBe("filling");
    expect(pump.label).toContain("Filling");
  });

  it("infers idle when latest fill event ended long ago", () => {
    const events = [
      { kind: "fill" as const, startT: asOf - 60 * 60 * 1000, endT: asOf - 45 * 60 * 1000 },
    ];
    const pump = inferPump(events, asOf);
    expect(pump.state).toBe("idle");
    expect(pump.label).toContain("Idle");
  });

  it("detects flapping/unstable signal (>40 events)", () => {
    const fewEvents = Array.from({ length: 10 }, () => ({ kind: "fill" }));
    const manyEvents = Array.from({ length: UNSTABLE_EVENT_COUNT + 1 }, () => ({ kind: "fill" }));
    expect(isUnstable(fewEvents)).toBe(false);
    expect(isUnstable(manyEvents)).toBe(true);
  });

  it("computes week range rounded", () => {
    const pts = [{ pct: 31.4 }, { pct: 48.6 }];
    expect(weekRange(pts)).toEqual({ minPct: 31, maxPct: 49 });
  });
});

import { describe, expect, it } from "vitest";
import {
  baseOption,
  colorIndexOf,
  fullAxis,
  scales,
  thresholdMarkLines,
} from "../src/components/charts/chart-theme";

describe("fe-chart-theme", () => {
  it("colorIndexOf produces stable 1-based index 1..8", () => {
    expect(colorIndexOf(1)).toBe(1);
    expect(colorIndexOf(2)).toBe(2);
    expect(colorIndexOf(8)).toBe(8);
    expect(colorIndexOf(9)).toBe(1);
    expect(colorIndexOf(10)).toBe(2);
  });

  it("scales contains 9 stops each for thermal, balance, amp", () => {
    expect(scales.thermal.length).toBe(9);
    expect(scales.balance.length).toBe(9);
    expect(scales.amp.length).toBe(9);
  });

  it("thresholdMarkLines generates Warning, Critical, and Emergency levels", () => {
    const lines = thresholdMarkLines({ warnPct: 40, critPct: 20, emptyPct: 5 });
    expect(lines.data.length).toBe(3);
    expect(lines.data[0]?.yAxis).toBe(40);
    expect(lines.data[1]?.yAxis).toBe(20);
    expect(lines.data[2]?.yAxis).toBe(5);
  });

  it("fullAxis pins time range min and max", () => {
    const axis = fullAxis({ from: 1000, to: 5000 });
    expect(axis.type).toBe("time");
    expect(axis.min).toBe(1000);
    expect(axis.max).toBe(5000);
  });

  it("baseOption produces expected defaults", () => {
    const opt = baseOption("Test Chart");
    expect(opt.animation).toBe(false);
    expect(opt.title).toBeDefined();
    expect(opt.tooltip).toBeDefined();
  });
});


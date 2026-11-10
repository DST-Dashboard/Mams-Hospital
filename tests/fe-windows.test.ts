import { describe, expect, it } from "vitest";
import {
  calendarDays,
  DAY,
  dayWindow,
  HOUR,
  parseScope,
  resolutionFor,
  serializeScope,
  weekWindow,
  windowForCalendarDay,
} from "../src/lib/windows";

describe("fe-windows window and time math", () => {
  const asOf = 1730286780000; // 30 Oct 11:13 IST

  it("dayWindow returns exact 24h span ending at asOf", () => {
    const w = dayWindow(asOf);
    expect(w.to).toBe(asOf);
    expect(w.from).toBe(asOf - DAY);
    expect(w.to - w.from).toBe(24 * HOUR);
  });

  it("weekWindow returns exact 7d span ending at asOf", () => {
    const w = weekWindow(asOf);
    expect(w.to).toBe(asOf);
    expect(w.from).toBe(asOf - 7 * DAY);
    expect(w.to - w.from).toBe(7 * DAY);
  });

  it("resolutionFor follows the O2 resolution rules", () => {
    // <= 36 h -> raw
    expect(resolutionFor({ from: 0, to: 36 * HOUR })).toBe("raw");
    expect(resolutionFor({ from: 0, to: 24 * HOUR })).toBe("raw");

    // > 36 h and <= 30 d -> 1h
    expect(resolutionFor({ from: 0, to: 37 * HOUR })).toBe("1h");
    expect(resolutionFor({ from: 0, to: 7 * DAY })).toBe("1h");
    expect(resolutionFor({ from: 0, to: 30 * DAY })).toBe("1h");

    // > 30 d -> 1d
    expect(resolutionFor({ from: 0, to: 31 * DAY })).toBe("1d");
  });

  it("calendarDays computes day items with partial flags at boundaries", () => {
    // Oct 23 11:16 IST to Oct 30 11:13 IST
    const startT = 1729662360000;
    const endT = 1730266980000;
    const days = calendarDays(startT, endT, "IST");

    expect(days.length).toBeGreaterThan(0);
    // Boundary days must be flagged as partial
    expect(days[0]?.partial).toBe(true);
    expect(days[days.length - 1]?.partial).toBe(true);

    // Mid days are not partial
    if (days.length > 2) {
      expect(days[1]?.partial).toBe(false);
    }
  });

  it("windowForCalendarDay returns midnight-to-midnight for that timezone", () => {
    const w = windowForCalendarDay("2026-10-26", "IST");
    expect(w.to - w.from).toBe(DAY);
  });

  it("parseScope and serializeScope round-trip state correctly", () => {
    const scope = {
      tank: 3,
      day: "2026-10-28",
      from: 1730000000000,
      to: 1730050000000,
    };
    const query = serializeScope(scope);
    const parsed = parseScope(new URLSearchParams(query));

    expect(parsed.tank).toBe(3);
    expect(parsed.day).toBe("2026-10-28");
    expect(parsed.from).toBe(scope.from);
    expect(parsed.to).toBe(scope.to);
  });
});


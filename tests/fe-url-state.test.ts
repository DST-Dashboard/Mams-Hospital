import { describe, it, expect } from "vitest";
import { readScope, writeScope, updateScopeUrl } from "@/lib/url-state";

describe("fe-url-state: parsing and serializing", () => {
  it("parses valid scope from URL search string", () => {
    const qs = "?tank=2&day=2026-10-26&from=2026-10-25T00:00:00.000Z&to=2026-10-26T00:00:00.000Z";
    const scope = readScope(qs);
    expect(scope.tank).toBe(2);
    expect(scope.day).toBe("2026-10-26");
    expect(scope.from).toBe(Date.parse("2026-10-25T00:00:00.000Z"));
    expect(scope.to).toBe(Date.parse("2026-10-26T00:00:00.000Z"));
  });

  it("handles presets like last24h, 1h, 6h, 24h", () => {
    const s1 = readScope("?day=last24h");
    expect(s1.day).toBe("last24h");
    const s2 = readScope("?day=6h");
    expect(s2.day).toBe("6h");
  });

  it("falls back safely on invalid values", () => {
    const scope = readScope("?tank=invalid&day=not-a-day&from=garbage&to=invalid");
    expect(scope.tank).toBeUndefined();
    expect(scope.day).toBeUndefined();
    expect(scope.from).toBeUndefined();
    expect(scope.to).toBeUndefined();
  });

  it("swaps from and to if inverted", () => {
    const scope = readScope("?from=2026-10-28T00:00:00.000Z&to=2026-10-25T00:00:00.000Z");
    expect(scope.from).toBe(Date.parse("2026-10-25T00:00:00.000Z"));
    expect(scope.to).toBe(Date.parse("2026-10-28T00:00:00.000Z"));
  });

  it("round-trips scope reliably", () => {
    const original = {
      tank: 3,
      day: "2026-10-27",
      from: Date.parse("2026-10-27T00:00:00.000Z"),
      to: Date.parse("2026-10-27T23:59:59.000Z"),
    };
    const qs = writeScope(original);
    const parsed = readScope(qs);
    expect(parsed).toEqual(original);
  });

  it("updates scope URL partially", () => {
    const initial = "?tank=1&day=last24h";
    const next = updateScopeUrl(initial, { day: "2026-10-26" });
    const parsed = readScope(next);
    expect(parsed.tank).toBe(1);
    expect(parsed.day).toBe("2026-10-26");
  });
});


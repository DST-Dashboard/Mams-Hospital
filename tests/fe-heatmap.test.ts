import { describe, it, expect } from "vitest";
import { aggregateHeatmap } from "@/lib/heatmap";
import { calendarDays } from "@/lib/windows";

describe("fe-heatmap: aggregation & timezone boundary", () => {
  const startT = Date.UTC(2026, 9, 23, 5, 46); // 23 Oct 11:16 IST
  const endT = Date.UTC(2026, 9, 30, 5, 43);   // 30 Oct 11:13 IST
  const days = calendarDays(startT, endT, "IST");

  it("produces rows for each calendar day touched", () => {
    const grid = aggregateHeatmap([], "IST", days);
    expect(grid.days.length).toBe(days.length);
    expect(grid.days[0]!.label).toContain("(partial)");
  });

  it("leaves hours without data as null (never 0)", () => {
    const grid = aggregateHeatmap([], "IST", days);
    expect(grid.cells.length).toBe(days.length * 24);
    for (const cell of grid.cells) {
      expect(cell.pct).toBeNull();
      expect(cell.count).toBe(0);
    }
  });

  it("places readings into correct hour bucket in IST", () => {
    // 26 Oct 14:05 IST = 26 Oct 08:35 UTC
    const pointT = Date.UTC(2026, 9, 26, 8, 35);
    const grid = aggregateHeatmap([{ t: pointT, levelPct: 62.4 }], "IST", days);

    const oct26Cell = grid.cells.find((c) => c.dayKey === "2026-10-26" && c.hour === 14);
    expect(oct26Cell).toBeDefined();
    expect(oct26Cell!.pct).toBe(62.4);
    expect(oct26Cell!.count).toBe(1);

    // Other hours of 26 Oct remain null
    const oct26Other = grid.cells.find((c) => c.dayKey === "2026-10-26" && c.hour === 15);
    expect(oct26Other!.pct).toBeNull();
  });

  it("calculates minPct and maxPct correctly", () => {
    const t1 = Date.UTC(2026, 9, 26, 8, 35); // 14:05 IST
    const t2 = Date.UTC(2026, 9, 26, 9, 35); // 15:05 IST
    const grid = aggregateHeatmap(
      [
        { t: t1, levelPct: 40 },
        { t: t2, levelPct: 80 },
      ],
      "IST",
      days
    );
    expect(grid.minPct).toBe(40);
    expect(grid.maxPct).toBe(80);
  });
});


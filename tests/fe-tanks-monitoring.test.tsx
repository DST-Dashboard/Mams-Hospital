// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { TankSvg, tankStateOf } from "@/components/tank/TankSvg";
import { StatsGrid } from "@/features/tank-detail/StatsGrid";
import { DaySelector } from "@/features/time-nav/DaySelector";

afterEach(() => {
  cleanup();
});

// Mock SWR and API
vi.mock("@/lib/hooks", () => ({
  useAnalytics: () => ({ data: null }),
  useMe: () => ({ data: { role: "admin", name: "Admin" } }),
}));

describe("TankSvg: states and accessibility", () => {
  it("renders correct spoken aria-label in ok state", () => {
    render(
      <TankSvg
        shape="cylinder"
        levelPct={65.2}
        distanceCm={104}
        heightCm={300}
        deadZoneCm={25}
        label="Tank 1"
        litres={5600}
        state="ok"
      />
    );
    const svg = screen.getByRole("img");
    expect(svg).toBeDefined();
    expect(svg.getAttribute("aria-label")).toContain("Tank 1: 65 percent full");
    expect(svg.getAttribute("aria-label")).toContain("5600 litres");
    expect(svg.getAttribute("aria-label")).toContain("status ok");
  });

  it("renders question mark and dashed vessel for fault state without numbers", () => {
    render(
      <TankSvg
        shape="cylinder"
        levelPct={null}
        distanceCm={null}
        heightCm={300}
        deadZoneCm={25}
        label="Tank 5"
        state="fault"
      />
    );
    const svg = screen.getByRole("img");
    expect(svg.getAttribute("aria-label")).toContain("no reading");
    expect(svg.getAttribute("aria-label")).toContain("status fault");
    expect(svg.innerHTML).toContain("?");
  });

  it("handles rectangle shape geometry", () => {
    const { container } = render(
      <TankSvg
        shape="rectangle"
        levelPct={86}
        distanceCm={40}
        heightCm={200}
        deadZoneCm={25}
        label="Tank 4"
        state="ok"
      />
    );
    expect(container.querySelector(".tank-body-rectangle")).toBeDefined();
  });
});

describe("tankStateOf: state mapping", () => {
  it("identifies maintenance and draft status", () => {
    expect(tankStateOf({ status: "maintenance" })).toBe("maintenance");
    expect(tankStateOf({ status: "draft" })).toBe("draft");
  });

  it("identifies critical and emergency thresholds", () => {
    const card = {
      status: "active" as const,
      thresholds: { warnPct: 40, critPct: 20, emptyPct: 5 },
      current: { levelPct: 15, distanceCm: 250, quality: "good", ageMin: 2 } as any,
    };
    expect(tankStateOf(card)).toBe("critical");

    const emgCard = {
      ...card,
      current: { levelPct: 3, distanceCm: 290, quality: "good", ageMin: 2 } as any,
    };
    expect(tankStateOf(emgCard)).toBe("emergency");
  });
});

describe("DaySelector: calendar selection", () => {
  const days = [
    { key: "2026-10-23", label: "Fri 23 Oct", from: 1, to: 2, partial: true },
    { key: "2026-10-24", label: "Sat 24 Oct", from: 2, to: 3, partial: false },
  ];

  it("renders buttons for rolling 24h and calendar days", () => {
    render(<DaySelector days={days} selectedKey="last24h" onSelectDay={() => {}} />);
    expect(screen.getByRole("radio", { name: /last 24h/i })).toBeDefined();
    expect(screen.getByRole("radio", { name: /Fri 23 Oct/i })).toBeDefined();
  });
});

describe("StatsGrid: Day | Week display and flapping suppression", () => {
  it("suppresses litres when event count exceeds 40", () => {
    const flappingEvents = Array.from({ length: 45 }, () => ({
      kind: "fill" as const,
      startT: 1,
      endT: 2,
      startLevelCm: 100,
      endLevelCm: 150,
      deltaCm: 50,
    }));

    render(
      <StatsGrid
        dayAnalytics={{
          samples: 288,
          validSamples: 288,
          completenessPct: 100,
          consumedL: 5000,
          pumpedInL: 6000,
          minutesToEmpty: null,
          levelPct: { mean: 60, min: 40, max: 80, std: 10, p10: 45, p50: 60, p90: 75 },
          events: flappingEvents,
        }}
      />
    );

    expect(screen.getByText(/Unstable signal/i)).toBeDefined();
  });
});

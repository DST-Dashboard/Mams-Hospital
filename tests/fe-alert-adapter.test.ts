import { describe, it, expect } from "vitest";
import { normalizeAlert } from "@/features/alerts/adapter";
import type { AlertRow } from "@/lib/types";
import type { AlertDTO } from "@/contracts/alerts";

describe("fe-alert-adapter", () => {
  it("normalizes a live AlertRow and joins tankLabel from map", () => {
    const row: AlertRow = {
      id: 101,
      tankId: 2,
      type: "CRITICAL_LOW",
      severity: "critical",
      state: "active",
      message: "Tank 2 at 18 % — refill needed",
      value: 18,
      openedAt: 1730268780000,
      acknowledgedAt: null,
      ackNote: null,
      resolvedAt: null,
      triggerT: 1730268780000,
      triggerDistanceCm: 246,
      simulated: true,
    };

    const normalized = normalizeAlert(row, { 2: "Rooftop Tank 2" });
    expect(normalized.id).toBe(101);
    expect(normalized.tankLabel).toBe("Rooftop Tank 2");
    expect(normalized.state).toBe("active");
    expect(normalized.severity).toBe("critical");
    expect(normalized.triggerDistanceCm).toBe(246);
    expect(normalized.snoozedUntil).toBeNull();
    expect(normalized.acknowledgedByName).toBeNull();
  });

  it("normalizes an AlertDTO with existing tankLabel", () => {
    const dto: AlertDTO = {
      id: 102,
      tankId: 3,
      tankLabel: "Emergency Tank 3",
      type: "EMPTY",
      severity: "emergency",
      state: "acknowledged",
      message: "Tank 3 empty",
      value: 4,
      openedAt: 1730268000000,
      acknowledgedAt: 1730268100000,
      ackNote: "Dispatched staff",
      resolvedAt: null,
      snoozedUntil: null,
      simulated: false,
    };

    const normalized = normalizeAlert(dto);
    expect(normalized.id).toBe(102);
    expect(normalized.tankLabel).toBe("Emergency Tank 3");
    expect(normalized.state).toBe("acknowledged");
    expect(normalized.severity).toBe("emergency");
    expect(normalized.ackNote).toBe("Dispatched staff");
  });
});


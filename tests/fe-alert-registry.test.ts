import { describe, it, expect } from "vitest";
import { ALERT_TYPE_REGISTRY, PHASE_1_ALERT_TYPES } from "@/features/alerts/registry";

describe("fe-alert-registry", () => {
  it("contains all 13 spec alert types", () => {
    const keys = Object.keys(ALERT_TYPE_REGISTRY);
    expect(keys.length).toBe(13);
    expect(keys).toContain("LOW_LEVEL");
    expect(keys).toContain("CRITICAL_LOW");
    expect(keys).toContain("EMPTY");
    expect(keys).toContain("OVERFLOW_RISK");
    expect(keys).toContain("SENSOR_FAULT");
    expect(keys).toContain("NO_DATA");
    expect(keys).toContain("BATTERY_LOW");
    expect(keys).toContain("RAPID_DRAIN");
    expect(keys).toContain("PREDICTED_EMPTY");
    expect(keys).toContain("GATEWAY_OFFLINE");
    expect(keys).toContain("FLATLINE");
    expect(keys).toContain("PUMP_STUCK");
    expect(keys).toContain("DATA_GAP");
  });

  it("filters to exactly 6 Phase 1 types for operational filtering", () => {
    expect(PHASE_1_ALERT_TYPES.length).toBe(6);
    const p1Names = PHASE_1_ALERT_TYPES.map((t) => t.type);
    expect(p1Names).toEqual([
      "LOW_LEVEL",
      "CRITICAL_LOW",
      "EMPTY",
      "OVERFLOW_RISK",
      "SENSOR_FAULT",
      "NO_DATA",
    ]);
  });

  it("verifies level severity mappings", () => {
    expect(ALERT_TYPE_REGISTRY.LOW_LEVEL?.level).toBe("warning");
    expect(ALERT_TYPE_REGISTRY.CRITICAL_LOW?.level).toBe("critical");
    expect(ALERT_TYPE_REGISTRY.EMPTY?.level).toBe("emergency");
    expect(ALERT_TYPE_REGISTRY.OVERFLOW_RISK?.level).toBe("critical");
    expect(ALERT_TYPE_REGISTRY.SENSOR_FAULT?.level).toBe("critical");
    expect(ALERT_TYPE_REGISTRY.NO_DATA?.level).toBe("warning");
  });
});


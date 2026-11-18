import { describe, it, expect } from "vitest";
import {
  canAcknowledgeAlerts,
  canMutateTanks,
  canAccessAdmin,
  canAccessSettings,
  getVisibleTabs,
} from "@/lib/roles";

describe("fe-roles", () => {
  it("enforces alert acknowledgement permissions", () => {
    expect(canAcknowledgeAlerts("viewer")).toBe(false);
    expect(canAcknowledgeAlerts(null)).toBe(false);
    expect(canAcknowledgeAlerts("operator")).toBe(true);
    expect(canAcknowledgeAlerts("admin")).toBe(true);
  });

  it("enforces tank mutation permissions (Admin only)", () => {
    expect(canMutateTanks("viewer")).toBe(false);
    expect(canMutateTanks("operator")).toBe(false);
    expect(canMutateTanks("admin")).toBe(true);
  });

  it("enforces admin workspace access", () => {
    expect(canAccessAdmin("viewer")).toBe(false);
    expect(canAccessAdmin("operator")).toBe(false);
    expect(canAccessAdmin("admin")).toBe(true);
  });

  it("enforces settings workspace access", () => {
    expect(canAccessSettings("viewer")).toBe(false);
    expect(canAccessSettings("operator")).toBe(true);
    expect(canAccessSettings("admin")).toBe(true);
  });

  it("returns correct visible tabs per role", () => {
    expect(getVisibleTabs("viewer")).toEqual(["overview", "tank", "analytics", "alerts"]);
    expect(getVisibleTabs("operator")).toEqual(["overview", "tank", "analytics", "alerts", "settings"]);
    expect(getVisibleTabs("admin")).toEqual([
      "overview",
      "tank",
      "analytics",
      "alerts",
      "settings",
      "admin",
    ]);
  });
});


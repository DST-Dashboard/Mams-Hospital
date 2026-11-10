import { describe, expect, it } from "vitest";
import { ApiError, tankToInput } from "../src/lib/api";
import type { TankRow } from "../src/lib/types";

describe("fe-api error mapping and tankToInput payload generator", () => {
  it("ApiError.fieldErrors parses array of validation error details", () => {
    const err = new ApiError(400, "Invalid input", [
      { path: ["label"], message: "Label is required" },
      { path: ["geometry", "heightCm"], message: "Height must be greater than 0" },
    ]);

    const fields = err.fieldErrors();
    expect(fields["label"]).toBe("Label is required");
    expect(fields["geometry.heightCm"]).toBe("Height must be greater than 0");
  });

  it("ApiError.fieldErrors returns empty object when details is absent", () => {
    const err = new ApiError(500, "Internal error");
    expect(err.fieldErrors()).toEqual({});
  });

  it("tankToInput generates a complete TankInput object from TankRow", () => {
    const mockRow: TankRow = {
      id: 1,
      deviceId: "2cf7f1c044300001",
      label: "Tank 1 — Main Wing",
      zone: "Main Block",
      location: "Rooftop North",
      status: "active",
      geometry: {
        heightCm: 300,
        deadZoneCm: 25,
        shape: {
          kind: "cylinder",
          radiusCm: 100,
        },
      },
      thresholds: {
        warnPct: 40,
        critPct: 20,
        emptyPct: 5,
        overflowMarginCm: 10,
        persistence: 3,
        cooldownMin: 30,
        hysteresisPct: 2,
        noDataMin: 15,
        spikeCm: 50,
      },
      dimsConfirmed: false,
      simulated: false,
      deletedAt: null,
    };

    const input = tankToInput(mockRow, { dimsConfirmed: true });
    expect(input.label).toBe("Tank 1 — Main Wing");
    expect(input.deviceId).toBe("2cf7f1c044300001");
    expect(input.shape).toBe("cylinder");
    expect(input.heightCm).toBe(300);
    expect(input.radiusCm).toBe(100);
    expect(input.deadZoneCm).toBe(25);
    expect(input.dimsConfirmed).toBe(true);
    expect(input.warnPct).toBe(40);
    expect(input.critPct).toBe(20);
    expect(input.emptyPct).toBe(5);
  });
});


import { describe, it, expect } from "vitest";
import {
  validateDeviceEui,
  validateHeight,
  validateRadius,
  validateDeadZone,
  validateThresholds,
  validateDateRange,
  validateEmail,
  validatePassword,
  capacityLitres,
  validateTankForm,
  formToTankInput,
  type TankFormValues,
} from "@/lib/validation";

describe("fe-validation", () => {
  describe("validateDeviceEui", () => {
    it("allows empty or null EUI (optional for draft nodes)", () => {
      expect(validateDeviceEui("")).toBeNull();
      expect(validateDeviceEui(null)).toBeNull();
    });

    it("rejects non-16-hex strings with exact spec message", () => {
      expect(validateDeviceEui("not-a-hex")).toBe("Enter the 16-character Device EUI.");
      expect(validateDeviceEui("1234567890abcdef123")).toBe("Enter the 16-character Device EUI.");
      expect(validateDeviceEui("1234567890abcdeg")).toBe("Enter the 16-character Device EUI.");
    });

    it("accepts valid 16-hex string", () => {
      expect(validateDeviceEui("2cf7f1c044300001")).toBeNull();
      expect(validateDeviceEui("2CF7F1C044300001")).toBeNull();
    });

    it("checks for uniqueness against existing tanks", () => {
      const existing = [{ id: 1, label: "Tank 1", deviceId: "2cf7f1c044300001" }];
      expect(validateDeviceEui("2cf7f1c044300001", existing, 2)).toBe("This EUI is already used by Tank 1.");
      // Editing same tank ignores self-conflict
      expect(validateDeviceEui("2cf7f1c044300001", existing, 1)).toBeNull();
    });
  });

  describe("dimensions validation", () => {
    it("validates height > 0", () => {
      expect(validateHeight(0)).toBe("Height must be greater than 0 cm.");
      expect(validateHeight(-10)).toBe("Height must be greater than 0 cm.");
      expect(validateHeight(300)).toBeNull();
    });

    it("validates radius > 0", () => {
      expect(validateRadius(0)).toBe("Radius must be greater than 0 cm.");
      expect(validateRadius(100)).toBeNull();
    });

    it("validates dead zone >= 0 and < height", () => {
      expect(validateDeadZone(-5, 300)).toBe("Dead zone must be between 0 and tank height.");
      expect(validateDeadZone(300, 300)).toBe("Dead zone must be smaller than the tank height.");
      expect(validateDeadZone(350, 300)).toBe("Dead zone must be smaller than the tank height.");
      expect(validateDeadZone(25, 300)).toBeNull();
    });
  });

  describe("validateThresholds", () => {
    it("enforces Emergency < Critical < Warning < 100", () => {
      const valid = validateThresholds(40, 20, 5);
      expect(valid.general).toBeUndefined();

      const invalidWarn = validateThresholds(105, 20, 5);
      expect(invalidWarn.warnError).toBe("Warning must be below 100%.");

      const invalidCrit = validateThresholds(40, 45, 5);
      expect(invalidCrit.critError).toBe("Critical must be lower than Warning.");

      const invalidEmpty = validateThresholds(40, 20, 25);
      expect(invalidEmpty.emptyError).toBe("Emergency must be lower than Critical.");
    });
  });

  describe("validateDateRange", () => {
    it("enforces start date <= end date", () => {
      expect(validateDateRange("2026-10-23", "2026-10-30")).toBeNull();
      expect(validateDateRange("2026-10-30", "2026-10-23")).toBe("Choose a start date on or before the end date.");
    });
  });

  describe("validateEmail & validatePassword", () => {
    it("validates email format", () => {
      expect(validateEmail("admin@mams.local")).toBeNull();
      expect(validateEmail("invalid-email")).toBe("Enter a valid email address.");
    });

    it("validates password length >= 8", () => {
      expect(validatePassword("ChangeMe!2026")).toBeNull();
      expect(validatePassword("short")).toBe("Password must be at least 8 characters.");
    });
  });

  describe("capacityLitres", () => {
    it("calculates cylinder volume accurately in litres", () => {
      // H=300, R=100 -> pi * 100^2 * 300 / 1000 = 30000 * pi ~= 9425 L
      expect(capacityLitres("cylinder", 300, 100)).toBe(9425);
    });

    it("calculates rectangle volume accurately in litres", () => {
      // H=200, W=150, L=200 -> 200 * 150 * 200 / 1000 = 6000 L
      expect(capacityLitres("rectangle", 200, 150, 200)).toBe(6000);
    });
  });

  describe("validateTankForm", () => {
    it("validates a full tank form", () => {
      const validValues: TankFormValues = {
        label: "Tank 1",
        deviceId: "2cf7f1c044300001",
        status: "active",
        shape: "cylinder",
        heightCm: 300,
        radiusCm: 100,
        deadZoneCm: 25,
        warnPct: 40,
        critPct: 20,
        emptyPct: 5,
      };

      const result = validateTankForm(validValues);
      expect(result.ok).toBe(true);
      expect(result.fieldErrors).toEqual({});

      const input = formToTankInput(validValues);
      expect(input.label).toBe("Tank 1");
      expect(input.heightCm).toBe(300);
      expect(input.warnPct).toBe(40);
    });
  });
});


import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { calculateUntilTomorrow8amIST } from "@/features/alerts/SnoozeMenu";
import {
  weeklyReport,
  monthlyReport,
  incidentReport,
  generatePdfBuffer,
  reportCsv,
} from "@/server/services/reports";
import { createTank, getTank, updateTank } from "@/server/repos/tanks";
import * as alerts from "@/server/repos/alerts";
import {
  createUser,
  createPasswordReset,
  verifyAndConsumePasswordReset,
} from "@/server/repos/users";
import {
  getNotificationPrefs,
  saveNotificationPrefs,
} from "@/server/repos/notification-prefs";
import { q1 } from "@/server/db";

let testCtx: TestSchemaContext;

describe("Phase 5 Gate: Unlocked Controls and Workflows", () => {
  beforeAll(async () => {
    testCtx = await createTestSchema();
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  describe("Snooze Calculations & Alert Workflow", () => {
    it("calculates until tomorrow 08:00 IST correctly", () => {
      // Known timestamp: 2026-11-18 10:00:00 UTC (15:30 IST)
      const t = Date.UTC(2026, 10, 18, 10, 0, 0);
      const minutes = calculateUntilTomorrow8amIST(t);
      // From 15:30 IST to next day 08:00 IST is 16.5 hours = 990 minutes
      expect(minutes).toBe(990);
    });

    it("snoozes and resolves an alert in the database", async () => {
      const tankId = await createTank({
        label: "Phase5 Test Tank 1",
        shape: "cylinder",
        heightCm: 300,
        radiusCm: 100,
        deadZoneCm: 25,
        dimsConfirmed: true,
      });

      const now = Date.now();
      const alertId = await alerts.open({
        tankId,
        type: "LOW_LEVEL",
        severity: "warning",
        message: "Tank level low",
        value: 35,
        at: now,
        triggerT: now,
        triggerDistanceCm: 150,
        simulated: false,
      });

      const snoozedUntil = await alerts.snooze(alertId, now, 60);
      expect(snoozedUntil).toBeGreaterThan(now);

      const snoozed = await alerts.getAlert(alertId);
      expect(snoozed).toBeDefined();
      expect(snoozed?.state).toBe("snoozed");
      expect(Number(snoozed?.snoozedUntil)).toBe(snoozedUntil);

      await alerts.resolve(alertId, now + 10_000, "Issue addressed physically");
      const resolved = await alerts.getAlert(alertId);
      expect(resolved?.state).toBe("resolved");
      expect(resolved?.resolvedAt).toBeDefined();
    });
  });

  describe("Quiet Hours & Notification Preferences", () => {
    it("updates and retrieves user notification preferences with quiet hours", async () => {
      const user = await createUser({
        email: "phase5-admin@mams.local",
        name: "Phase 5 Admin",
        role: "admin",
        password: "AdminPassword!2026",
      });

      await saveNotificationPrefs(user.id, {
        channelsBySeverity: {
          info: ["in_app"],
          warning: ["in_app"],
          critical: ["in_app", "email"],
          emergency: ["in_app", "email"],
        },
        quietHours: { enabled: true, start: "22:00", end: "06:00" },
        email: "phase5-admin@mams.local",
        phone: null,
        whatsapp: null,
        tankIds: [],
      });

      const prefs = await getNotificationPrefs(user.id);
      expect(prefs.quietHours.enabled).toBe(true);
      expect(prefs.quietHours.start).toBe("22:00");
      expect(prefs.quietHours.end).toBe("06:00");
      expect(prefs.channelsBySeverity.critical).toContain("email");
    });
  });

  describe("Historical Tank Dimensions (Apply from now on only)", () => {
    it("inserts historic dimension row when applyFromNowOnly is true", async () => {
      const tankId = await createTank({
        label: "Phase5 Historic Tank",
        shape: "cylinder",
        heightCm: 250,
        radiusCm: 90,
        deadZoneCm: 20,
        dimsConfirmed: true,
      });

      const boundaryTime = Date.now() + 5000;

      // Apply new dimensions from now on only
      await updateTank(
        tankId,
        {
          heightCm: 320,
          radiusCm: 110,
        },
        {
          applyFromNowOnly: true,
          effectiveFrom: boundaryTime,
        }
      );

      // Verify tank_dimensions has recorded the entry
      const dimRow = await q1<{ height_cm: number; radius_cm: number; effective_from: number }>(
        "SELECT height_cm, radius_cm, effective_from FROM tank_dimensions WHERE tank_id = $1 ORDER BY id DESC LIMIT 1",
        [tankId]
      );

      expect(dimRow).toBeDefined();
      expect(dimRow?.height_cm).toBe(320);
      expect(dimRow?.radius_cm).toBe(110);
      expect(Number(dimRow?.effective_from)).toBe(boundaryTime);

      // Verify the current tank definition has also been updated
      const updatedTank = await getTank(tankId);
      expect(updatedTank?.geometry.heightCm).toBe(320);
    });
  });

  describe("Password Policy & Token Recovery", () => {
    it("creates, validates, and consumes a hashed single-use password reset token", async () => {
      const email = "phase5-reset@mams.local";
      await createUser({
        email,
        name: "Reset User",
        role: "operator",
        password: "InitialPassword!2026",
      });

      const rawToken = await createPasswordReset(email);
      expect(rawToken).toBeDefined();
      expect(rawToken.length).toBe(64); // 32 hex bytes

      // Token should succeed with valid password satisfying policy
      const newPassword = "StrongSecurePassword!2026";
      await verifyAndConsumePasswordReset(rawToken, newPassword);

      // Consuming the same token a second time should fail
      await expect(
        verifyAndConsumePasswordReset(rawToken, "AnotherPassword!2026")
      ).rejects.toThrow("already been used");
    });
  });

  describe("On-Demand Reports Generation", () => {
    it("generates Weekly PDF report starting with %PDF", async () => {
      const doc = await weeklyReport();
      expect(doc.title).toBeDefined();
      const pdf = await generatePdfBuffer(doc);
      expect(pdf).toBeInstanceOf(Buffer);
      const pdfHeader = pdf.subarray(0, 4).toString("ascii");
      expect(pdfHeader).toBe("%PDF");
    });

    it("generates Monthly CSV report with valid headers", async () => {
      const doc = await monthlyReport();
      const csv = reportCsv(doc);
      expect(typeof csv).toBe("string");
      expect(csv).toContain("Tank,Device,Samples,Completeness %");
    });

    it("generates Incident PDF report", async () => {
      const tankId = await createTank({
        label: "Phase5 Incident Tank",
        shape: "cylinder",
        heightCm: 300,
        radiusCm: 100,
        deadZoneCm: 25,
        dimsConfirmed: true,
      });

      const now = Date.now();
      const alertId = await alerts.open({
        tankId,
        type: "CRITICAL_LOW",
        severity: "critical",
        message: "Critical low water level detected",
        value: 18,
        at: now - 3600_000,
        triggerT: now - 3600_000,
        triggerDistanceCm: 250,
        simulated: false,
      });

      const doc = await incidentReport(alertId);
      expect(doc).toBeDefined();
      const pdf = await generatePdfBuffer(doc!);
      const pdfHeader = pdf.subarray(0, 4).toString("ascii");
      expect(pdfHeader).toBe("%PDF");
    });
  });
});

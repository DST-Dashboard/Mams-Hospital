import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q } from "@/server/db";
import { createTank } from "@/server/repos/tanks";
import { open as openAlert } from "@/server/repos/alerts";
import { setForTank } from "@/server/repos/recipients";
import { saveNotificationPrefs, DEFAULT_NOTIFICATION_PREFS } from "@/server/repos/notification-prefs";
import { listDeliveries } from "@/server/repos/notifications";
import { dispatchAlertNotifications, inQuietHours, isRateLimitAllowed } from "@/server/notify/dispatcher";

describe("notification dispatcher", () => {
  let testCtx: TestSchemaContext;
  let tankId: number;
  let userId: number;

  beforeAll(async () => {
    testCtx = await createTestSchema();

    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('notify-device', FALSE, $1)", [Date.now()]);
    tankId = await createTank({
      label: "Notification test tank",
      deviceId: "notify-device",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });

    const [user] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, created_at) VALUES ('notify-test@example.test', 'Notify Test', 'unused-test-hash', 'viewer', $1) RETURNING id",
      [Date.now()]
    );
    userId = user.id;

    // Associate user as recipient for tank with in_app and email
    await setForTank(tankId, userId, ["in_app", "email"], 1);
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("delivers in-app notifications and records delivery", async () => {
    const alertId = await openAlert({
      tankId,
      type: "LOW_LEVEL",
      severity: "warning",
      message: "Tank is low",
      value: 30,
      at: Date.now(),
      triggerT: null,
      triggerDistanceCm: null,
      simulated: false,
    });

    const result = await dispatchAlertNotifications(alertId, 1);
    expect(result.attempted).toBeGreaterThanOrEqual(1);

    const deliveries = await listDeliveries(alertId);
    expect(deliveries.some((d) => d.channel === "in_app" && d.status === "sent")).toBe(true);
  });

  it("enforces quiet hours for warnings", () => {
    const prefs = {
      ...DEFAULT_NOTIFICATION_PREFS,
      quietHours: { enabled: true, start: "22:00", end: "06:00" },
    };

    // 23:00 IST is 17:30 UTC
    const date2300IST = new Date("2026-10-15T17:30:00Z").getTime();
    expect(inQuietHours(prefs, date2300IST)).toBe(true);

    // 12:00 IST is 06:30 UTC
    const date1200IST = new Date("2026-10-15T06:30:00Z").getTime();
    expect(inQuietHours(prefs, date1200IST)).toBe(false);
  });

  it("enforces 1-per-hour rate limit cap per tank per channel", async () => {
    const now = Date.now();
    const first = await isRateLimitAllowed(tankId, "email-test", now);
    expect(first).toBe(true);

    // Immediate second call should be throttled
    const second = await isRateLimitAllowed(tankId, "email-test", now + 10_000);
    expect(second).toBe(false);

    // After 1 hour, it is allowed again
    const third = await isRateLimitAllowed(tankId, "email-test", now + 3601_000);
    expect(third).toBe(true);
  });
});

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { NotificationPrefsDTO } from "@/contracts/settings";

let testDbPath: string;
let dbInstance: ReturnType<typeof import("@/server/db").openDb>;
let tankId: number;
let userId: number;
let openAlert: typeof import("@/server/repos/alerts").open;
let dispatchAlert: typeof import("@/server/notify/dispatcher").dispatchAlert;
let dispatchPendingNotifications: typeof import("@/server/notify/dispatcher").dispatchPendingNotifications;
let listDeliveries: typeof import("@/server/repos/notifications").listDeliveries;
let saveNotificationPrefs: typeof import("@/server/repos/notification-prefs").saveNotificationPrefs;
let defaultPrefs: typeof import("@/server/repos/notification-prefs").DEFAULT_NOTIFICATION_PREFS;

const quietLogger = vi.spyOn(console, "warn").mockImplementation(() => {});

describe("notification dispatcher", () => {
  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-notifications-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = "notification-test-secret-at-least-32-characters";
    delete process.env.SMTP_URL;
    delete process.env.SMTP_FROM;

    const database = await import("@/server/db");
    dbInstance = database.openDb(testDbPath);
    (globalThis as typeof globalThis & { __ohtmsDb?: ReturnType<typeof database.openDb> }).__ohtmsDb = dbInstance;

    const repos = await import("@/server/repos/alerts");
    openAlert = repos.open;
    const tanks = await import("@/server/repos/tanks");
    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)").run("notify-device", Date.now());
    tankId = tanks.createTank({
      label: "Notification test tank",
      deviceId: "notify-device",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });

    userId = Number(dbInstance.prepare(`
      INSERT INTO users (email, name, password_hash, role, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run("notify-test@example.test", "Notify Test", "unused-test-hash", "viewer", Date.now()).lastInsertRowid);

    const notifications = await import("@/server/repos/notifications");
    listDeliveries = notifications.listDeliveries;
    const prefs = await import("@/server/repos/notification-prefs");
    saveNotificationPrefs = prefs.saveNotificationPrefs;
    defaultPrefs = prefs.DEFAULT_NOTIFICATION_PREFS;
    const dispatcher = await import("@/server/notify/dispatcher");
    dispatchAlert = dispatcher.dispatchAlert;
    dispatchPendingNotifications = dispatcher.dispatchPendingNotifications;
  });

  afterAll(() => {
    quietLogger.mockRestore();
    dbInstance.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  beforeEach(() => {
    dbInstance.prepare("DELETE FROM notification_prefs WHERE user_id = ?").run(userId);
  });

  it("delivers in-app notifications once and records completion", async () => {
    const alertId = openAlert({
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

    await expect(dispatchAlert(alertId)).resolves.toEqual({ attempted: 1 });
    await expect(dispatchAlert(alertId)).resolves.toEqual({ attempted: 1 });
    expect(listDeliveries(alertId)).toMatchObject([{ channel: "in_app", recipient: `user:${userId}`, status: "sent" }]);
    expect(listDeliveries(alertId)).toHaveLength(1);
    expect(await dispatchPendingNotifications(Date.now() + 60_000)).toBe(0);
  });

  it("retries failed provider deliveries only after the configured delay", async () => {
    const prefs: NotificationPrefsDTO = {
      ...defaultPrefs,
      channelsBySeverity: { ...defaultPrefs.channelsBySeverity, warning: ["email"] },
    };
    saveNotificationPrefs(userId, prefs);
    const alertId = openAlert({
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
    await dispatchAlert(alertId);
    expect(listDeliveries(alertId)).toMatchObject([{ channel: "email", status: "failed" }]);
    expect(await dispatchPendingNotifications(Date.now() + 60_000)).toBe(0);
    expect(await dispatchPendingNotifications(Date.now() + 6 * 60_000)).toBe(1);
    expect(listDeliveries(alertId)).toMatchObject([{ channel: "email", status: "failed" }]);
  });

  it("stops retrying a permanently failing channel after five delivery attempts", async () => {
    const prefs: NotificationPrefsDTO = {
      ...defaultPrefs,
      channelsBySeverity: { ...defaultPrefs.channelsBySeverity, warning: ["email"] },
    };
    saveNotificationPrefs(userId, prefs);
    const alertId = openAlert({
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
    dbInstance.prepare("UPDATE alerts SET resolved_at = ? WHERE id != ?").run(Date.now(), alertId);

    await dispatchAlert(alertId);
    for (let retry = 1; retry < 5; retry++) {
      expect(await dispatchPendingNotifications(Date.now() + 6 * 60_000)).toBe(1);
    }
    expect(await dispatchPendingNotifications(Date.now() + 6 * 60_000)).toBe(0);
    expect(dbInstance.prepare("SELECT attempt_count, status FROM notifications WHERE alert_id = ?")
      .get(alertId)).toEqual({ attempt_count: 5, status: "failed" });
  });

  it("does not invent a phone recipient when SMS preferences have no phone", async () => {
    const prefs: NotificationPrefsDTO = {
      ...defaultPrefs,
      channelsBySeverity: { ...defaultPrefs.channelsBySeverity, warning: ["sms"] },
    };
    saveNotificationPrefs(userId, prefs);
    const alertId = openAlert({
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

    await expect(dispatchAlert(alertId)).resolves.toEqual({ attempted: 0 });
    expect(listDeliveries(alertId)).toEqual([]);
  });
});

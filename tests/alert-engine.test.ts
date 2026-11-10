// [BE-02] OWNER: backend
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let testDbPath: string;
let dbInstance: any;

describe("alert-engine", () => {
  let evaluateTank: typeof import("@/server/services/alert-engine").evaluateTank;
  let alerts: typeof import("@/server/repos/alerts");
  let readings: typeof import("@/server/repos/readings");
  let tanks: typeof import("@/server/repos/tanks");
  let tankId: number;
  const deviceId = "test-sensor-01";

  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-alerts-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;

    const { openDb } = await import("@/server/db");
    const { runMigrations } = await import("@/server/migrations/runner");
    dbInstance = openDb(testDbPath);
    (globalThis as any).__ohtmsDb = dbInstance;
    runMigrations(dbInstance);

    alerts = await import("@/server/repos/alerts");
    readings = await import("@/server/repos/readings");
    tanks = await import("@/server/repos/tanks");
    const alertEngine = await import("@/server/services/alert-engine");
    evaluateTank = alertEngine.evaluateTank;

    // Create a test device and tank
    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)").run(deviceId, Date.now());
    tankId = tanks.createTank({
      label: "Test Reservoir 1",
      deviceId,
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
      status: "active",
      warnPct: 40,
      critPct: 20,
      emptyPct: 5,
    });
  });

  afterAll(() => {
    if (dbInstance) {
      dbInstance.close();
    }
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
      if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
    } catch {
      // Ignore on Windows
    }
  });

  it("opens once per tank+type", () => {
    const t0 = 1700000000000;
    // distance 200cm on height 300cm -> level = 100cm, range = 275cm -> 100/275 = 36% (< 40% warnPct)
    readings.upsertMany([
      { deviceId, t: t0, distanceCm: 200 },
      { deviceId, t: t0 + 60_000, distanceCm: 200 },
      { deviceId, t: t0 + 120_000, distanceCm: 200 },
    ]);

    const tank = tanks.getTank(tankId)!;
    const res1 = evaluateTank(tank, t0 + 120_000);
    expect(res1.opened).toBe(1);

    const openList = alerts.listOpen();
    expect(openList.length).toBe(1);
    expect(openList[0].type).toBe("LOW_LEVEL");
    expect(openList[0].state).toBe("active");

    // Re-evaluating with same condition must NOT open a duplicate
    const res2 = evaluateTank(tank, t0 + 180_000);
    expect(res2.opened).toBe(0);
    expect(alerts.listOpen().length).toBe(1);
  });

  it("cooldown blocks re-open", () => {
    const t0 = 1700000000000;
    const openAlert = alerts.listOpen()[0];
    alerts.resolve(openAlert.id, t0 + 200_000);
    expect(alerts.listOpen().length).toBe(0);

    const tank = tanks.getTank(tankId)!;
    // 10 minutes later (< 30 min cooldown), still at low level
    const res = evaluateTank(tank, t0 + 10 * 60_000);
    expect(res.opened).toBe(0);

    // After cooldown period (35 minutes later), can re-open
    readings.upsertMany([
      { deviceId, t: t0 + 35 * 60_000, distanceCm: 200 },
    ]);
    const resAfterCooldown = evaluateTank(tank, t0 + 35 * 60_000);
    expect(resAfterCooldown.opened).toBe(1);
  });

  it("hysteresis clears", () => {
    const t0 = 1700000000000 + 40 * 60_000;
    const tank = tanks.getTank(tankId)!;
    expect(alerts.listOpen().length).toBe(1);

    // Level rises to 42% (distance = 184cm -> level = 116cm -> 116/275 = 42.1%)
    // Warn is 40%, hysteresis is 5% -> must reach 45% to clear!
    readings.upsertMany([
      { deviceId, t: t0 + 60_000, distanceCm: 184 },
    ]);
    const res1 = evaluateTank(tank, t0 + 60_000);
    expect(res1.resolved).toBe(0);
    expect(alerts.listOpen().length).toBe(1);

    // Level rises to 50% (distance = 162cm -> level = 138cm -> 138/275 = 50.1%)
    readings.upsertMany([
      { deviceId, t: t0 + 120_000, distanceCm: 162 },
    ]);
    const res2 = evaluateTank(tank, t0 + 120_000);
    expect(res2.resolved).toBe(1);
    expect(alerts.listOpen().length).toBe(0);
  });

  it("maintenance suppresses", () => {
    const t0 = 1700000000000 + 60 * 60_000;
    // Low level readings
    readings.upsertMany([
      { deviceId, t: t0, distanceCm: 200 },
      { deviceId, t: t0 + 60_000, distanceCm: 200 },
      { deviceId, t: t0 + 120_000, distanceCm: 200 },
    ]);

    // Set maintenance status
    tanks.updateTank(tankId, {
      label: "Test Reservoir 1",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      status: "maintenance",
    });

    const tank = tanks.getTank(tankId)!;
    const res = evaluateTank(tank, t0 + 120_000);
    expect(res.opened).toBe(0);
    expect(alerts.listOpen().length).toBe(0);

    // Restore to active
    tanks.updateTank(tankId, {
      label: "Test Reservoir 1",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      status: "active",
    });
  });

  it("snooze hides until expiry", () => {
    const t0 = 1700000000000 + 100 * 60_000;
    readings.upsertMany([
      { deviceId, t: t0, distanceCm: 200 },
      { deviceId, t: t0 + 60_000, distanceCm: 200 },
      { deviceId, t: t0 + 120_000, distanceCm: 200 },
    ]);

    const tank = tanks.getTank(tankId)!;
    evaluateTank(tank, t0 + 120_000);
    const alert = alerts.listOpen()[0];
    expect(alert).toBeDefined();

    // Snooze for 15 minutes
    const snoozeUntil = alerts.snooze(alert.id, t0 + 120_000, 15);
    expect(snoozeUntil).toBe(t0 + 120_000 + 15 * 60_000);

    const alertAfterSnooze = alerts.getAlert(alert.id, t0 + 130_000)!;
    expect(alertAfterSnooze.state).toBe("snoozed");

    // Fast-forward beyond snooze expiry (20 minutes later)
    const alertAfterExpiry = alerts.getAlert(alert.id, t0 + 120_000 + 20 * 60_000)!;
    expect(alertAfterExpiry.state).toBe("active");
    expect(alertAfterExpiry.snoozedUntil).toBeNull();

    // Clean up alert
    alerts.resolve(alert.id, t0 + 200 * 60_000);
  });

  it("quiet hours defer non-critical", () => {
    // 23:00 UTC = 82800000 ms from midnight
    // Date: 2026-10-15 23:00:00 UTC
    const date2300 = new Date("2026-10-15T23:00:00Z").getTime();
    tanks.updateTank(tankId, {
      label: "Test Reservoir 1",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      status: "active",
      quietStart: "22:00",
      quietEnd: "06:00",
    });

    const tank = tanks.getTank(tankId)!;
    expect(tank.thresholds.quietStart).toBe("22:00");
    expect(tank.thresholds.quietEnd).toBe("06:00");

    // 1. Non-critical warning (LOW_LEVEL): distance = 200cm -> 36% level (< 40% warn, > 20% crit)
    readings.upsertMany([
      { deviceId, t: date2300 - 120_000, distanceCm: 200 },
      { deviceId, t: date2300 - 60_000, distanceCm: 200 },
      { deviceId, t: date2300, distanceCm: 200 },
    ]);

    const resWarning = evaluateTank(tank, date2300);
    // Suppressed because it is a non-critical warning during quiet hours!
    expect(resWarning.opened).toBe(0);

    // 2. Critical alert (CRITICAL_LOW): distance = 260cm -> level = 40cm -> 40/275 = 14.5% (< 20% crit)
    readings.upsertMany([
      { deviceId, t: date2300 + 60_000, distanceCm: 260 },
      { deviceId, t: date2300 + 120_000, distanceCm: 260 },
      { deviceId, t: date2300 + 180_000, distanceCm: 260 },
    ]);

    const resCritical = evaluateTank(tank, date2300 + 180_000);
    // Critical alerts are NEVER suppressed during quiet hours!
    expect(resCritical.opened).toBe(1);
    const openAlerts = alerts.listOpen(date2300 + 180_000);
    expect(openAlerts.some((a) => a.type === "CRITICAL_LOW")).toBe(true);
  });
});

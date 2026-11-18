// [BE-02] OWNER: backend
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q } from "@/server/db";
import * as alerts from "@/server/repos/alerts";
import * as readings from "@/server/repos/readings";
import * as tanks from "@/server/repos/tanks";
import { evaluateTank } from "@/server/services/alert-engine";

describe("alert-engine", () => {
  let testCtx: TestSchemaContext;
  let tankId: number;
  const deviceId = "test-sensor-01";

  beforeAll(async () => {
    testCtx = await createTestSchema();

    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ($1, FALSE, $2)", [deviceId, Date.now()]);
    tankId = await tanks.createTank({
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

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("opens once per tank+type", async () => {
    const t0 = 1700000000000;
    // distance 200cm on height 300cm -> level = 100cm, range = 275cm -> 100/275 = 36% (< 40% warnPct)
    await readings.upsertMany([
      { deviceId, t: t0, distanceCm: 200 },
      { deviceId, t: t0 + 60_000, distanceCm: 200 },
      { deviceId, t: t0 + 120_000, distanceCm: 200 },
    ]);

    const tank = (await tanks.getTank(tankId))!;
    const res1 = await evaluateTank(tank, t0 + 120_000);
    expect(res1.opened).toBe(1);

    const openList = await alerts.listOpen();
    expect(openList.length).toBe(1);
    expect(openList[0].type).toBe("LOW_LEVEL");
    expect(openList[0].state).toBe("active");

    // Re-evaluating with same condition must NOT open a duplicate
    const res2 = await evaluateTank(tank, t0 + 180_000);
    expect(res2.opened).toBe(0);
    expect((await alerts.listOpen()).length).toBe(1);
  });

  it("cooldown blocks re-open", async () => {
    const t0 = 1700000000000;
    const openAlert = (await alerts.listOpen())[0];
    await alerts.resolve(openAlert.id, t0 + 200_000);
    expect((await alerts.listOpen()).length).toBe(0);

    const tank = (await tanks.getTank(tankId))!;
    // 10 minutes later (< 30 min cooldown), still at low level
    const res = await evaluateTank(tank, t0 + 10 * 60_000);
    expect(res.opened).toBe(0);

    // After cooldown period (35 minutes later), can re-open
    await readings.upsertMany([
      { deviceId, t: t0 + 35 * 60_000, distanceCm: 200 },
    ]);
    await evaluateTank(tank, t0 + 35 * 60_000);
    const openAfterCooldown = await alerts.listOpen();
    expect(openAfterCooldown.filter((alert) => alert.type === "LOW_LEVEL")).toHaveLength(1);
  });

  it("hysteresis clears", async () => {
    const t0 = 1700000000000 + 40 * 60_000;
    const tank = (await tanks.getTank(tankId))!;
    expect((await alerts.listOpen()).filter((alert) => alert.type === "LOW_LEVEL")).toHaveLength(1);

    // Level rises to 42% (distance = 184cm -> level = 116cm -> 116/275 = 42.1%)
    // Warn is 40%, hysteresis is 5% -> must reach 45% to clear!
    await readings.upsertMany([
      { deviceId, t: t0 + 60_000, distanceCm: 184 },
    ]);
    await evaluateTank(tank, t0 + 60_000);
    expect((await alerts.listOpen()).filter((alert) => alert.type === "LOW_LEVEL")).toHaveLength(1);

    // Level rises to 50% (distance = 162cm -> level = 138cm -> 138/275 = 50.1%)
    await readings.upsertMany([
      { deviceId, t: t0 + 120_000, distanceCm: 162 },
    ]);
    const res2 = await evaluateTank(tank, t0 + 120_000);
    expect(res2.resolved).toBe(1);
    expect((await alerts.listOpen()).some((alert) => alert.type === "LOW_LEVEL")).toBe(false);
  });

  it("maintenance suppresses", async () => {
    const t0 = 1700000000000 + 60 * 60_000;
    // Low level readings
    await readings.upsertMany([
      { deviceId, t: t0, distanceCm: 200 },
      { deviceId, t: t0 + 60_000, distanceCm: 200 },
      { deviceId, t: t0 + 120_000, distanceCm: 200 },
    ]);

    // Set maintenance status
    await tanks.updateTank(tankId, {
      label: "Test Reservoir 1",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      status: "maintenance",
    });

    const tank = (await tanks.getTank(tankId))!;
    const res = await evaluateTank(tank, t0 + 120_000);
    expect(res.opened).toBe(0);
    expect((await alerts.listOpen()).some((alert) => alert.type === "LOW_LEVEL")).toBe(false);

    // Restore to active
    await tanks.updateTank(tankId, {
      label: "Test Reservoir 1",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      status: "active",
    });
  });

  it("snooze hides until expiry", async () => {
    const t0 = 1700000000000 + 100 * 60_000;
    await readings.upsertMany([
      { deviceId, t: t0, distanceCm: 200 },
      { deviceId, t: t0 + 60_000, distanceCm: 200 },
      { deviceId, t: t0 + 120_000, distanceCm: 200 },
    ]);

    const tank = (await tanks.getTank(tankId))!;
    await evaluateTank(tank, t0 + 120_000);
    const alert = (await alerts.listOpen())[0];
    expect(alert).toBeDefined();

    // Snooze for 15 minutes
    const snoozeUntil = await alerts.snooze(alert.id, t0 + 120_000, 15);
    expect(snoozeUntil).toBe(t0 + 120_000 + 15 * 60_000);

    const alertAfterSnooze = (await alerts.getAlert(alert.id, t0 + 130_000))!;
    expect(alertAfterSnooze.state).toBe("snoozed");

    // Fast-forward beyond snooze expiry (20 minutes later)
    const alertAfterExpiry = (await alerts.getAlert(alert.id, t0 + 120_000 + 20 * 60_000))!;
    expect(alertAfterExpiry.state).toBe("active");
    expect(alertAfterExpiry.snoozedUntil).toBeNull();

    // Clean up alert
    await alerts.resolve(alert.id, t0 + 200 * 60_000);
  });

  it("quiet hours defer non-critical", async () => {
    // 23:00 UTC = 82800000 ms from midnight
    // Date: 2026-10-15 23:00:00 UTC
    const date2300 = new Date("2026-10-15T23:00:00Z").getTime();
    await tanks.updateTank(tankId, {
      label: "Test Reservoir 1",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      status: "active",
      quietStart: "22:00",
      quietEnd: "06:00",
    });

    const tank = (await tanks.getTank(tankId))!;
    expect(tank.thresholds.quietStart).toBe("22:00");
    expect(tank.thresholds.quietEnd).toBe("06:00");

    // 1. Non-critical warning (LOW_LEVEL): distance = 200cm -> 36% level (< 40% warn, > 20% crit)
    await readings.upsertMany([
      { deviceId, t: date2300 - 120_000, distanceCm: 200 },
      { deviceId, t: date2300 - 60_000, distanceCm: 200 },
      { deviceId, t: date2300, distanceCm: 200 },
    ]);

    const resWarning = await evaluateTank(tank, date2300);
    // Suppressed because it is a non-critical warning during quiet hours!
    expect(resWarning.opened).toBe(0);

    // 2. Critical alert (CRITICAL_LOW): distance = 260cm -> level = 40cm -> 40/275 = 14.5% (< 20% crit)
    await readings.upsertMany([
      { deviceId, t: date2300 + 60_000, distanceCm: 260 },
      { deviceId, t: date2300 + 120_000, distanceCm: 260 },
      { deviceId, t: date2300 + 180_000, distanceCm: 260 },
    ]);

    const resCritical = await evaluateTank(tank, date2300 + 180_000);
    // Critical alerts are NEVER suppressed during quiet hours!
    const openAlerts = await alerts.listOpen(date2300 + 180_000);
    expect(openAlerts.some((a) => a.type === "CRITICAL_LOW")).toBe(true);
  });
});

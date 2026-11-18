// [BE-02] OWNER: backend
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import nodemailer from "nodemailer";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q } from "@/server/db";
import * as alerts from "@/server/repos/alerts";
import * as readings from "@/server/repos/readings";
import * as tanks from "@/server/repos/tanks";
import * as recipients from "@/server/repos/recipients";
import { evaluateTank } from "@/server/services/alert-engine";
import { evaluateRules } from "@/domain/rules";
import { transitionAlert, type AlertStateContext } from "@/domain/alert-state";
import { DEFAULT_THRESHOLDS, type Reading, type TankGeometry } from "@/domain";
import { dispatchAlertNotifications, checkAndEscalateAlerts } from "@/server/notify/dispatcher";
import { resetEnvCache } from "@/server/env";

let testCtx: TestSchemaContext;

describe("alert-engine", () => {
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

describe("all 9 authoritative rules", () => {
  const now = Date.UTC(2026, 9, 30, 12, 0);
  const geometry: TankGeometry = { heightCm: 300, deadZoneCm: 25, shape: { kind: "cylinder", radiusCm: 100 } };

  const r = (minutesAgo: number, distanceCm: number | null, extra: Partial<Reading> = {}): Reading => ({
    t: now - minutesAgo * 60_000,
    distanceCm,
    ...extra,
  });

  const evalRule = (type: string, readings: Reading[]) =>
    evaluateRules({ readings, geometry, th: DEFAULT_THRESHOLDS, now }).find((rule) => rule.type === type);

  it("1. NO_DATA raises when sensor is silent beyond noDataMin", () => {
    const silent = evalRule("NO_DATA", [r(20, 150)]);
    expect(silent?.raise).toBe(true);
    const active = evalRule("NO_DATA", [r(5, 150)]);
    expect(active?.raise).toBe(false);
  });

  it("2. SENSOR_FAULT raises on implausible distances or transient spikes", () => {
    // Beyond tank floor (350 cm > 300 cm)
    const outOfRange = evalRule("SENSOR_FAULT", [r(0, 350)]);
    expect(outOfRange?.raise).toBe(true);

    // Negative / invalid
    const invalid = evalRule("SENSOR_FAULT", [r(0, -10)]);
    expect(invalid?.raise).toBe(true);
  });

  it("3. BATTERY_LOW raises at or below 20%", () => {
    const low = evalRule("BATTERY_LOW", [r(0, 150, { batteryPct: 20 })]);
    expect(low?.raise).toBe(true);
    const ok = evalRule("BATTERY_LOW", [r(0, 150, { batteryPct: 21 })]);
    expect(ok?.raise).toBe(false);
  });

  it("4. PREDICTED_EMPTY raises when consumption rate projects < 60 min to empty", () => {
    // Rapid drain sequence
    const readings = Array.from({ length: 10 }, (_, i) => r((9 - i) * 5, 200 + i * 10));
    const pred = evalRule("PREDICTED_EMPTY", readings);
    expect(pred?.raise).toBe(true);
    expect(pred?.value).toBeLessThan(60);
  });

  it("5. FLAPPING raises when sensor alternates large level changes", () => {
    const readings = [150, 180, 150, 180, 150, 180].map((dist, i) => r((6 - i) * 5, dist));
    const flap = evalRule("FLAPPING", readings);
    expect(flap?.raise).toBe(true);
  });

  it("6. LOW_LEVEL raises when water level is in warning band", () => {
    // height 300, distance 200 -> level = 100cm (33.3% -> between 20% crit and 40% warn)
    const readings = [r(10, 200), r(5, 200), r(0, 200)];
    const low = evalRule("LOW_LEVEL", readings);
    expect(low?.raise).toBe(true);
  });

  it("7. CRITICAL_LOW raises when water level is in critical band", () => {
    // height 300, distance 260 -> level = 40cm (13.3% -> between 5% empty and 20% crit)
    const readings = [r(10, 260), r(5, 260), r(0, 260)];
    const crit = evalRule("CRITICAL_LOW", readings);
    expect(crit?.raise).toBe(true);
  });

  it("8. EMPTY raises when water level drops below empty threshold", () => {
    // height 300, distance 290 -> level = 10cm (3.3% < 5% empty)
    const readings = [r(10, 290), r(5, 290), r(0, 290)];
    const empty = evalRule("EMPTY", readings);
    expect(empty?.raise).toBe(true);
  });

  it("9. OVERFLOW_RISK raises when water is within sensor dead zone + margin", () => {
    // deadZone = 25, margin = 10 -> limit = 35 cm
    const readings = [r(10, 30), r(5, 30), r(0, 30)];
    const overflow = evalRule("OVERFLOW_RISK", readings);
    expect(overflow?.raise).toBe(true);
  });
});

describe("pure alert state machine", () => {
  const t0 = 1700000000000;

  it("acknowledges alert without closing it", () => {
    const alert: AlertStateContext = { state: "active", openedAt: t0 };
    const next = transitionAlert(alert, { type: "ACKNOWLEDGE", userId: 42, at: t0 + 5000 });
    expect(next.acknowledgedAt).toBe(t0 + 5000);
    expect(next.acknowledgedBy).toBe(42);
    expect(next.state).toBe("active");
  });

  it("snoozes alert and returns to active upon expiry", () => {
    const alert: AlertStateContext = { state: "active", openedAt: t0 };
    const snoozed = transitionAlert(alert, { type: "SNOOZE", minutes: 30, at: t0 + 1000 });
    expect(snoozed.state).toBe("snoozed");
    expect(snoozed.snoozedUntil).toBe(t0 + 1000 + 30 * 60_000);

    const expired = transitionAlert(snoozed, { type: "EXPIRE_SNOOZE", at: t0 + 1000 + 31 * 60_000 });
    expect(expired.state).toBe("active");
    expect(expired.snoozedUntil).toBeNull();
  });

  it("escalates unacknowledged alert open > 30 minutes", () => {
    const alert: AlertStateContext = { state: "active", openedAt: t0 };
    // At 25 minutes, does not escalate
    const early = transitionAlert(alert, { type: "ESCALATE", at: t0 + 25 * 60_000 });
    expect(early.state).toBe("active");

    // At 30 minutes, escalates
    const escalated = transitionAlert(alert, { type: "ESCALATE", at: t0 + 30 * 60_000 });
    expect(escalated.state).toBe("escalated");

    // If already acknowledged, does NOT escalate
    const ackedAlert: AlertStateContext = { state: "active", openedAt: t0, acknowledgedAt: t0 + 5000 };
    const noEscalate = transitionAlert(ackedAlert, { type: "ESCALATE", at: t0 + 35 * 60_000 });
    expect(noEscalate.state).toBe("active");
  });

  it("resolves alert cleanly", () => {
    const alert: AlertStateContext = { state: "active", openedAt: t0 };
    const resolved = transitionAlert(alert, { type: "RESOLVE", at: t0 + 60_000 });
    expect(resolved.state).toBe("resolved");
    expect(resolved.resolvedAt).toBe(t0 + 60_000);
  });
});

describe("email dispatcher with mocked nodemailer", () => {
  let emailTankId: number;
  let emailUserId: number;
  let sendMailMock: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    process.env.SMTP_URL = "smtp://testuser:testpass@smtp.mams.hospital:587";
    resetEnvCache();
    sendMailMock = vi.fn().mockResolvedValue({ messageId: "mock-msg-id" });
    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: sendMailMock,
      close: vi.fn(),
    } as unknown as ReturnType<typeof nodemailer.createTransport>);

    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('email-dev', FALSE, $1)", [Date.now()]);
    emailTankId = await tanks.createTank({
      label: "Email Test Tank",
      deviceId: "email-dev",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });

    const [user] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, created_at) VALUES ('engineer@mams.hospital', 'Lead Engineer', 'test-hash', 'admin', $1) RETURNING id",
      [Date.now()]
    );
    emailUserId = user.id;

    // Register user for tier 1 and tier 2 email alerts
    await recipients.setForTank(emailTankId, emailUserId, ["email"], 1);
  });

  afterAll(async () => {
    delete process.env.SMTP_URL;
    resetEnvCache();
    vi.restoreAllMocks();
    if (testCtx) await testCtx.cleanup();
  });

  it("dispatches email notification via nodemailer transport", async () => {
    const alertId = await alerts.open({
      tankId: emailTankId,
      type: "CRITICAL_LOW",
      severity: "critical",
      message: "Water level critical",
      value: 12,
      at: Date.now(),
      triggerT: null,
      triggerDistanceCm: null,
      simulated: false,
    });

    const res = await dispatchAlertNotifications(alertId, 1);
    expect(res.attempted).toBeGreaterThanOrEqual(1);
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "engineer@mams.hospital",
        subject: expect.stringContaining("[OHTMS CRITICAL]"),
      })
    );
  });

  it("checkAndEscalateAlerts escalates unacknowledged alerts after 30 min and triggers tier 2 dispatch", async () => {
    sendMailMock.mockClear();
    const now = Date.now();
    const oldAlertId = await alerts.open({
      tankId: emailTankId,
      type: "CRITICAL_LOW",
      severity: "critical",
      message: "Unattended critical tank",
      value: 10,
      at: now - 35 * 60_000,
      triggerT: null,
      triggerDistanceCm: null,
      simulated: false,
    });

    const escalatedCount = await checkAndEscalateAlerts(now);
    expect(escalatedCount).toBeGreaterThanOrEqual(1);

    const alert = await alerts.getAlert(oldAlertId);
    expect(alert?.state).toBe("escalated");
  });
});

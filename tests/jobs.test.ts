import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let testDbPath: string;
let dbInstance: ReturnType<typeof import("@/server/db").openDb>;
let checkGatewayHealth: typeof import("@/server/jobs/node-health").checkGatewayHealth;
let refreshRollups: typeof import("@/server/jobs/rollups").refreshRollups;
let purgeExpiredData: typeof import("@/server/jobs/retention").purgeExpiredData;
let escalateUnacknowledged: typeof import("@/server/services/escalation").escalateUnacknowledged;
let deviceId: string;
let tankId: number;

describe("backend scheduled jobs", () => {
  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-jobs-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = "job-test-session-secret-at-least-32-characters";

    const database = await import("@/server/db");
    dbInstance = database.openDb(testDbPath);
    (globalThis as typeof globalThis & { __ohtmsDb?: ReturnType<typeof database.openDb> }).__ohtmsDb = dbInstance;
    const tanks = await import("@/server/repos/tanks");
    deviceId = "job-test-device";
    dbInstance.prepare("INSERT INTO devices (device_id, gateway_id, simulated, created_at) VALUES (?, ?, 0, ?)")
      .run(deviceId, "job-test-gateway", Date.now());
    tankId = tanks.createTank({
      label: "Job test tank",
      deviceId,
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });

    checkGatewayHealth = (await import("@/server/jobs/node-health")).checkGatewayHealth;
    refreshRollups = (await import("@/server/jobs/rollups")).refreshRollups;
    purgeExpiredData = (await import("@/server/jobs/retention")).purgeExpiredData;
    escalateUnacknowledged = (await import("@/server/services/escalation")).escalateUnacknowledged;
  });

  afterAll(() => {
    dbInstance.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it("opens and resolves a gateway-wide offline alert and queues its notification", () => {
    const asOf = Date.now();
    expect(checkGatewayHealth(asOf)).toEqual({ opened: 1, resolved: 0 });
    expect(dbInstance.prepare("SELECT type, state FROM alerts WHERE tank_id = ?").get(tankId)).toMatchObject({
      type: "GATEWAY_OFFLINE",
      state: "active",
    });
    expect(dbInstance.prepare("SELECT completed_at FROM notification_dispatches WHERE alert_id = (SELECT id FROM alerts WHERE tank_id = ?)")
      .get(tankId)).toMatchObject({ completed_at: null });

    dbInstance.prepare("INSERT INTO readings (device_id, t, distance_cm) VALUES (?, ?, ?)")
      .run(deviceId, asOf, 150);
    expect(checkGatewayHealth(asOf + 60_000)).toEqual({ opened: 0, resolved: 1 });
    expect(dbInstance.prepare("SELECT state FROM alerts WHERE tank_id = ?").get(tankId)).toMatchObject({ state: "resolved" });
  });

  it("refreshes hourly/daily rollups and purges expired readings transactionally", () => {
    const asOf = Date.now();
    dbInstance.prepare("INSERT INTO readings (device_id, t, distance_cm) VALUES (?, ?, ?)")
      .run(deviceId, asOf - 30 * 60_000, 180);
    const result = refreshRollups(asOf);
    expect(result.devices).toBe(1);
    expect(result.buckets).toBeGreaterThanOrEqual(2);
    expect(dbInstance.prepare("SELECT COUNT(*) AS count FROM reading_rollups WHERE device_id = ?").get(deviceId))
      .toMatchObject({ count: result.buckets });

    dbInstance.prepare("INSERT INTO readings (device_id, t, distance_cm) VALUES (?, ?, ?)")
      .run(deviceId, asOf - 100 * 24 * 60 * 60_000, 200);
    expect(purgeExpiredData(asOf).readings).toBe(1);
  });

  it("escalates overdue unacknowledged alerts and records the transition", async () => {
    const asOf = Date.now();
    const alerts = await import("@/server/repos/alerts");
    const alertId = alerts.open({
      tankId,
      type: "LOW_LEVEL",
      severity: "warning",
      message: "Low level",
      value: 30,
      at: asOf - 31 * 60_000,
      triggerT: null,
      triggerDistanceCm: null,
      simulated: false,
    });
    expect(await escalateUnacknowledged(asOf)).toBe(1);
    expect(alerts.getAlert(alertId, asOf)?.state).toBe("escalated");
    expect(dbInstance.prepare("SELECT action FROM audit_log WHERE entity_id = ?").get(String(alertId))).toMatchObject({
      action: "alert.escalate",
    });
  });
});

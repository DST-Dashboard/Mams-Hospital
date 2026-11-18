// [BE-14] OWNER: backend
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let mockCookieValue: string | undefined = undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "ohtms_session" && mockCookieValue ? { value: mockCookieValue } : undefined),
  }),
  headers: async () => new Headers(),
}));

let testDbPath: string;
let dbInstance: any;

describe("api-alerts", () => {
  let sign: typeof import("@/server/auth/session").sign;
  let alerts: typeof import("@/server/repos/alerts");
  let tanks: typeof import("@/server/repos/tanks");
  let readings: typeof import("@/server/repos/readings");
  let POST_ACK: typeof import("@/app/api/alerts/[id]/ack/route").POST;
  let POST_RESOLVE: typeof import("@/app/api/alerts/[id]/resolve/route").POST;
  let GET_DETAIL: typeof import("@/app/api/alerts/[id]/route").GET;

  const SECRET = "secret-key-must-be-long-enough-for-hs256-test";
  let alertId: number;
  let tankId: number;
  const deviceId = "device-alert-test-1";

  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-api-alerts-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = SECRET;

    const { openDb } = await import("@/server/db");
    const { runMigrations } = await import("@/server/migrations/runner");
    dbInstance = openDb(testDbPath);
    (globalThis as any).__ohtmsDb = dbInstance;
    runMigrations(dbInstance);
    dbInstance.prepare("INSERT INTO users (id, email, name, password_hash, role, disabled, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)")
      .run(2, "operator@test.local", "Priya Operator", "test-hash", "operator", Date.now());
    dbInstance.prepare("INSERT INTO users (id, email, name, password_hash, role, disabled, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)")
      .run(10, "viewer@test.local", "Guest Viewer", "test-hash", "viewer", Date.now());

    const sessionMod = await import("@/server/auth/session");
    const createSession = (await import("@/server/repos/sessions")).createSession;
    sign = async (session, secret, hours) => sessionMod.sign({
      ...session,
      sessionId: createSession(session.uid, hours),
    }, secret, hours);
    alerts = await import("@/server/repos/alerts");
    tanks = await import("@/server/repos/tanks");
    readings = await import("@/server/repos/readings");

    POST_ACK = (await import("@/app/api/alerts/[id]/ack/route")).POST;
    POST_RESOLVE = (await import("@/app/api/alerts/[id]/resolve/route")).POST;
    GET_DETAIL = (await import("@/app/api/alerts/[id]/route")).GET;

    // Seed device and tank
    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)").run(deviceId, Date.now());
    tankId = tanks.createTank({
      label: "ICU Reserve",
      deviceId,
      shape: "cylinder",
      heightCm: 250,
      radiusCm: 80,
      deadZoneCm: 20,
      dimsConfirmed: true,
      status: "active",
    });

    // Seed readings
    const now = Date.now();
    readings.upsertMany([
      { deviceId, t: now - 60_000, distanceCm: 190, rssi: -65, snr: 12.0, batteryPct: 92 },
      { deviceId, t: now, distanceCm: 190, rssi: -64, snr: 12.5, batteryPct: 91 },
    ]);

    // Open a test alert
    alertId = alerts.open({
      tankId,
      type: "LOW_LEVEL",
      severity: "warning",
      message: "ICU Reserve at 25% — below warning threshold",
      value: 25,
      at: now,
      triggerT: now,
      triggerDistanceCm: 190,
      simulated: false,
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
    } catch {}
  });

  it("ack needs operator", async () => {
    // 1. Unauthenticated request -> 401
    mockCookieValue = undefined;
    const req1 = new Request("http://localhost/api/alerts/1/ack", {
      method: "POST",
      body: JSON.stringify({ note: "Inspecting pump" }),
    });
    const res1 = await POST_ACK(req1, { params: Promise.resolve({ id: String(alertId) }) });
    expect(res1.status).toBe(401);

    // 2. Viewer role -> 403 (Requires operator)
    mockCookieValue = await sign({ uid: 10, role: "viewer", name: "Guest Viewer" }, SECRET, 1);
    const req2 = new Request("http://localhost/api/alerts/1/ack", {
      method: "POST",
      body: JSON.stringify({ note: "Trying to ack" }),
    });
    const res2 = await POST_ACK(req2, { params: Promise.resolve({ id: String(alertId) }) });
    expect(res2.status).toBe(403);

    // 3. Operator role -> 200
    mockCookieValue = await sign({ uid: 2, role: "operator", name: "Priya Operator" }, SECRET, 1);
    const req3 = new Request("http://localhost/api/alerts/1/ack", {
      method: "POST",
      body: JSON.stringify({ note: "Pump turned on manually" }),
    });
    const res3 = await POST_ACK(req3, { params: Promise.resolve({ id: String(alertId) }) });
    expect(res3.status).toBe(200);

    const updatedAlert = alerts.getAlert(alertId)!;
    expect(updatedAlert.state).toBe("acknowledged");
    expect(updatedAlert.ackNote).toBe("Pump turned on manually");
    expect(updatedAlert.acknowledgedBy).toBe(2);
  });

  it("ack writes audit", async () => {
    const auditRow = dbInstance
      .prepare("SELECT * FROM audit_log WHERE entity = 'alert' AND entity_id = ? AND action = 'alert.ack'")
      .get(String(alertId)) as any;

    expect(auditRow).toBeDefined();
    expect(auditRow.user_id).toBe(2);
    expect(auditRow.action).toBe("alert.ack");
    expect(JSON.parse(auditRow.after_json).note).toBe("Pump turned on manually");
  });

  it("resolve closes alert", async () => {
    mockCookieValue = await sign({ uid: 2, role: "operator", name: "Priya Operator" }, SECRET, 1);
    const req = new Request("http://localhost/api/alerts/1/resolve", {
      method: "POST",
      body: JSON.stringify({ note: "Tank level restored" }),
    });
    const res = await POST_RESOLVE(req, { params: Promise.resolve({ id: String(alertId) }) });
    expect(res.status).toBe(200);

    const resolvedAlert = alerts.getAlert(alertId)!;
    expect(resolvedAlert.state).toBe("resolved");
    expect(resolvedAlert.resolvedAt).not.toBeNull();

    // Verify it is no longer listed in open alerts
    const openAlerts = alerts.listOpen();
    expect(openAlerts.some((a) => a.id === alertId)).toBe(false);

    // Verify audit log entry
    const auditRow = dbInstance
      .prepare("SELECT * FROM audit_log WHERE entity = 'alert' AND entity_id = ? AND action = 'alert.resolve'")
      .get(String(alertId)) as any;
    expect(auditRow).toBeDefined();
    expect(auditRow.user_id).toBe(2);
  });

  it("alert detail includes trigger reading", async () => {
    mockCookieValue = await sign({ uid: 10, role: "viewer", name: "Viewer" }, SECRET, 1);
    const req = new Request("http://localhost/api/alerts/1");
    const res = await GET_DETAIL(req, { params: Promise.resolve({ id: String(alertId) }) });
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.id).toBe(alertId);
    expect(json.tankId).toBe(tankId);
    expect(json.tankLabel).toBe("ICU Reserve");
    expect(json.trigger).toBeDefined();
    expect(json.trigger.distanceCm).toBe(190);
    expect(typeof json.trigger.levelPct).toBe("number");
    expect(json.sensorHealth).toBeDefined();
    expect(json.sensorHealth.rssi).toBe(-64);
    expect(json.timeline).toBeInstanceOf(Array);
    expect(json.timeline.length).toBeGreaterThan(0);
    expect(json.timeline[0].event).toBe("opened");
  });
});

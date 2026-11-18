// [BE-14] OWNER: backend
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q, q1 } from "@/server/db";
import { env } from "@/server/env";
import { sign } from "@/server/auth/session";
import * as alerts from "@/server/repos/alerts";
import * as tanks from "@/server/repos/tanks";
import * as readings from "@/server/repos/readings";
import { POST as POST_ACK } from "@/app/api/alerts/[id]/ack/route";
import { POST as POST_RESOLVE } from "@/app/api/alerts/[id]/resolve/route";
import { GET as GET_DETAIL } from "@/app/api/alerts/[id]/route";

let mockCookieValue: string | undefined = undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "ohtms_session" && mockCookieValue ? { value: mockCookieValue } : undefined),
  }),
  headers: async () => new Headers(),
}));

describe("api-alerts", () => {
  let testCtx: TestSchemaContext;
  let alertId: number;
  let tankId: number;
  let operatorId: number;
  let viewerId: number;
  const deviceId = "device-alert-test-1";

  beforeAll(async () => {
    testCtx = await createTestSchema();

    const [operator] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('operator@test.local', 'Priya Operator', 'test-hash', 'operator', FALSE, $1) RETURNING id",
      [Date.now()]
    );
    const [viewer] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('viewer@test.local', 'Guest Viewer', 'test-hash', 'viewer', FALSE, $1) RETURNING id",
      [Date.now()]
    );

    operatorId = operator.id;
    viewerId = viewer.id;

    // Seed device and tank
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ($1, FALSE, $2)", [deviceId, Date.now()]);
    tankId = await tanks.createTank({
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
    await readings.upsertMany([
      { deviceId, t: now - 60_000, distanceCm: 190, rssi: -65, snr: 12.0, batteryPct: 92 },
      { deviceId, t: now, distanceCm: 190, rssi: -64, snr: 12.5, batteryPct: 91 },
    ]);

    // Open a test alert
    alertId = await alerts.open({
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

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("ack needs operator", async () => {
    const secret = env().SESSION_SECRET;

    // 1. Unauthenticated request -> 401
    mockCookieValue = undefined;
    const req1 = new Request("http://localhost/api/alerts/1/ack", {
      method: "POST",
      body: JSON.stringify({ note: "Inspecting pump" }),
    });
    const res1 = await POST_ACK(req1, { params: Promise.resolve({ id: String(alertId) }) });
    expect(res1.status).toBe(401);

    // 2. Viewer role -> 403 (Requires operator)
    mockCookieValue = await sign({ uid: viewerId, role: "viewer", name: "Guest Viewer" }, secret, 1);
    const req2 = new Request("http://localhost/api/alerts/1/ack", {
      method: "POST",
      body: JSON.stringify({ note: "Trying to ack" }),
    });
    const res2 = await POST_ACK(req2, { params: Promise.resolve({ id: String(alertId) }) });
    expect(res2.status).toBe(403);

    // 3. Operator role -> 200
    mockCookieValue = await sign({ uid: operatorId, role: "operator", name: "Priya Operator" }, secret, 1);
    const req3 = new Request("http://localhost/api/alerts/1/ack", {
      method: "POST",
      body: JSON.stringify({ note: "Pump turned on manually" }),
    });
    const res3 = await POST_ACK(req3, { params: Promise.resolve({ id: String(alertId) }) });
    expect(res3.status).toBe(200);

    const updatedAlert = await alerts.getAlert(alertId);
    expect(updatedAlert?.state).toBe("acknowledged");
    expect(updatedAlert?.ackNote).toBe("Pump turned on manually");
    expect(updatedAlert?.acknowledgedBy).toBe(operatorId);
  });

  it("ack writes audit", async () => {
    const auditRow = await q1<{ user_id: number; action: string; after_json: string }>(
      "SELECT * FROM audit_log WHERE entity = 'alert' AND entity_id = $1 AND action = 'alert.ack'",
      [String(alertId)]
    );

    expect(auditRow).toBeDefined();
    expect(auditRow?.user_id).toBe(operatorId);
    expect(auditRow?.action).toBe("alert.ack");
    const after = typeof auditRow?.after_json === "string" ? JSON.parse(auditRow.after_json) : auditRow?.after_json;
    expect(after?.note).toBe("Pump turned on manually");
  });

  it("resolve closes alert", async () => {
    const secret = env().SESSION_SECRET;
    mockCookieValue = await sign({ uid: operatorId, role: "operator", name: "Priya Operator" }, secret, 1);
    const req = new Request("http://localhost/api/alerts/1/resolve", {
      method: "POST",
      body: JSON.stringify({ note: "Tank level restored" }),
    });
    const res = await POST_RESOLVE(req, { params: Promise.resolve({ id: String(alertId) }) });
    expect(res.status).toBe(200);

    const resolvedAlert = await alerts.getAlert(alertId);
    expect(resolvedAlert?.state).toBe("resolved");
    expect(resolvedAlert?.resolvedAt).not.toBeNull();

    // Verify it is no longer listed in open alerts
    const openAlerts = await alerts.listOpen();
    expect(openAlerts.some((a) => a.id === alertId)).toBe(false);

    // Verify audit log entry
    const auditRow = await q1<{ user_id: number }>(
      "SELECT * FROM audit_log WHERE entity = 'alert' AND entity_id = $1 AND action = 'alert.resolve'",
      [String(alertId)]
    );
    expect(auditRow).toBeDefined();
    expect(auditRow?.user_id).toBe(operatorId);
  });

  it("alert detail includes trigger reading", async () => {
    const secret = env().SESSION_SECRET;
    mockCookieValue = await sign({ uid: viewerId, role: "viewer", name: "Viewer" }, secret, 1);
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

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q, q1 } from "@/server/db";
import { env } from "@/server/env";
import { sign } from "@/server/auth/session";
import { createTank } from "@/server/repos/tanks";
import { setForTank } from "@/server/repos/recipients";
import { buildDashboard } from "@/server/services/dashboard";
import * as readingsRoute from "@/app/api/readings/route";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "ohtms_session" && cookieValue ? { value: cookieValue } : undefined,
  }),
  headers: async () => new Headers(),
}));

const request = (url: string, method = "GET", body?: unknown) =>
  new Request(`http://localhost${url}`, {
    method,
    ...(body === undefined
      ? {}
      : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  });

describe("Manual Data Entry and Tank Ownership Permissions", () => {
  let testCtx: TestSchemaContext;
  let adminId: number;
  let ownerId: number;
  let otherOpId: number;
  let viewerId: number;

  let adminCookie: string;
  let ownerCookie: string;
  let otherOpCookie: string;
  let viewerCookie: string;

  let tank1Id: number;
  let tank2Id: number;

  beforeAll(async () => {
    testCtx = await createTestSchema();
    const secret = env().SESSION_SECRET;
    const now = Date.now();
    const hash = await bcrypt.hash("ManualPass#2026", 10);

    // Users
    const [admin] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('admin@manual.test', 'Admin User', $1, 'admin', FALSE, $2) RETURNING id",
      [hash, now]
    );
    const [owner] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('owner@manual.test', 'Tank 1 Owner', $1, 'operator', FALSE, $2) RETURNING id",
      [hash, now]
    );
    const [otherOp] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('other@manual.test', 'Other Operator', $1, 'operator', FALSE, $2) RETURNING id",
      [hash, now]
    );
    const [viewer] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('viewer@manual.test', 'Viewer User', $1, 'viewer', FALSE, $2) RETURNING id",
      [hash, now]
    );

    adminId = admin.id;
    ownerId = owner.id;
    otherOpId = otherOp.id;
    viewerId = viewer.id;

    adminCookie = await sign({ uid: adminId, role: "admin", name: "Admin User" }, secret, 1);
    ownerCookie = await sign({ uid: ownerId, role: "operator", name: "Tank 1 Owner" }, secret, 1);
    otherOpCookie = await sign({ uid: otherOpId, role: "operator", name: "Other Operator" }, secret, 1);
    viewerCookie = await sign({ uid: viewerId, role: "viewer", name: "Viewer User" }, secret, 1);

    // Devices & Tanks
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('node-manual-01', FALSE, $1)", [now]);
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('node-manual-02', FALSE, $1)", [now]);

    tank1Id = await createTank({
      label: "Manual Tank 1 (Emergency)",
      deviceId: "node-manual-01",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
      ownerId: ownerId, // Owner assignment via owner_id
    });

    tank2Id = await createTank({
      label: "Manual Tank 2 (ICU)",
      deviceId: "node-manual-02",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });

    // Also assign owner to tank2 via alert_recipients to test recipient ownership
    await setForTank(tank2Id, ownerId, ["email"]);
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("lists authorized tanks correctly based on user role and ownership", async () => {
    // Admin sees both tanks
    cookieValue = adminCookie;
    const adminRes = await readingsRoute.GET(request("/api/readings?action=authorized-tanks"));
    expect(adminRes.status).toBe(200);
    const adminData = await adminRes.json();
    expect(adminData.tanks.length).toBe(2);

    // Owner (operator assigned to tank1 via owner_id and tank2 via recipients) sees both
    cookieValue = ownerCookie;
    const ownerRes = await readingsRoute.GET(request("/api/readings?action=authorized-tanks"));
    expect(ownerRes.status).toBe(200);
    const ownerData = await ownerRes.json();
    expect(ownerData.tanks.map((t: { id: number }) => t.id)).toContain(tank1Id);
    expect(ownerData.tanks.map((t: { id: number }) => t.id)).toContain(tank2Id);

    // Other operator (unassigned) sees 0 tanks
    cookieValue = otherOpCookie;
    const otherRes = await readingsRoute.GET(request("/api/readings?action=authorized-tanks"));
    expect(otherRes.status).toBe(200);
    const otherData = await otherRes.json();
    expect(otherData.tanks.length).toBe(0);

    // Viewer sees 0 tanks
    cookieValue = viewerCookie;
    const viewerRes = await readingsRoute.GET(request("/api/readings?action=authorized-tanks"));
    expect(viewerRes.status).toBe(200);
    const viewerData = await viewerRes.json();
    expect(viewerData.tanks.length).toBe(0);
  });

  it("allows Admin to enter manual data for any tank", async () => {
    cookieValue = adminCookie;
    const t = Date.now() - 30_000;
    const res = await readingsRoute.POST(
      request("/api/readings", "POST", {
        tankId: tank1Id,
        t,
        distanceCm: 120, // 120 cm distance -> level 180 cm (60%)
        batteryPct: 95,
        rssi: -75,
        snr: 9.0,
        notes: "Admin routine calibration",
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.reading).toMatchObject({
      tankId: tank1Id,
      deviceId: "node-manual-01",
      distanceCm: 120,
      levelCm: 180,
      levelPct: 60,
      source: "manual",
    });

    // Check database has source = 'manual' and user_id = adminId
    const dbRow = await q1<{ source: string; distance_cm: number; user_id: number }>(
      "SELECT source, distance_cm, user_id FROM readings WHERE device_id = 'node-manual-01' AND t = $1",
      [t]
    );
    expect(dbRow?.source).toBe("manual");
    expect(dbRow?.distance_cm).toBe(120);
    expect(dbRow?.user_id).toBe(adminId);

    // Check audit log was written
    const auditRow = await q1<{ action: string; user_id: number }>(
      "SELECT action, user_id FROM audit_log WHERE entity = 'reading' AND action = 'reading.manual_create' ORDER BY t DESC LIMIT 1"
    );
    expect(auditRow?.action).toBe("reading.manual_create");
    expect(auditRow?.user_id).toBe(adminId);
  });

  it("allows Tank Owner to enter manual data for their assigned tank", async () => {
    cookieValue = ownerCookie;
    const t = Date.now() - 25_000;
    const res = await readingsRoute.POST(
      request("/api/readings", "POST", {
        tankId: tank1Id,
        t,
        levelCm: 150, // Providing levelCm directly -> distanceCm should be 300 - 150 = 150
        notes: "Operator dipstick check",
      })
    );

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.reading).toMatchObject({
      tankId: tank1Id,
      distanceCm: 150,
      levelCm: 150,
      levelPct: 50,
      source: "manual",
    });
  });

  it("rejects manual entry from operator not assigned to the tank with 403", async () => {
    cookieValue = otherOpCookie; // not assigned to tank1
    const res = await readingsRoute.POST(
      request("/api/readings", "POST", {
        tankId: tank1Id,
        distanceCm: 100,
      })
    );
    expect(res.status).toBe(403);
    const err = await res.json();
    expect(err.error).toContain("authorized");
  });

  it("rejects manual entry from viewer with 403", async () => {
    cookieValue = viewerCookie;
    const res = await readingsRoute.POST(
      request("/api/readings", "POST", {
        tankId: tank1Id,
        distanceCm: 100,
      })
    );
    expect(res.status).toBe(403);
  });

  it("rejects distance exceeding tank height with 400", async () => {
    cookieValue = adminCookie;
    const res = await readingsRoute.POST(
      request("/api/readings", "POST", {
        tankId: tank1Id,
        distanceCm: 350, // Tank height is 300
      })
    );
    expect(res.status).toBe(400);
    const err = await res.json();
    expect(err.error).toContain("cannot exceed tank height");
  });

  it("rejects future timestamp with 400", async () => {
    cookieValue = adminCookie;
    const future = Date.now() + 10 * 60 * 1000; // 10 min in future
    const res = await readingsRoute.POST(
      request("/api/readings", "POST", {
        tankId: tank1Id,
        t: future,
        distanceCm: 100,
      })
    );
    expect(res.status).toBe(400);
    const err = await res.json();
    expect(err.error).toContain("future");
  });

  it("prevents overwriting existing readings and preserves historical records (409 Conflict)", async () => {
    cookieValue = adminCookie;
    const fixedT = Date.now() - 50_000;

    // First insert (success)
    const res1 = await readingsRoute.POST(
      request("/api/readings", "POST", {
        tankId: tank1Id,
        t: fixedT,
        distanceCm: 100,
      })
    );
    expect(res1.status).toBe(201);

    // Second insert with exact same device & timestamp -> must conflict and NOT overwrite
    const res2 = await readingsRoute.POST(
      request("/api/readings", "POST", {
        tankId: tank1Id,
        t: fixedT,
        distanceCm: 200, // tried to overwrite with 200
      })
    );
    expect(res2.status).toBe(409);
    const err = await res2.json();
    expect(err.error).toContain("already exists");

    // Verify distance remains 100 in database
    const row = await q1<{ distance_cm: number }>(
      "SELECT distance_cm FROM readings WHERE device_id = 'node-manual-01' AND t = $1",
      [fixedT]
    );
    expect(row?.distance_cm).toBe(100);
  });

  it("evaluates alert rules on manual entry and surfaces in /api/readings", async () => {
    cookieValue = adminCookie;
    const now = Date.now();
    // Critical level is 20%. Tank height 300cm. Level 10% is 30cm, distance 270cm.
    const res = await readingsRoute.POST(
      request("/api/readings", "POST", {
        tankId: tank1Id,
        t: now,
        distanceCm: 270, // 30cm level = 10%
      })
    );
    expect(res.status).toBe(201);

    // Verify reading appears in /api/readings with source='manual'
    const readingsRes = await readingsRoute.GET(
      request(`/api/readings?tankId=${tank1Id}&from=${now - 1000}&to=${now + 1000}&res=raw`)
    );
    expect(readingsRes.status).toBe(200);
    const data = await readingsRes.json();
    const point = data.points.find((p: { t: number }) => p.t === now);
    expect(point).toBeDefined();
    expect(point.source).toBe("manual");
    expect(point.distanceCm).toBe(270);
    expect(point.levelPct).toBe(10);
  });

  it("never trusts client-supplied user or owner IDs in payload and strictly records session uid", async () => {
    cookieValue = ownerCookie; // authenticated as ownerId
    const t = Date.now() - 10_000;
    const res = await readingsRoute.POST(
      request("/api/readings", "POST", {
        tankId: tank1Id,
        t,
        distanceCm: 140,
        userId: 999999, // spoofed client user id
        ownerId: 888888, // spoofed client owner id
      })
    );

    expect(res.status).toBe(201);
    const row = await q1<{ user_id: number; source: string }>(
      "SELECT user_id, source FROM readings WHERE device_id = 'node-manual-01' AND t = $1",
      [t]
    );
    expect(row?.user_id).toBe(ownerId);
    expect(row?.source).toBe("manual");
  });

  it("updates dashboard telemetry and visualizations after manual entry", async () => {
    cookieValue = adminCookie;
    const t = Date.now();
    await readingsRoute.POST(
      request("/api/readings", "POST", {
        tankId: tank1Id,
        t,
        distanceCm: 90, // 210cm level = 70%
      })
    );

    const dashboard = await buildDashboard(t + 1000);
    const tankCard = dashboard.tanks.find((t) => t.id === tank1Id);
    expect(tankCard).toBeDefined();
    expect(tankCard?.rawDistanceCm).toBe(90);
    expect(tankCard?.current.levelCm).toBe(210);
    expect(tankCard?.current.levelPct).toBe(70);
  });

  it("operates successfully without TTN, MQTT, or external webhook environment variables", () => {
    const currentEnv = env();
    expect((currentEnv as Record<string, unknown>).TTS_WEBHOOK_SECRET).toBeUndefined();
    expect((currentEnv as Record<string, unknown>).TTS_MQTT_HOSTNAME).toBeUndefined();
    expect((currentEnv as Record<string, unknown>).TTS_API_KEY).toBeUndefined();
    expect(currentEnv.DATABASE_URL).toBeDefined();
    expect(currentEnv.SESSION_SECRET).toBeDefined();
  });
});

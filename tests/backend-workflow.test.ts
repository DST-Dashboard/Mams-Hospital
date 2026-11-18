import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import bcrypt from "bcryptjs";
import { z } from "zod";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "ohtms_session" && cookieValue ? { value: cookieValue } : undefined }),
  headers: async () => new Headers(),
}));

let testDbPath: string;
let dbInstance: ReturnType<typeof import("@/server/db").openDb>;
let zoneId: number;
let tankId: number;
let alertId: number;
let operatorCookie: string;
let adminCookie: string;
let zonesRoute: typeof import("@/app/api/zones/route");
let tanksRoute: typeof import("@/app/api/tanks/route");
let tankRoute: typeof import("@/app/api/tanks/[id]/route");
let ingestRoute: typeof import("@/app/api/ingest/tts/route");
let alertsRoute: typeof import("@/app/api/alerts/route");
let alertRoute: typeof import("@/app/api/alerts/[id]/route");
let ackRoute: typeof import("@/app/api/alerts/[id]/ack/route");
let resolveRoute: typeof import("@/app/api/alerts/[id]/resolve/route");
let auditRoute: typeof import("@/app/api/audit/route");
let weeklyReportRoute: typeof import("@/app/api/reports/weekly/route");

const sessionSecret = "full-backend-workflow-test-session-secret";
const ingestSecret = "full-backend-workflow-ingest-secret";
const context = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const request = (url: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${url}`, {
    method,
    headers: {
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

describe("complete backend workflow", () => {
  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-workflow-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = sessionSecret;
    process.env.TTS_WEBHOOK_SECRET = ingestSecret;
    process.env.CLOCK_MODE = "live";

    const database = await import("@/server/db");
    dbInstance = database.openDb(testDbPath);
    (globalThis as typeof globalThis & { __ohtmsDb?: ReturnType<typeof database.openDb> }).__ohtmsDb = dbInstance;

    const now = Date.now();
    const passwordHash = await bcrypt.hash("WorkflowOperator#2026", 10);
    dbInstance.prepare(`
      INSERT INTO users (id, email, name, password_hash, role, disabled, created_at)
      VALUES (1, ?, ?, ?, 'admin', 0, ?)
    `).run("workflow-admin@example.test", "Workflow Admin", passwordHash, now);
    dbInstance.prepare(`
      INSERT INTO users (id, email, name, password_hash, role, disabled, created_at)
      VALUES (2, ?, ?, ?, 'operator', 0, ?)
    `).run("workflow-operator@example.test", "Workflow Operator", passwordHash, now);
    const sessions = await import("@/server/repos/sessions");
    const authSession = await import("@/server/auth/session");
    adminCookie = await authSession.sign(
      { uid: 1, role: "admin", name: "Workflow Admin", sessionId: sessions.createSession(1) },
      sessionSecret,
      1,
    );
    operatorCookie = await authSession.sign(
      { uid: 2, role: "operator", name: "Workflow Operator", sessionId: sessions.createSession(2) },
      sessionSecret,
      1,
    );

    zonesRoute = await import("@/app/api/zones/route");
    tanksRoute = await import("@/app/api/tanks/route");
    tankRoute = await import("@/app/api/tanks/[id]/route");
    ingestRoute = await import("@/app/api/ingest/tts/route");
    alertsRoute = await import("@/app/api/alerts/route");
    alertRoute = await import("@/app/api/alerts/[id]/route");
    ackRoute = await import("@/app/api/alerts/[id]/ack/route");
    resolveRoute = await import("@/app/api/alerts/[id]/resolve/route");
    auditRoute = await import("@/app/api/audit/route");
    weeklyReportRoute = await import("@/app/api/reports/weekly/route");
  });

  afterAll(() => {
    dbInstance.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it("authenticates, provisions a tank, ingests readings, runs alert lifecycle, and verifies notifications, audit, and report", async () => {
    cookieValue = operatorCookie;
    expect((await zonesRoute.POST(request("/api/zones", "POST", { name: "Forbidden Ward" }))).status).toBe(403);

    cookieValue = adminCookie;
    expect((await tanksRoute.GET(request("/api/tanks", "GET"))).status).toBe(200);
    const zoneResponse = await zonesRoute.POST(request("/api/zones", "POST", { name: "Workflow Ward" }));
    expect(zoneResponse.status).toBe(201);
    zoneId = z.object({ id: z.number().int() }).parse(await zoneResponse.json()).id;

    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)")
      .run("workflow-node-01", Date.now());
    const createdTank = await tanksRoute.POST(request("/api/tanks", "POST", {
      label: "Workflow tank",
      deviceId: "workflow-node-01",
      zone: "Workflow Ward",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
      warnPct: 40,
      critPct: 20,
      emptyPct: 5,
    }));
    expect(createdTank.status).toBe(201);
    tankId = z.object({ id: z.number().int() }).parse(await createdTank.json()).id;
    expect((await tankRoute.GET(request(`/api/tanks/${tankId}`, "GET"), context(tankId))).status).toBe(200);

    for (const offset of [-120_000, -60_000, 0]) {
      const uplink = {
        received_at: new Date(Date.now() + offset).toISOString(),
        end_device_ids: { device_id: "workflow-node-01" },
        uplink_message: { decoded_payload: { Node1_distance_cm: 200 } },
      };
      const response = await ingestRoute.POST(request(
        "/api/ingest/tts",
        "POST",
        uplink,
        { "x-webhook-secret": ingestSecret, "x-forwarded-for": "192.0.2.77" },
      ));
      expect(response.status).toBe(200);
    }

    const tank = await tankRoute.GET(request(`/api/tanks/${tankId}`, "GET"), context(tankId));
    await expect(tank.json()).resolves.toMatchObject({ label: "Workflow tank", zone: "Workflow Ward" });
    const alertList = await alertsRoute.GET(request("/api/alerts", "GET"));
    expect(alertList.status).toBe(200);
    const alertBody = z.array(z.object({ id: z.number(), type: z.string() })).parse(await alertList.json());
    const lowLevelAlert = alertBody.find((item) => item.type === "LOW_LEVEL");
    expect(lowLevelAlert).toBeDefined();
    alertId = lowLevelAlert!.id;

    const alertDetail = await alertRoute.GET(request(`/api/alerts/${alertId}`, "GET"), context(alertId));
    expect(alertDetail.status).toBe(200);
    await expect(alertDetail.json()).resolves.toMatchObject({ id: alertId, tankId });

    const prefs = await import("@/server/repos/notification-prefs");
    prefs.saveNotificationPrefs(2, {
      ...prefs.DEFAULT_NOTIFICATION_PREFS,
      channelsBySeverity: { ...prefs.DEFAULT_NOTIFICATION_PREFS.channelsBySeverity, warning: ["in_app"] },
    });
    prefs.saveNotificationPrefs(1, {
      ...prefs.DEFAULT_NOTIFICATION_PREFS,
      channelsBySeverity: { ...prefs.DEFAULT_NOTIFICATION_PREFS.channelsBySeverity, warning: [] },
    });
    const dispatcher = await import("@/server/notify/dispatcher");
    await expect(dispatcher.dispatchAlert(alertId)).resolves.toEqual({ attempted: 1 });
    const deliveries = (await import("@/server/repos/notifications")).listDeliveries(alertId);
    expect(deliveries).toMatchObject([{ channel: "in_app", recipient: "user:2", status: "sent" }]);

    cookieValue = operatorCookie;
    const acknowledged = await ackRoute.POST(request(`/api/alerts/${alertId}/ack`, "POST", { note: "Workflow acknowledgement" }), context(alertId));
    expect(acknowledged.status).toBe(200);
    const resolved = await resolveRoute.POST(request(`/api/alerts/${alertId}/resolve`, "POST", { note: "Workflow resolved" }), context(alertId));
    expect(resolved.status).toBe(200);
    await expect(resolved.json()).resolves.toMatchObject({ state: "resolved" });

    const auditResponse = await auditRoute.GET(request("/api/audit?entity=alert&userId=2", "GET"));
    expect(auditResponse.status).toBe(403);
    cookieValue = adminCookie;
    const auditList = await auditRoute.GET(request("/api/audit?entity=alert&userId=2", "GET"));
    expect(auditList.status).toBe(200);
    const audit = (await import("@/server/repos/audit")).listAudit({ entity: "alert", userId: 2, page: 1, pageSize: 20 });
    expect(audit.items.map((entry) => entry.action)).toEqual(expect.arrayContaining(["alert.ack", "alert.resolve"]));

    const report = await weeklyReportRoute.GET(request("/api/reports/weekly?format=csv", "GET"));
    expect(report.status).toBe(200);
    const csv = await report.text();
    expect(csv).toContain("Workflow tank");
    expect((await import("@/server/repos/zones")).getZone(zoneId)?.tankCount).toBe(1);
  }, 15_000);
});

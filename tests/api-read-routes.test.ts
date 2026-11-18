import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import bcrypt from "bcryptjs";
import { CompareDTO, HeatmapDTO } from "@/contracts/analytics";
import { NotificationPrefsDTO } from "@/contracts/settings";
import { z } from "zod";

vi.mock("@/server/notify/push-endpoint", async () => {
  const { Agent } = await import("node:https");
  return { createPushEndpointAgent: async () => new Agent() };
});

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "ohtms_session" && cookieValue ? { value: cookieValue } : undefined }),
  headers: async () => new Headers(),
}));

let testDbPath: string;
let dbInstance: ReturnType<typeof import("@/server/db").openDb>;
let tankId: number;
let alertId: number;
let adminCookie: string;
let dashboardRoute: typeof import("@/app/api/dashboard/route");
let tanksRoute: typeof import("@/app/api/tanks/route");
let tankRoute: typeof import("@/app/api/tanks/[id]/route");
let tankAnalyticsRoute: typeof import("@/app/api/tanks/[id]/analytics/route");
let readingsRoute: typeof import("@/app/api/readings/route");
let compareRoute: typeof import("@/app/api/analytics/compare/route");
let heatmapRoute: typeof import("@/app/api/analytics/heatmap/route");
let alertsRoute: typeof import("@/app/api/alerts/route");
let snoozeRoute: typeof import("@/app/api/alerts/[id]/snooze/route");
let weeklyRoute: typeof import("@/app/api/reports/weekly/route");
let monthlyRoute: typeof import("@/app/api/reports/monthly/route");
let incidentRoute: typeof import("@/app/api/reports/incident/route");
let readingsExportRoute: typeof import("@/app/api/readings/export/route");
let settingsRoute: typeof import("@/app/api/settings/notifications/route");
let pushRoute: typeof import("@/app/api/notifications/push/route");
const sessionSecret = "read-api-integration-session-secret";

const request = (url: string, method = "GET", body?: unknown) => new Request(`http://localhost${url}`, {
  method,
  ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
});
const context = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

describe("read, report, and preference API integration", () => {
  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-read-api-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = sessionSecret;
    process.env.CLOCK_MODE = "live";
    const database = await import("@/server/db");
    dbInstance = database.openDb(testDbPath);
    (globalThis as typeof globalThis & { __ohtmsDb?: ReturnType<typeof database.openDb> }).__ohtmsDb = dbInstance;

    const now = Date.now();
    const passwordHash = await bcrypt.hash("ReadApiPassword#2026", 10);
    dbInstance.prepare("INSERT INTO users (id, email, name, password_hash, role, disabled, created_at) VALUES (1, ?, ?, ?, 'admin', 0, ?)")
      .run("read-api@example.test", "Read API Admin", passwordHash, now);
    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)")
      .run("wio-e5-node-01", now);
    const sessions = await import("@/server/repos/sessions");
    const authSession = await import("@/server/auth/session");
    adminCookie = await authSession.sign(
      { uid: 1, role: "admin", name: "Read API Admin", sessionId: sessions.createSession(1) },
      sessionSecret,
      1,
    );
    const tanks = await import("@/server/repos/tanks");
    tankId = tanks.createTank({
      label: "Read API tank",
      deviceId: "wio-e5-node-01",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });
    const readings = await import("@/server/repos/readings");
    readings.upsertMany([{ deviceId: "wio-e5-node-01", t: now - 60_000, distanceCm: 100, fCnt: 1, rssi: -70, snr: 8, batteryPct: 90 }]);
    const alerts = await import("@/server/repos/alerts");
    alertId = alerts.open({
      tankId,
      type: "LOW_LEVEL",
      severity: "warning",
      message: "Read API test alert",
      value: 25,
      at: now,
      triggerT: now - 60_000,
      triggerDistanceCm: 100,
      simulated: false,
    });

    dashboardRoute = await import("@/app/api/dashboard/route");
    tanksRoute = await import("@/app/api/tanks/route");
    tankRoute = await import("@/app/api/tanks/[id]/route");
    tankAnalyticsRoute = await import("@/app/api/tanks/[id]/analytics/route");
    readingsRoute = await import("@/app/api/readings/route");
    compareRoute = await import("@/app/api/analytics/compare/route");
    heatmapRoute = await import("@/app/api/analytics/heatmap/route");
    alertsRoute = await import("@/app/api/alerts/route");
    snoozeRoute = await import("@/app/api/alerts/[id]/snooze/route");
    weeklyRoute = await import("@/app/api/reports/weekly/route");
    monthlyRoute = await import("@/app/api/reports/monthly/route");
    incidentRoute = await import("@/app/api/reports/incident/route");
    readingsExportRoute = await import("@/app/api/readings/export/route");
    settingsRoute = await import("@/app/api/settings/notifications/route");
    pushRoute = await import("@/app/api/notifications/push/route");
  });

  afterAll(() => {
    dbInstance.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it("serves dashboard, tank, readings, and analytics data from SQLite", async () => {
    cookieValue = adminCookie;
    expect((await dashboardRoute.GET()).status).toBe(200);
    const tankList = await tanksRoute.GET(request("/api/tanks"));
    expect(tankList.status).toBe(200);
    await expect(tankRoute.GET(request(`/api/tanks/${tankId}`), context(tankId)).then((response) => response.json()))
      .resolves.toMatchObject({ id: tankId, label: "Read API tank" });

    const now = Date.now();
    const from = now - 24 * 60 * 60 * 1000;
    const readingsResponse = await readingsRoute.GET(request(`/api/readings?tankId=${tankId}&from=${from}&to=${now}&res=raw`));
    expect(readingsResponse.status).toBe(200);
    await expect(readingsResponse.json()).resolves.toMatchObject({ tankId, count: 1, points: [expect.objectContaining({ distanceCm: 100 })] });
    expect((await readingsRoute.GET(request(`/api/readings?tankId=${tankId}&from=${now}&to=${from}`))).status).toBe(400);

    const compare = await compareRoute.GET(request(`/api/analytics/compare?from=${from}&to=${now}`));
    expect(compare.status).toBe(200);
    expect(CompareDTO.safeParse(await compare.json()).success).toBe(true);

    const heatmap = await heatmapRoute.GET(request(`/api/analytics/heatmap?tankId=${tankId}&from=${from}&to=${now}&tz=UTC`));
    expect(heatmap.status).toBe(200);
    expect(HeatmapDTO.safeParse(await heatmap.json()).success).toBe(true);
    expect((await tankAnalyticsRoute.GET(request(`/api/tanks/${tankId}/analytics`), context(tankId))).status).toBe(200);
  });

  it("serves alert list, snooze not-found, and weekly/monthly/incident/readings exports", async () => {
    cookieValue = adminCookie;
    expect((await alertsRoute.GET(request("/api/alerts"))).status).toBe(200);
    const snoozed = await snoozeRoute.POST(request(`/api/alerts/${alertId}/snooze`, "POST", { minutes: 30 }), context(alertId));
    expect(snoozed.status).toBe(200);
    await expect(snoozed.json()).resolves.toMatchObject({ id: alertId, state: "snoozed" });
    expect((await snoozeRoute.POST(request("/api/alerts/999/snooze", "POST", { minutes: 30 }), context(999))).status).toBe(404);

    for (const route of [weeklyRoute, monthlyRoute]) {
      const response = await route.GET(request("/api/reports?format=csv"));
      expect(response.status).toBe(200);
      expect(response.headers.get("content-disposition")).toContain("attachment");
      expect(await response.text()).toContain("tank");
    }
    const incidentResponse = await incidentRoute.GET(request(`/api/reports/incident?alertId=${alertId}&format=csv`));
    expect(incidentResponse.status).toBe(200);
    expect(incidentResponse.headers.get("content-disposition")).toContain("attachment");

    const exportResponse = await readingsExportRoute.GET(request(`/api/readings/export?format=csv&tankId=${tankId}`));
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers.get("content-disposition")).toContain("attachment");
    expect(await exportResponse.text()).toContain("wio-e5-node-01");
  });

  it("persists notification preferences and push subscription lifecycle", async () => {
    cookieValue = adminCookie;
    const currentResponse = await settingsRoute.GET();
    expect(currentResponse.status).toBe(200);
    const prefs = NotificationPrefsDTO.parse(await currentResponse.json());
    const updatedPrefs = { ...prefs, quietHours: { enabled: true, start: "23:00", end: "05:00" } };
    const savedResponse = await settingsRoute.PUT(request("/api/settings/notifications", "PUT", updatedPrefs));
    expect(savedResponse.status).toBe(200);
    expect(NotificationPrefsDTO.parse(await savedResponse.json()).quietHours.enabled).toBe(true);

    const subscription = {
      endpoint: "https://fcm.googleapis.com/subscription/1",
      keys: { p256dh: "p".repeat(32), auth: "a".repeat(16) },
    };
    const subscribed = await pushRoute.POST(request("/api/notifications/push", "POST", subscription));
    expect(subscribed.status).toBe(201);
    const subscriptionId = z.object({ id: z.number().int() }).parse(await subscribed.json()).id;
    expect(dbInstance.prepare("SELECT endpoint FROM push_subscriptions WHERE id = ?").get(subscriptionId))
      .toMatchObject({ endpoint: subscription.endpoint });

    expect((await pushRoute.DELETE(request("/api/notifications/push", "DELETE", { endpoint: subscription.endpoint }))).status).toBe(200);
    expect(dbInstance.prepare("SELECT id FROM push_subscriptions WHERE id = ?").get(subscriptionId)).toBeUndefined();
  });
});

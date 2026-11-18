import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q } from "@/server/db";
import { env } from "@/server/env";
import { sign } from "@/server/auth/session";
import { createTank } from "@/server/repos/tanks";
import { upsertMany } from "@/server/repos/readings";
import { open } from "@/server/repos/alerts";
import { NotificationPrefsDTO } from "@/contracts/settings";

import * as dashboardRoute from "@/app/api/dashboard/route";
import * as tanksRoute from "@/app/api/tanks/route";
import * as tankRoute from "@/app/api/tanks/[id]/route";
import * as tankAnalyticsRoute from "@/app/api/tanks/[id]/analytics/route";
import * as readingsRoute from "@/app/api/readings/route";
import * as alertsRoute from "@/app/api/alerts/route";
import * as snoozeRoute from "@/app/api/alerts/[id]/snooze/route";
import * as weeklyRoute from "@/app/api/reports/weekly/route";
import * as monthlyRoute from "@/app/api/reports/monthly/route";
import * as incidentRoute from "@/app/api/reports/incident/route";
import * as readingsExportRoute from "@/app/api/readings/export/route";
import * as settingsRoute from "@/app/api/settings/notifications/route";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "ohtms_session" && cookieValue ? { value: cookieValue } : undefined }),
  headers: async () => new Headers(),
}));

const request = (url: string, method = "GET", body?: unknown) => new Request(`http://localhost${url}`, {
  method,
  ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
});
const context = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

describe("read, report, and preference API integration", () => {
  let testCtx: TestSchemaContext;
  let tankId: number;
  let alertId: number;
  let adminCookie: string;

  beforeAll(async () => {
    testCtx = await createTestSchema();
    const secret = env().SESSION_SECRET;
    const now = Date.now();
    const passwordHash = await bcrypt.hash("ReadApiPassword#2026", 10);

    const [admin] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('read-api@example.test', 'Read API Admin', $1, 'admin', FALSE, $2) RETURNING id",
      [passwordHash, now]
    );

    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('wio-e5-node-01', FALSE, $1)", [now]);

    adminCookie = await sign({ uid: admin.id, role: "admin", name: "Read API Admin" }, secret, 1);

    tankId = await createTank({
      label: "Read API tank",
      deviceId: "wio-e5-node-01",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });

    await upsertMany([{ deviceId: "wio-e5-node-01", t: now - 60_000, distanceCm: 100, fCnt: 1, rssi: -70, snr: 8, batteryPct: 90 }]);

    alertId = await open({
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
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("serves dashboard, tank, readings, and analytics data", async () => {
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
      expect(await response.text()).toContain("Tank");
    }
    const incidentResponse = await incidentRoute.GET(request(`/api/reports/incident?alertId=${alertId}&format=csv`));
    expect(incidentResponse.status).toBe(200);
    expect(incidentResponse.headers.get("content-disposition")).toContain("attachment");

    const exportResponse = await readingsExportRoute.GET(request(`/api/readings/export?format=csv&tankId=${tankId}`));
    expect(exportResponse.status).toBe(200);
    expect(exportResponse.headers.get("content-disposition")).toContain("attachment");
    expect(await exportResponse.text()).toContain("wio-e5-node-01");
  });

  it("persists notification preferences", async () => {
    cookieValue = adminCookie;
    const currentResponse = await settingsRoute.GET();
    expect(currentResponse.status).toBe(200);
    const prefs = NotificationPrefsDTO.parse(await currentResponse.json());
    const updatedPrefs = { ...prefs, quietHours: { enabled: true, start: "23:00", end: "05:00" } };
    const savedResponse = await settingsRoute.PUT(request("/api/settings/notifications", "PUT", updatedPrefs));
    expect(savedResponse.status).toBe(200);
    expect(NotificationPrefsDTO.parse(await savedResponse.json()).quietHours.enabled).toBe(true);
  });
});

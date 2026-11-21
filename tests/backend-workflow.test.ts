import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q } from "@/server/db";
import { env } from "@/server/env";
import { sign } from "@/server/auth/session";

import * as tanksRoute from "@/app/api/tanks/route";
import * as tankRoute from "@/app/api/tanks/[id]/route";
import * as manualReadingRoute from "@/app/api/readings/manual/route";
import * as alertsRoute from "@/app/api/alerts/route";
import * as alertRoute from "@/app/api/alerts/[id]/route";
import * as ackRoute from "@/app/api/alerts/[id]/ack/route";
import * as resolveRoute from "@/app/api/alerts/[id]/resolve/route";
import * as auditRoute from "@/app/api/audit/route";
import * as weeklyReportRoute from "@/app/api/reports/weekly/route";
import { listAudit } from "@/server/repos/audit";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "ohtms_session" && cookieValue ? { value: cookieValue } : undefined }),
  headers: async () => new Headers(),
}));

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
  let testCtx: TestSchemaContext;
  let tankId: number;
  let alertId: number;
  let operatorCookie: string;
  let viewerCookie: string;
  let adminCookie: string;
  let operatorId: number;
  let adminId: number;

  beforeAll(async () => {
    testCtx = await createTestSchema();
    const secret = env().SESSION_SECRET;
    const now = Date.now();
    const passwordHash = await bcrypt.hash("WorkflowOperator#2026", 10);

    const [admin] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('workflow-admin@example.test', 'Workflow Admin', $1, 'admin', FALSE, $2) RETURNING id",
      [passwordHash, now]
    );
    const [operator] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('workflow-operator@example.test', 'Workflow Operator', $1, 'operator', FALSE, $2) RETURNING id",
      [passwordHash, now]
    );
    const [viewer] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('workflow-viewer@example.test', 'Workflow Viewer', $1, 'viewer', FALSE, $2) RETURNING id",
      [passwordHash, now]
    );
    adminId = admin.id;
    operatorId = operator.id;

    adminCookie = await sign({ uid: adminId, role: "admin", name: "Workflow Admin" }, secret, 1);
    operatorCookie = await sign({ uid: operatorId, role: "operator", name: "Workflow Operator" }, secret, 1);
    viewerCookie = await sign({ uid: viewer.id, role: "viewer", name: "Workflow Viewer" }, secret, 1);
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("provisions a tank, ingests readings, triggers alert, acks and resolves alert, and verifies audit and weekly report", async () => {
    cookieValue = adminCookie;

    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('workflow-node-01', FALSE, $1)", [Date.now()]);
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

    // Record 3 manual readings indicating low level
    for (const offset of [-120_000, -60_000, 0]) {
      const response = await manualReadingRoute.POST(request(
        "/api/readings/manual",
        "POST",
        { tankId, distanceCm: 200, t: Date.now() + offset },
      ));
      expect(response.status).toBe(200);
    }

    await q(
      "INSERT INTO tank_assignments (tank_id, user_id, assigned_at) VALUES ($1, $2, $3)",
      [tankId, operatorId, Date.now()]
    );
    cookieValue = operatorCookie;
    const ownerEntry = await manualReadingRoute.POST(request(
      "/api/readings/manual",
      "POST",
      { tankId, distanceCm: 199 },
    ));
    expect(ownerEntry.status).toBe(200);
    await expect(ownerEntry.json()).resolves.toMatchObject({ source: "MANUAL" });

    cookieValue = viewerCookie;
    const viewerEntry = await manualReadingRoute.POST(request(
      "/api/readings/manual",
      "POST",
      { tankId, distanceCm: 198 },
    ));
    expect(viewerEntry.status).toBe(403);

    cookieValue = adminCookie;
    const tank = await tankRoute.GET(request(`/api/tanks/${tankId}`, "GET"), context(tankId));
    await expect(tank.json()).resolves.toMatchObject({ label: "Workflow tank", zone: "Workflow Ward" });

    // Open and verify alert
    const alertList = await alertsRoute.GET(request("/api/alerts", "GET"));
    expect(alertList.status).toBe(200);
    const alertBody = z.array(z.object({ id: z.number(), type: z.string() })).parse(await alertList.json());
    const lowLevelAlert = alertBody.find((item) => item.type === "LOW_LEVEL");
    expect(lowLevelAlert).toBeDefined();
    alertId = lowLevelAlert!.id;

    const alertDetail = await alertRoute.GET(request(`/api/alerts/${alertId}`, "GET"), context(alertId));
    expect(alertDetail.status).toBe(200);
    await expect(alertDetail.json()).resolves.toMatchObject({ id: alertId, tankId });

    // Operator acknowledges alert
    cookieValue = operatorCookie;
    const acknowledged = await ackRoute.POST(request(`/api/alerts/${alertId}/ack`, "POST", { note: "Workflow acknowledgement" }), context(alertId));
    expect(acknowledged.status).toBe(200);

    // Operator resolves alert
    const resolved = await resolveRoute.POST(request(`/api/alerts/${alertId}/resolve`, "POST", { note: "Workflow resolved" }), context(alertId));
    expect(resolved.status).toBe(200);
    await expect(resolved.json()).resolves.toMatchObject({ state: "resolved" });

    // Operator cannot view full audit log
    const auditResponse = await auditRoute.GET(request("/api/audit?entity=alert", "GET"));
    expect(auditResponse.status).toBe(403);

    // Admin can view audit log
    cookieValue = adminCookie;
    const auditListRes = await auditRoute.GET(request("/api/audit?entity=alert", "GET"));
    expect(auditListRes.status).toBe(200);
    const auditEntries = await listAudit({ entity: "alert", userId: operatorId, page: 1, pageSize: 20 });
    expect(auditEntries.items.map((entry) => entry.action)).toEqual(expect.arrayContaining(["alert.ack", "alert.resolve"]));

    // Weekly report includes tank
    const report = await weeklyReportRoute.GET(request("/api/reports/weekly?format=csv", "GET"));
    expect(report.status).toBe(200);
    const csv = await report.text();
    expect(csv).toContain("Workflow tank");
  }, 15_000);
});

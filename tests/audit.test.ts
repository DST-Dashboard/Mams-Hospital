// [BE-04] OWNER: backend
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q } from "@/server/db";
import { env } from "@/server/env";
import { sign } from "@/server/auth/session";
import { audit, listAudit } from "@/server/repos/audit";
import { GET as GET_AUDIT } from "@/app/api/audit/route";

let mockCookieValue: string | undefined = undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "ohtms_session" && mockCookieValue ? { value: mockCookieValue } : undefined),
  }),
  headers: async () => new Headers(),
}));

describe("BE-04: Audit Management", () => {
  let testCtx: TestSchemaContext;
  let adminUserId: number;
  let opUserId: number;
  let viewerUserId: number;

  beforeAll(async () => {
    testCtx = await createTestSchema();

    // Seed test users
    const [admin] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('admin@test.local', 'System Admin', 'hash', 'admin', FALSE, $1) RETURNING id",
      [Date.now()]
    );
    const [op] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('op@test.local', 'Nurse Operator', 'hash', 'operator', FALSE, $1) RETURNING id",
      [Date.now()]
    );
    const [viewer] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('viewer@test.local', 'Viewer', 'hash', 'viewer', FALSE, $1) RETURNING id",
      [Date.now()]
    );

    adminUserId = admin.id;
    opUserId = op.id;
    viewerUserId = viewer.id;

    // Seed 10 audit records across different times and entities
    const baseT = 1700000000000;
    for (let i = 1; i <= 10; i++) {
      await q(
        "INSERT INTO audit_log (t, user_id, action, entity, entity_id, before_json, after_json, ip) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          baseT + i * 1000,
          i % 2 === 0 ? adminUserId : opUserId,
          i <= 5 ? "tank.update" : "alert.ack",
          i <= 5 ? "tank" : "alert",
          String(i),
          JSON.stringify({ step: i - 1 }),
          JSON.stringify({ step: i }),
          `192.168.1.${i}`,
        ]
      );
    }
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("lists audit events sorted newest-first", async () => {
    const res = await listAudit({ page: 1, pageSize: 20 });
    expect(res.total).toBe(10);
    expect(res.items.length).toBe(10);
    expect(res.items[0].t).toBeGreaterThan(res.items[1].t);
    expect(res.items[0].entityId).toBe("10");
  });

  it("paginates audit events", async () => {
    const page1 = await listAudit({ page: 1, pageSize: 3 });
    expect(page1.items.length).toBe(3);
    expect(page1.total).toBe(10);
    expect(page1.items[0].entityId).toBe("10");

    const page2 = await listAudit({ page: 2, pageSize: 3 });
    expect(page2.items.length).toBe(3);
    expect(page2.items[0].entityId).toBe("7");
  });

  it("filters by entity and action", async () => {
    const tanks = await listAudit({ entity: "tank", page: 1, pageSize: 20 });
    expect(tanks.total).toBe(5);
    expect(tanks.items.every((x) => x.entity === "tank")).toBe(true);

    const acks = await listAudit({ action: "alert.ack", page: 1, pageSize: 20 });
    expect(acks.total).toBe(5);
    expect(acks.items.every((x) => x.action === "alert.ack")).toBe(true);
  });

  it("filters by userId", async () => {
    const userEvents = await listAudit({ userId: adminUserId, page: 1, pageSize: 20 });
    expect(userEvents.total).toBe(5);
    expect(userEvents.items.every((x) => x.user?.id === adminUserId)).toBe(true);
  });

  it("filters by date range (from and to)", async () => {
    const baseT = 1700000000000;
    const rangeEvents = await listAudit({
      from: baseT + 3000,
      to: baseT + 6000,
      page: 1,
      pageSize: 20,
    });
    expect(rangeEvents.total).toBe(4);
  });

  it("creates new audit records with before and after snapshots", async () => {
    await audit({
      userId: adminUserId,
      action: "user.role_change",
      entity: "user",
      entityId: "2",
      before: { role: "operator" },
      after: { role: "admin" },
      ip: "10.0.0.1",
    });

    const res = await listAudit({ action: "user.role_change", page: 1, pageSize: 1 });
    expect(res.total).toBe(1);
    const entry = res.items[0];
    expect(entry.action).toBe("user.role_change");
    expect(entry.before).toEqual({ role: "operator" });
    expect(entry.after).toEqual({ role: "admin" });
    expect(entry.ip).toBe("10.0.0.1");
    expect(entry.user?.name).toBe("System Admin");
  });

  it("enforces admin-only access on GET /api/audit", async () => {
    const secret = env().SESSION_SECRET;
    // 1. Viewer cannot view audit log -> 403
    mockCookieValue = await sign({ uid: viewerUserId, role: "viewer", name: "Viewer" }, secret, 1);
    const reqViewer = new Request("http://localhost/api/audit");
    const resViewer = await GET_AUDIT(reqViewer);
    expect(resViewer.status).toBe(403);

    // 2. Operator cannot view audit log -> 403
    mockCookieValue = await sign({ uid: opUserId, role: "operator", name: "Operator" }, secret, 1);
    const reqOp = new Request("http://localhost/api/audit");
    const resOp = await GET_AUDIT(reqOp);
    expect(resOp.status).toBe(403);

    // 3. Admin can view audit log -> 200
    mockCookieValue = await sign({ uid: adminUserId, role: "admin", name: "Admin" }, secret, 1);
    const reqAdmin = new Request("http://localhost/api/audit?page=1&pageSize=5");
    const resAdmin = await GET_AUDIT(reqAdmin);
    expect(resAdmin.status).toBe(200);
    const json = await resAdmin.json();
    expect(json.items).toBeInstanceOf(Array);
    expect(json.total).toBeGreaterThanOrEqual(11);
  });

  it("handles empty audit results gracefully", async () => {
    const secret = env().SESSION_SECRET;
    mockCookieValue = await sign({ uid: adminUserId, role: "admin", name: "Admin" }, secret, 1);
    const req = new Request("http://localhost/api/audit?entity=non_existent_entity_xyz");
    const res = await GET_AUDIT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toEqual([]);
    expect(json.total).toBe(0);
    expect(json.page).toBe(1);
  });

  it("rejects invalid query parameters with 400", async () => {
    const secret = env().SESSION_SECRET;
    mockCookieValue = await sign({ uid: adminUserId, role: "admin", name: "Admin" }, secret, 1);
    const req = new Request("http://localhost/api/audit?page=-5");
    const res = await GET_AUDIT(req);
    expect(res.status).toBe(400);
  });
});

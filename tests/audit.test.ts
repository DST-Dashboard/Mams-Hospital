// [BE-04] OWNER: backend
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let mockCookieValue: string | undefined = undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "ohtms_session" && mockCookieValue ? { value: mockCookieValue } : undefined),
  }),
}));

let testDbPath: string;
let dbInstance: any;

describe("BE-04: Audit Management", () => {
  let sign: typeof import("@/server/auth/session").sign;
  let audit: typeof import("@/server/repos/audit").audit;
  let listAudit: typeof import("@/server/repos/audit").listAudit;
  let GET_AUDIT: typeof import("@/app/api/audit/route").GET;

  const SECRET = "long-audit-secret-for-jwt-signing-test-32chars";

  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-audit-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = SECRET;

    const { openDb } = await import("@/server/db");
    const { runMigrations } = await import("@/server/migrations/runner");
    dbInstance = openDb(testDbPath);
    (globalThis as any).__ohtmsDb = dbInstance;
    runMigrations(dbInstance);

    const sessionMod = await import("@/server/auth/session");
    sign = sessionMod.sign;
    const auditMod = await import("@/server/repos/audit");
    audit = auditMod.audit;
    listAudit = auditMod.listAudit;

    GET_AUDIT = (await import("@/app/api/audit/route")).GET;

    // Seed test users
    dbInstance.prepare("INSERT INTO users (id, email, name, password_hash, role, disabled, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)")
      .run(1, "admin@test.local", "System Admin", "hash", "admin", Date.now());
    dbInstance.prepare("INSERT INTO users (id, email, name, password_hash, role, disabled, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)")
      .run(2, "op@test.local", "Nurse Operator", "hash", "operator", Date.now());

    // Seed 10 audit records across different times and entities
    const baseT = 1700000000000;
    for (let i = 1; i <= 10; i++) {
      dbInstance.prepare(
        "INSERT INTO audit_log (t, user_id, action, entity, entity_id, before_json, after_json, ip) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      ).run(
        baseT + i * 1000,
        i % 2 === 0 ? 1 : 2,
        i <= 5 ? "tank.update" : "alert.ack",
        i <= 5 ? "tank" : "alert",
        String(i),
        JSON.stringify({ step: i - 1 }),
        JSON.stringify({ step: i }),
        `192.168.1.${i}`
      );
    }
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

  it("lists audit events sorted newest-first", () => {
    const res = listAudit({ page: 1, pageSize: 20 });
    expect(res.total).toBe(10);
    expect(res.items.length).toBe(10);
    expect(res.items[0].t).toBeGreaterThan(res.items[1].t);
    expect(res.items[0].entityId).toBe("10");
  });

  it("paginates audit events", () => {
    const page1 = listAudit({ page: 1, pageSize: 3 });
    expect(page1.items.length).toBe(3);
    expect(page1.total).toBe(10);
    expect(page1.items[0].entityId).toBe("10");

    const page2 = listAudit({ page: 2, pageSize: 3 });
    expect(page2.items.length).toBe(3);
    expect(page2.items[0].entityId).toBe("7");
  });

  it("filters by entity and action", () => {
    const tanks = listAudit({ entity: "tank", page: 1, pageSize: 20 });
    expect(tanks.total).toBe(5);
    expect(tanks.items.every((x) => x.entity === "tank")).toBe(true);

    const acks = listAudit({ action: "alert.ack", page: 1, pageSize: 20 });
    expect(acks.total).toBe(5);
    expect(acks.items.every((x) => x.action === "alert.ack")).toBe(true);
  });

  it("filters by userId", () => {
    const user1Events = listAudit({ userId: 1, page: 1, pageSize: 20 });
    expect(user1Events.total).toBe(5);
    expect(user1Events.items.every((x) => x.user?.id === 1)).toBe(true);
  });

  it("filters by date range (from and to)", () => {
    const baseT = 1700000000000;
    const rangeEvents = listAudit({
      from: baseT + 3000,
      to: baseT + 6000,
      page: 1,
      pageSize: 20,
    });
    expect(rangeEvents.total).toBe(4);
  });

  it("creates new audit records with before and after snapshots", () => {
    audit({
      userId: 1,
      action: "user.role_change",
      entity: "user",
      entityId: "2",
      before: { role: "operator" },
      after: { role: "admin" },
      ip: "10.0.0.1",
    });

    const res = listAudit({ action: "user.role_change", page: 1, pageSize: 1 });
    expect(res.total).toBe(1);
    const entry = res.items[0];
    expect(entry.action).toBe("user.role_change");
    expect(entry.before).toEqual({ role: "operator" });
    expect(entry.after).toEqual({ role: "admin" });
    expect(entry.ip).toBe("10.0.0.1");
    expect(entry.user?.name).toBe("System Admin");
  });

  it("enforces admin-only access on GET /api/audit", async () => {
    // 1. Viewer cannot view audit log -> 403
    mockCookieValue = await sign({ uid: 3, role: "viewer", name: "Viewer" }, SECRET, 1);
    const reqViewer = new Request("http://localhost/api/audit");
    const resViewer = await GET_AUDIT(reqViewer);
    expect(resViewer.status).toBe(403);

    // 2. Operator cannot view audit log -> 403
    mockCookieValue = await sign({ uid: 2, role: "operator", name: "Operator" }, SECRET, 1);
    const reqOp = new Request("http://localhost/api/audit");
    const resOp = await GET_AUDIT(reqOp);
    expect(resOp.status).toBe(403);

    // 3. Admin can view audit log -> 200
    mockCookieValue = await sign({ uid: 1, role: "admin", name: "Admin" }, SECRET, 1);
    const reqAdmin = new Request("http://localhost/api/audit?page=1&pageSize=5");
    const resAdmin = await GET_AUDIT(reqAdmin);
    expect(resAdmin.status).toBe(200);
    const json = await resAdmin.json();
    expect(json.items).toBeInstanceOf(Array);
    expect(json.total).toBeGreaterThanOrEqual(11);
  });

  it("handles empty audit results gracefully", async () => {
    mockCookieValue = await sign({ uid: 1, role: "admin", name: "Admin" }, SECRET, 1);
    const req = new Request("http://localhost/api/audit?entity=non_existent_entity_xyz");
    const res = await GET_AUDIT(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.items).toEqual([]);
    expect(json.total).toBe(0);
    expect(json.page).toBe(1);
  });

  it("rejects invalid query parameters with 400", async () => {
    mockCookieValue = await sign({ uid: 1, role: "admin", name: "Admin" }, SECRET, 1);
    const req = new Request("http://localhost/api/audit?page=-5");
    const res = await GET_AUDIT(req);
    expect(res.status).toBe(400);
  });
});

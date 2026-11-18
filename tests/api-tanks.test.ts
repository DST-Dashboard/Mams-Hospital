// [BE-14] OWNER: backend
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q, q1 } from "@/server/db";
import { env } from "@/server/env";
import { sign } from "@/server/auth/session";
import * as tanks from "@/server/repos/tanks";
import { POST as POST_TANK } from "@/app/api/tanks/route";
import { PATCH as PATCH_TANK, DELETE as DELETE_TANK } from "@/app/api/tanks/[id]/route";

let mockCookieValue: string | undefined = undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "ohtms_session" && mockCookieValue ? { value: mockCookieValue } : undefined),
  }),
  headers: async () => new Headers(),
}));

describe("BE-06: Tanks API", () => {
  let testCtx: TestSchemaContext;
  let adminCookie: string;
  let viewerCookie: string;

  beforeAll(async () => {
    testCtx = await createTestSchema();
    const secret = env().SESSION_SECRET;

    const [admin] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('admin@test.local', 'Admin', 'hash', 'admin', FALSE, $1) RETURNING id",
      [Date.now()]
    );
    const [viewer] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('viewer@test.local', 'Viewer', 'hash', 'viewer', FALSE, $1) RETURNING id",
      [Date.now()]
    );

    adminCookie = await sign({ uid: admin.id, role: "admin", name: "Admin" }, secret, 1);
    viewerCookie = await sign({ uid: viewer.id, role: "viewer", name: "Viewer" }, secret, 1);

    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('sensor-new-device-99', FALSE, $1)", [Date.now()]);
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  describe("Validation & Basic Operations", () => {
    it("create validates dims", async () => {
      mockCookieValue = adminCookie;

      // 1. Invalid: dead zone >= height
      const req1 = new Request("http://localhost/api/tanks", {
        method: "POST",
        body: JSON.stringify({
          label: "Invalid Tank",
          shape: "cylinder",
          heightCm: 100,
          deadZoneCm: 120,
          radiusCm: 50,
        }),
      });
      const res1 = await POST_TANK(req1);
      expect(res1.status).toBe(400);

      // 2. Invalid: rectangle missing width or length
      const req2 = new Request("http://localhost/api/tanks", {
        method: "POST",
        body: JSON.stringify({
          label: "Invalid Rect Tank",
          shape: "rectangle",
          heightCm: 200,
          deadZoneCm: 25,
        }),
      });
      const res2 = await POST_TANK(req2);
      expect(res2.status).toBe(400);

      // 3. Invalid: warnPct <= critPct
      const req3 = new Request("http://localhost/api/tanks", {
        method: "POST",
        body: JSON.stringify({
          label: "Invalid Thresholds",
          shape: "cylinder",
          heightCm: 200,
          deadZoneCm: 25,
          radiusCm: 50,
          warnPct: 20,
          critPct: 30,
        }),
      });
      const res3 = await POST_TANK(req3);
      expect(res3.status).toBe(400);

      // 4. Valid tank creation
      const req4 = new Request("http://localhost/api/tanks", {
        method: "POST",
        body: JSON.stringify({
          label: "Surgery Ward Tank",
          shape: "cylinder",
          heightCm: 300,
          radiusCm: 100,
          deadZoneCm: 25,
          warnPct: 40,
          critPct: 20,
          emptyPct: 5,
        }),
      });
      const res4 = await POST_TANK(req4);
      expect(res4.status).toBe(201);
      const json4 = await res4.json();
      expect(json4.id).toBeDefined();
      expect(json4.label).toBe("Surgery Ward Tank");
    });

    it("update writes audit", async () => {
      mockCookieValue = adminCookie;
      const tankId = await tanks.createTank({
        label: "Cardio Tank",
        shape: "cylinder",
        heightCm: 250,
        radiusCm: 80,
        deadZoneCm: 20,
      });

      const req = new Request(`http://localhost/api/tanks/${tankId}`, {
        method: "PATCH",
        body: JSON.stringify({
          label: "Cardiology Center Tank",
          shape: "cylinder",
          heightCm: 260,
          radiusCm: 80,
          deadZoneCm: 20,
        }),
      });
      const res = await PATCH_TANK(req, { params: Promise.resolve({ id: String(tankId) }) });
      expect(res.status).toBe(200);

      const auditRow = await q1<{ after_json: string | object }>(
        "SELECT * FROM audit_log WHERE entity = 'tank' AND entity_id = $1 AND action = 'tank.update'",
        [String(tankId)]
      );
      expect(auditRow).toBeDefined();
      const after = typeof auditRow?.after_json === "string" ? JSON.parse(auditRow.after_json) : auditRow?.after_json;
      expect(after.label).toBe("Cardiology Center Tank");
    });

    it("soft delete + restore", async () => {
      mockCookieValue = adminCookie;
      const tankId = await tanks.createTank({
        label: "Temporary Tank",
        shape: "cylinder",
        heightCm: 200,
        radiusCm: 60,
        deadZoneCm: 20,
      });

      // 1. Soft delete
      const reqDelete = new Request(`http://localhost/api/tanks/${tankId}`, { method: "DELETE" });
      const resDelete = await DELETE_TANK(reqDelete, { params: Promise.resolve({ id: String(tankId) }) });
      expect(resDelete.status).toBe(200);

      const deletedTank = await tanks.getTank(tankId);
      expect(deletedTank?.deletedAt).not.toBeNull();
      expect(deletedTank?.status).toBe("decommissioned");

      // Verify listTanks excludes it by default
      const list = await tanks.listTanks();
      expect(list.some((t) => t.id === tankId)).toBe(false);

      // 2. Restore
      const reqRestore = new Request(`http://localhost/api/tanks/${tankId}?restore=1`, { method: "DELETE" });
      const resRestore = await DELETE_TANK(reqRestore, { params: Promise.resolve({ id: String(tankId) }) });
      expect(resRestore.status).toBe(200);

      const restoredTank = await tanks.getTank(tankId);
      expect(restoredTank?.deletedAt).toBeNull();
      expect(restoredTank?.status).toBe("active");
    });

    it("viewer cannot write", async () => {
      mockCookieValue = viewerCookie;

      const req = new Request("http://localhost/api/tanks", {
        method: "POST",
        body: JSON.stringify({
          label: "Unauthorized Tank",
          shape: "cylinder",
          heightCm: 200,
          radiusCm: 60,
        }),
      });
      const res = await POST_TANK(req);
      expect(res.status).toBe(403);
    });

    it("detects awaiting-first-reading state", async () => {
      const devId = "sensor-new-device-99";
      const tankId = await tanks.createTank({
        label: "Unread Tank",
        deviceId: devId,
        status: "active",
        shape: "cylinder",
        heightCm: 250,
        radiusCm: 80,
        deadZoneCm: 25,
      });

      const tank = await tanks.getTank(tankId);
      expect(tank?.readingCount).toBe(0);
      expect(tank?.isAwaitingReading).toBe(true);
    });

    it("supports historical dimensions per §6", async () => {
      const tankId = await tanks.createTank({
        label: "Historical Tank",
        shape: "cylinder",
        heightCm: 300,
        radiusCm: 100,
        deadZoneCm: 25,
        dimsConfirmed: true,
      });

      const now = Date.now();
      // Record historical dimension effective from tomorrow
      await tanks.updateTank(
        tankId,
        { heightCm: 400, radiusCm: 120 },
        { applyFromNowOnly: true, effectiveFrom: now + 86400_000 }
      );

      const tank = (await tanks.getTank(tankId))!;
      // Geometry as of now should be original
      const geomNow = await tanks.getGeometryAt(tank, now);
      expect(geomNow.heightCm).toBe(300);

      // Geometry as of tomorrow should be the new ones
      const geomTomorrow = await tanks.getGeometryAt(tank, now + 90000_000);
      expect(geomTomorrow.heightCm).toBe(400);
    });
  });
});

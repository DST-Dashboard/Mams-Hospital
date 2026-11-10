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
}));

let testDbPath: string;
let dbInstance: any;

describe("BE-06: Tanks, Zones, and Templates", () => {
  let sign: typeof import("@/server/auth/session").sign;
  let tanks: typeof import("@/server/repos/tanks");
  let zones: typeof import("@/server/repos/zones");
  let templates: typeof import("@/server/repos/templates");
  let POST_TANK: typeof import("@/app/api/tanks/route").POST;
  let PATCH_TANK: typeof import("@/app/api/tanks/[id]/route").PATCH;
  let DELETE_TANK: typeof import("@/app/api/tanks/[id]/route").DELETE;
  let POST_BULK: typeof import("@/app/api/tanks/bulk/route").POST;
  let POST_CLONE: typeof import("@/app/api/tanks/clone/route").POST;
  let GET_EXPORT: typeof import("@/app/api/tanks/export/route").GET;
  let POST_IMPORT: typeof import("@/app/api/tanks/import/route").POST;

  const SECRET = "long-secret-key-for-tank-tests-hs256-jwt";
  let adminCookie: string;
  let viewerCookie: string;

  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-tanks-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = SECRET;

    const { openDb } = await import("@/server/db");
    const { runMigrations } = await import("@/server/migrations/runner");
    dbInstance = openDb(testDbPath);
    (globalThis as any).__ohtmsDb = dbInstance;
    runMigrations(dbInstance);

    const sessionMod = await import("@/server/auth/session");
    sign = sessionMod.sign;
    tanks = await import("@/server/repos/tanks");
    zones = await import("@/server/repos/zones");
    templates = await import("@/server/repos/templates");

    POST_TANK = (await import("@/app/api/tanks/route")).POST;
    PATCH_TANK = (await import("@/app/api/tanks/[id]/route")).PATCH;
    DELETE_TANK = (await import("@/app/api/tanks/[id]/route")).DELETE;
    POST_BULK = (await import("@/app/api/tanks/bulk/route")).POST;
    POST_CLONE = (await import("@/app/api/tanks/clone/route")).POST;
    GET_EXPORT = (await import("@/app/api/tanks/export/route")).GET;
    POST_IMPORT = (await import("@/app/api/tanks/import/route")).POST;

    // Seed admin & viewer cookies
    adminCookie = await sign({ uid: 1, role: "admin", name: "Admin" }, SECRET, 1);
    viewerCookie = await sign({ uid: 2, role: "viewer", name: "Viewer" }, SECRET, 1);
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
      const tankId = tanks.createTank({
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

      const auditRow = dbInstance
        .prepare("SELECT * FROM audit_log WHERE entity = 'tank' AND entity_id = ? AND action = 'tank.update'")
        .get(String(tankId)) as any;
      expect(auditRow).toBeDefined();
      expect(JSON.parse(auditRow.after_json).label).toBe("Cardiology Center Tank");
    });

    it("soft delete + restore", async () => {
      mockCookieValue = adminCookie;
      const tankId = tanks.createTank({
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

      const deletedTank = tanks.getTank(tankId)!;
      expect(deletedTank.deletedAt).not.toBeNull();
      expect(deletedTank.status).toBe("decommissioned");

      // Verify listTanks excludes it by default
      const list = tanks.listTanks();
      expect(list.some((t) => t.id === tankId)).toBe(false);

      // 2. Restore
      const reqRestore = new Request(`http://localhost/api/tanks/${tankId}?restore=1`, { method: "DELETE" });
      const resRestore = await DELETE_TANK(reqRestore, { params: Promise.resolve({ id: String(tankId) }) });
      expect(resRestore.status).toBe(200);

      const restoredTank = tanks.getTank(tankId)!;
      expect(restoredTank.deletedAt).toBeNull();
      expect(restoredTank.status).toBe("active");
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
  });

  describe("Bulk, Clone, Import, and Export", () => {
    it("handles bulk status, delete, and threshold updates", async () => {
      mockCookieValue = adminCookie;
      const id1 = tanks.createTank({ label: "Bulk 1", shape: "cylinder", heightCm: 200, radiusCm: 50, deadZoneCm: 20 });
      const id2 = tanks.createTank({ label: "Bulk 2", shape: "cylinder", heightCm: 200, radiusCm: 50, deadZoneCm: 20 });

      // Bulk status update
      const reqStatus = new Request("http://localhost/api/tanks/bulk", {
        method: "POST",
        body: JSON.stringify({ action: "status", ids: [id1, id2], status: "maintenance" }),
      });
      const resStatus = await POST_BULK(reqStatus);
      expect(resStatus.status).toBe(200);
      expect(tanks.getTank(id1)?.status).toBe("maintenance");
      expect(tanks.getTank(id2)?.status).toBe("maintenance");

      // Bulk threshold update
      const reqTh = new Request("http://localhost/api/tanks/bulk", {
        method: "POST",
        body: JSON.stringify({ action: "thresholds", ids: [id1, id2], warnPct: 45, critPct: 25, emptyPct: 10 }),
      });
      const resTh = await POST_BULK(reqTh);
      expect(resTh.status).toBe(200);
      expect(tanks.getTank(id1)?.thresholds.warnPct).toBe(45);
      expect(tanks.getTank(id2)?.thresholds.warnPct).toBe(45);

      // Bulk delete
      const reqDel = new Request("http://localhost/api/tanks/bulk", {
        method: "POST",
        body: JSON.stringify({ action: "delete", ids: [id1, id2] }),
      });
      const resDel = await POST_BULK(reqDel);
      expect(resDel.status).toBe(200);
      expect(tanks.getTank(id1)?.deletedAt).not.toBeNull();
      expect(tanks.getTank(id2)?.deletedAt).not.toBeNull();
    });

    it("clones a tank copying geometry, thresholds, and configuration", async () => {
      mockCookieValue = adminCookie;
      const sourceId = tanks.createTank({
        label: "Master Tank",
        shape: "rectangle",
        heightCm: 350,
        widthCm: 150,
        lengthCm: 200,
        deadZoneCm: 30,
        warnPct: 50,
        critPct: 30,
        emptyPct: 10,
        quietStart: "23:00",
        quietEnd: "05:00",
      });

      const req = new Request("http://localhost/api/tanks/clone", {
        method: "POST",
        body: JSON.stringify({
          sourceId,
          label: "Master Tank Copy",
          deviceId: "sensor-cloned-01",
        }),
      });
      const res = await POST_CLONE(req);
      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.id).toBeDefined();

      const cloned = tanks.getTank(json.id)!;
      expect(cloned.label).toBe("Master Tank Copy");
      expect(cloned.deviceId).toBe("sensor-cloned-01");
      expect(cloned.geometry.heightCm).toBe(350);
      expect(cloned.geometry.shape.kind).toBe("rectangle");
      expect(cloned.thresholds.warnPct).toBe(50);
      expect(cloned.thresholds.quietStart).toBe("23:00");
    });

    it("exports and imports tanks safely in transaction", async () => {
      mockCookieValue = adminCookie;

      // 1. Export
      const resExport = await GET_EXPORT(new Request("http://localhost/api/tanks/export"));
      expect(resExport.status).toBe(200);
      const exportData = await resExport.json();
      expect(exportData.schema).toBe(1);
      expect(Array.isArray(exportData.tanks)).toBe(true);
      expect(exportData.tanks.length).toBeGreaterThan(0);

      // 2. Import
      const importPayload = {
        schema: 1,
        exportedAt: new Date().toISOString(),
        tanks: [
          {
            label: "Imported Tank Alpha",
            shape: "cylinder",
            heightCm: 220,
            radiusCm: 70,
            deadZoneCm: 25,
            warnPct: 40,
            critPct: 20,
            emptyPct: 5,
          },
          {
            label: "Imported Tank Beta",
            shape: "cylinder",
            heightCm: 240,
            radiusCm: 80,
            deadZoneCm: 25,
            warnPct: 40,
            critPct: 20,
            emptyPct: 5,
          },
        ],
      };

      const reqImport = new Request("http://localhost/api/tanks/import", {
        method: "POST",
        body: JSON.stringify(importPayload),
      });
      const resImport = await POST_IMPORT(reqImport);
      expect(resImport.status).toBe(200);
      const importResult = await resImport.json();
      expect(importResult.imported).toBe(2);

      expect(tanks.getTankByLabel("Imported Tank Alpha")).toBeDefined();
      expect(tanks.getTankByLabel("Imported Tank Beta")).toBeDefined();
    });
  });

  describe("Zones and Templates", () => {
    it("manages zones lifecycle and associates tanks", () => {
      // 1. Create Zone
      const zoneId = zones.createZone({ name: "Block A - Rooftop", description: "Main hospital building" });
      expect(zoneId).toBeGreaterThan(0);

      // 2. List Zones
      const list1 = zones.listZones();
      expect(list1.some((z) => z.name === "Block A - Rooftop")).toBe(true);

      // 3. Create a tank assigned to this zone
      const tankId = tanks.createTank({
        label: "Zone Test Tank",
        zone: "Block A - Rooftop",
        shape: "cylinder",
        heightCm: 200,
        radiusCm: 60,
        deadZoneCm: 20,
      });
      expect(tanks.getTank(tankId)?.zone).toBe("Block A - Rooftop");

      // Verify tank count is updated in zone
      const zoneWithTank = zones.getZone(zoneId)!;
      expect(zoneWithTank.tankCount).toBe(1);

      // 4. Update zone name cascades to tanks
      zones.updateZone(zoneId, { name: "Block A - East Wing", description: "Updated description" });
      expect(tanks.getTank(tankId)?.zone).toBe("Block A - East Wing");

      // 5. Delete zone without force throws when tanks are assigned
      expect(() => zones.deleteZone(zoneId, false)).toThrow();

      // 6. Delete zone with force unassigns tanks and deletes
      zones.deleteZone(zoneId, true);
      expect(zones.getZone(zoneId)).toBeUndefined();
      expect(tanks.getTank(tankId)?.zone).toBeNull();
    });

    it("manages threshold templates and applies to tanks", () => {
      // 1. Create Template
      const templateId = templates.createTemplate({
        name: "Standard Hospital Reserve",
        description: "Default thresholds for ICU overhead tanks",
        warnPct: 45,
        critPct: 25,
        emptyPct: 8,
        overflowMarginCm: 12,
        persistence: 4,
        cooldownMin: 45,
        hysteresisPct: 6,
        noDataMin: 20,
        spikeCm: 70,
      });
      expect(templateId).toBeGreaterThan(0);

      // 2. Apply template to a tank
      const tankId = tanks.createTank({
        label: "Template Apply Tank",
        shape: "cylinder",
        heightCm: 300,
        radiusCm: 100,
        deadZoneCm: 25,
        warnPct: 40,
        critPct: 20,
        emptyPct: 5,
      });

      templates.applyTemplateToTank(templateId, tankId);
      const updatedTank = tanks.getTank(tankId)!;
      expect(updatedTank.thresholds.warnPct).toBe(45);
      expect(updatedTank.thresholds.critPct).toBe(25);
      expect(updatedTank.thresholds.emptyPct).toBe(8);
      expect(updatedTank.thresholds.persistence).toBe(4);
      expect(updatedTank.thresholds.cooldownMin).toBe(45);
    });

    it("detects awaiting-first-reading state", () => {
      const devId = "sensor-new-device-99";
      const tankId = tanks.createTank({
        label: "Unread Tank",
        deviceId: devId,
        status: "active",
        shape: "cylinder",
        heightCm: 250,
        radiusCm: 80,
        deadZoneCm: 25,
      });

      const tank = tanks.getTank(tankId)!;
      expect(tank.readingCount).toBe(0);
      expect(tank.isAwaitingReading).toBe(true);
    });
  });
});

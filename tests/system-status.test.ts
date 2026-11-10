// [BE-13] OWNER: backend
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

describe("BE-13: System Monitoring & Logging", () => {
  let sign: typeof import("@/server/auth/session").sign;
  let getSystemStatus: typeof import("@/server/services/system-status").getSystemStatus;
  let logger: typeof import("@/server/logger").logger;
  let GET_STATUS: typeof import("@/app/api/system/status/route").GET;

  const SECRET = "secret-key-system-monitoring-test-32chars";
  let adminCookie: string;
  let viewerCookie: string;

  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-system-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = SECRET;

    const { openDb } = await import("@/server/db");
    const { runMigrations } = await import("@/server/migrations/runner");
    dbInstance = openDb(testDbPath);
    (globalThis as any).__ohtmsDb = dbInstance;
    runMigrations(dbInstance);

    const sessionMod = await import("@/server/auth/session");
    sign = sessionMod.sign;
    const sysMod = await import("@/server/services/system-status");
    getSystemStatus = sysMod.getSystemStatus;
    const logMod = await import("@/server/logger");
    logger = logMod.logger;
    GET_STATUS = (await import("@/app/api/system/status/route")).GET;

    adminCookie = await sign({ uid: 1, role: "admin", name: "Admin" }, SECRET, 1);
    viewerCookie = await sign({ uid: 2, role: "viewer", name: "Viewer" }, SECRET, 1);

    // Seed devices and readings
    const t0 = 1700000000000;
    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)").run("dev-fresh", t0);
    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)").run("dev-stale", t0);
    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)").run("dev-offline", t0);
    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)").run("dev-none", t0);

    // Readings for fresh (< 15 min old at t0 + 10 min)
    dbInstance.prepare("INSERT INTO readings (device_id, t, distance_cm, rssi, battery_pct) VALUES (?, ?, ?, ?, ?)").run("dev-fresh", t0 + 5 * 60_000, 150, -70, 95);
    // Readings for stale (30 min old at t0 + 60 min)
    dbInstance.prepare("INSERT INTO readings (device_id, t, distance_cm, rssi, battery_pct) VALUES (?, ?, ?, ?, ?)").run("dev-stale", t0 + 30 * 60_000, 160, -75, 88);
    // Readings for offline (> 60 min old at t0 + 150 min)
    dbInstance.prepare("INSERT INTO readings (device_id, t, distance_cm, rssi, battery_pct) VALUES (?, ?, ?, ?, ?)").run("dev-offline", t0, 170, -85, 40);
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

  it("calculates system metrics and health status", () => {
    const asOf = 1700000000000 + 10 * 60_000;
    const status = getSystemStatus(asOf);

    expect(status.version).toBeDefined();
    expect(status.uptimeS).toBeGreaterThanOrEqual(0);
    expect(status.db.readings).toBe(3);
    expect(status.db.firstReadingAt).toBe(1700000000000);
    expect(status.db.lastReadingAt).toBe(1700000000000 + 30 * 60_000);

    const devFresh = status.devices.find((d) => d.deviceId === "dev-fresh")!;
    expect(devFresh.status).toBe("fresh");
    expect(devFresh.batteryPct).toBe(95);

    const devNone = status.devices.find((d) => d.deviceId === "dev-none")!;
    expect(devNone.status).toBe("none");
    expect(devNone.lastReadingAt).toBeNull();
  });

  it("enforces admin-only access on GET /api/system/status", async () => {
    // 1. Viewer is blocked -> 403
    mockCookieValue = viewerCookie;
    const resViewer = await GET_STATUS();
    expect(resViewer.status).toBe(403);

    // 2. Admin is allowed -> 200
    mockCookieValue = adminCookie;
    const resAdmin = await GET_STATUS();
    expect(resAdmin.status).toBe(200);
    const json = await resAdmin.json();
    expect(json.db).toBeDefined();
    expect(json.devices).toBeInstanceOf(Array);
  });

  it("structured logger redacts sensitive keys and formats json", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("User login attempt", {
      email: "admin@mams.local",
      password: "SuperSecretPassword123!",
      token: "secret-token-xyz",
      safeMeta: "all-good",
    });

    expect(consoleSpy).toHaveBeenCalled();
    const loggedStr = consoleSpy.mock.calls[0][0];
    const loggedObj = JSON.parse(loggedStr);

    expect(loggedObj.msg).toBe("User login attempt");
    expect(loggedObj.email).toBe("admin@mams.local");
    expect(loggedObj.password).toBe("[REDACTED]");
    expect(loggedObj.token).toBe("[REDACTED]");
    expect(loggedObj.safeMeta).toBe("all-good");

    consoleSpy.mockRestore();
  });
});

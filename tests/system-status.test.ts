// [BE-13] OWNER: backend
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q } from "@/server/db";
import { sign } from "@/server/auth/session";
import { env, resetEnvCache } from "@/server/env";
import { getSystemStatus } from "@/server/services/system-status";
import { logger } from "@/server/logger";
import { GET as GET_STATUS } from "@/app/api/system/status/route";

let mockCookieValue: string | undefined = undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name === "ohtms_session" && mockCookieValue ? { value: mockCookieValue } : undefined),
  }),
  headers: async () => new Headers(),
}));

describe("BE-13: System Monitoring & Logging", () => {
  let testCtx: TestSchemaContext;
  let adminCookie: string;
  let viewerCookie: string;

  beforeAll(async () => {
    testCtx = await createTestSchema();

    const [adminUser] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('admin@test.local', 'Admin', 'test-hash', 'admin', FALSE, $1) RETURNING id",
      [Date.now()]
    );
    const [viewerUser] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('viewer@test.local', 'Viewer', 'test-hash', 'viewer', FALSE, $1) RETURNING id",
      [Date.now()]
    );

    adminCookie = await sign({ uid: adminUser.id, role: "admin", name: "Admin" }, env().SESSION_SECRET, 1);
    viewerCookie = await sign({ uid: viewerUser.id, role: "viewer", name: "Viewer" }, env().SESSION_SECRET, 1);

    // Seed devices and readings
    const t0 = 1700000000000;
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('dev-fresh', FALSE, $1)", [t0]);
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('dev-stale', FALSE, $1)", [t0]);
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('dev-offline', FALSE, $1)", [t0]);
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('dev-none', FALSE, $1)", [t0]);

    // Readings for fresh (< 15 min old at t0 + 10 min)
    await q("INSERT INTO readings (device_id, t, distance_cm, rssi, battery_pct) VALUES ('dev-fresh', $1, 150, -70, 95)", [t0 + 5 * 60_000]);
    // Readings for stale (30 min old at t0 + 60 min)
    await q("INSERT INTO readings (device_id, t, distance_cm, rssi, battery_pct) VALUES ('dev-stale', $1, 160, -75, 88)", [t0 + 30 * 60_000]);
    // Readings for offline (> 60 min old at t0 + 150 min)
    await q("INSERT INTO readings (device_id, t, distance_cm, rssi, battery_pct) VALUES ('dev-offline', $1, 170, -85, 40)", [t0]);
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("calculates system metrics and health status", async () => {
    const asOf = 1700000000000 + 10 * 60_000;
    await q("INSERT INTO job_runs (name, last_run_at, ok, error) VALUES ('alerts', $1, FALSE, 'test failure')", [asOf - 1000]);
    process.env.INGEST_API_KEY = "k".repeat(40);
    resetEnvCache();
    const status = await getSystemStatus(asOf);

    expect(status.version).toBeDefined();
    expect(status.uptimeS).toBeGreaterThanOrEqual(0);
    expect(status.db.readings).toBe(3);
    expect(status.db.firstReadingAt).toBe(1700000000000);
    expect(status.db.lastReadingAt).toBe(1700000000000 + 30 * 60_000);
    expect(status.jobs).toEqual([{ name: "alerts", lastRunAt: asOf - 1000, ok: false }]);
    expect(status.ingest.enabled).toBe(true);

    // Ingest is only "enabled" when a usable API key is configured
    delete process.env.INGEST_API_KEY;
    resetEnvCache();
    expect((await getSystemStatus(asOf)).ingest.enabled).toBe(false);

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
    const body = await resAdmin.json();
    expect(body.uptimeS).toBeGreaterThanOrEqual(0);
    expect(body.db.readings).toBe(3);
  });

  it("masks secrets in structured logs", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("Processing session with token", {
      token: "secret-token-123",
      password: "my-password",
      apiKey: "secret-api-key",
      nested: {
        clientSecret: "client-secret-xyz",
      },
    });

    expect(logSpy).toHaveBeenCalled();
    const output = logSpy.mock.calls[0][0] as string;
    expect(output).not.toContain("secret-token-123");
    expect(output).not.toContain("my-password");
    expect(output).not.toContain("secret-api-key");
    expect(output).toContain("[REDACTED]");
    logSpy.mockRestore();
  });
});

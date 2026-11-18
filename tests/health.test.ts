import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let testDbPath: string;
let dbInstance: ReturnType<typeof import("@/server/db").openDb>;
let databaseClosed = false;
let GET_HEALTH: typeof import("@/app/api/health/route").GET;

describe("health API", () => {
  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-health-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = "health-test-session-secret-32-characters";
    process.env.CLOCK_MODE = "anchored";
    const database = await import("@/server/db");
    dbInstance = database.openDb(testDbPath);
    (globalThis as typeof globalThis & { __ohtmsDb?: ReturnType<typeof database.openDb> }).__ohtmsDb = dbInstance;
    GET_HEALTH = (await import("@/app/api/health/route")).GET;
  });

  afterAll(() => {
    if (!databaseClosed) dbInstance.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it("reports normal service health", async () => {
    const response = await GET_HEALTH();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok", clockMode: "anchored" });
  });

  it("returns a sanitized degraded response when SQLite is unavailable", async () => {
    dbInstance.close();
    databaseClosed = true;

    const response = await GET_HEALTH();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "degraded" });
  });
});

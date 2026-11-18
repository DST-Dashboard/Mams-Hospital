import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { closePool } from "@/server/db";
import { resetEnvCache } from "@/server/env";

let testCtx: TestSchemaContext;
let GET_HEALTH: typeof import("@/app/api/health/route").GET;

describe("health API", () => {
  beforeAll(async () => {
    testCtx = await createTestSchema();
    process.env.SESSION_SECRET = "health-test-session-secret-32-characters";
    resetEnvCache();
    GET_HEALTH = (await import("@/app/api/health/route")).GET;
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("reports normal service health", async () => {
    const response = await GET_HEALTH();
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "ok", clockMode: "live" });
  });

  it("returns a sanitized degraded response when database is unavailable", async () => {
    // Break connection temporarily
    process.env.DATABASE_URL = "postgresql://postgres:wrongpassword@localhost:5432/nonexistent_db";
    resetEnvCache();
    await closePool();

    const response = await GET_HEALTH();
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ status: "degraded" });

    // Restore
    process.env.DATABASE_URL = testCtx.connectionString;
    resetEnvCache();
    await closePool();
  });
});

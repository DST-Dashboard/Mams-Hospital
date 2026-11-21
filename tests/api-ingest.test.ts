import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q, q1 } from "@/server/db";
import { createTank } from "@/server/repos/tanks";
import { createApiKey, revokeApiKey } from "@/server/repos/api-keys";
import { upsertMany } from "@/server/repos/readings";
import { POST as POST_V1_READINGS } from "@/app/api/v1/readings/route";

describe("Generic REST API (POST /api/v1/readings) and Manual Ingestion", () => {
  let testCtx: TestSchemaContext;
  let validApiKey: string;
  let tank1ApiKey: string;
  let revokedApiKey: string;
  let viewerApiKey: string;
  let tank1Id: number;
  let tank2Id: number;

  beforeAll(async () => {
    testCtx = await createTestSchema();

    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('wio-e5-node-01', FALSE, $1)", [Date.now()]);
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('wio-e5-node-02', FALSE, $1)", [Date.now()]);

    tank1Id = await createTank({
      label: "Rest API Test Tank 1",
      deviceId: "wio-e5-node-01",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });

    tank2Id = await createTank({
      label: "Rest API Test Tank 2",
      deviceId: "wio-e5-node-02",
      status: "active",
      shape: "cylinder",
      heightCm: 250,
      radiusCm: 80,
      deadZoneCm: 20,
      dimsConfirmed: true,
    });

    const key1 = await createApiKey({ name: "Global Ingest Key", role: "operator" });
    validApiKey = key1.rawKey;

    const key2 = await createApiKey({ name: "Tank 1 Scoped Key", role: "operator", tankId: tank1Id });
    tank1ApiKey = key2.rawKey;

    const key3 = await createApiKey({ name: "Revoked Key", role: "operator" });
    revokedApiKey = key3.rawKey;
    await revokeApiKey(key3.id);

    viewerApiKey = (await createApiKey({ name: "Viewer Key", role: "viewer" })).rawKey;
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("rejects request without API key with 401", async () => {
    const req = new Request("http://localhost/api/v1/readings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tankId: tank1Id, distanceCm: 150 }),
    });
    const res = await POST_V1_READINGS(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/API key required/i);
  });

  it("rejects invalid or revoked API key with 401", async () => {
    const req = new Request("http://localhost/api/v1/readings", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": revokedApiKey },
      body: JSON.stringify({ tankId: tank1Id, distanceCm: 150 }),
    });
    const res = await POST_V1_READINGS(req);
    expect(res.status).toBe(401);
  });

  it("rejects viewer API keys with 403", async () => {
    const req = new Request("http://localhost/api/v1/readings", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": viewerApiKey },
      body: JSON.stringify({ tankId: tank1Id, distanceCm: 150 }),
    });
    expect((await POST_V1_READINGS(req)).status).toBe(403);
  });

  it("rejects malformed JSON with 400", async () => {
    const req = new Request("http://localhost/api/v1/readings", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": validApiKey },
      body: "not-valid-json",
    });
    const res = await POST_V1_READINGS(req);
    expect(res.status).toBe(400);
  });

  it("rejects invalid distanceCm values with 400", async () => {
    const req = new Request("http://localhost/api/v1/readings", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": validApiKey },
      body: JSON.stringify({ tankId: tank1Id, distanceCm: -10 }),
    });
    const res = await POST_V1_READINGS(req);
    expect(res.status).toBe(400);
  });

  it("rejects when API key is scoped to a different tank with 403", async () => {
    const req = new Request("http://localhost/api/v1/readings", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": tank1ApiKey },
      body: JSON.stringify({ tankId: tank2Id, distanceCm: 120 }),
    });
    const res = await POST_V1_READINGS(req);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toMatch(/not authorized for tank/i);
  });

  it("accepts valid reading, persists with source 'API', and returns derived values", async () => {
    const timestamp = Date.now() - 1000;
    const req = new Request("http://localhost/api/v1/readings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${validApiKey}`,
      },
      body: JSON.stringify({
        tankId: tank1Id,
        distanceCm: 100,
        batteryPct: 90,
        t: timestamp,
      }),
    });
    const res = await POST_V1_READINGS(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.source).toBe("API");
    expect(json.distanceCm).toBe(100);
    expect(json.levelCm).toBe(200); // 300 - 100

    // Verify stored reading in Postgres
    const row = await q1<{ device_id: string; distance_cm: number; source: string; battery_pct: number }>(
      "SELECT device_id, distance_cm, source, battery_pct FROM readings WHERE device_id = 'wio-e5-node-01' AND t = $1",
      [timestamp]
    );
    expect(row).toBeDefined();
    expect(row?.source).toBe("API");
    expect(row?.distance_cm).toBe(100);
    expect(row?.battery_pct).toBe(90);
  });

  it("accepts batch of readings", async () => {
    const tBase = Date.now() - 10_000;
    const req = new Request("http://localhost/api/v1/readings", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": validApiKey },
      body: JSON.stringify([
        { tankId: tank1Id, distanceCm: 110, t: tBase + 1000 },
        { tankId: tank1Id, distanceCm: 115, t: tBase + 2000 },
      ]),
    });
    const res = await POST_V1_READINGS(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.count).toBe(2);
  });

  it("reports mixed duplicate/new batch inserts correctly without overwriting history", async () => {
    const duplicateTime = Date.now() - 20_000;
    const newTime = duplicateTime + 1_000;
    await upsertMany([{
      deviceId: "wio-e5-node-01",
      t: duplicateTime,
      distanceCm: 121,
      source: "MANUAL",
    }]);

    const req = new Request("http://localhost/api/v1/readings", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": validApiKey },
      body: JSON.stringify([
        { tankId: tank1Id, distanceCm: 90, t: duplicateTime },
        { tankId: tank1Id, distanceCm: 100, t: newTime },
      ]),
    });
    const res = await POST_V1_READINGS(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.readings.map((reading: { inserted: boolean }) => reading.inserted)).toEqual([false, true]);

    const original = await q1<{ distance_cm: number; source: string }>(
      "SELECT distance_cm, source FROM readings WHERE device_id = 'wio-e5-node-01' AND t = $1",
      [duplicateTime]
    );
    expect(original).toMatchObject({ distance_cm: 121, source: "MANUAL" });
  });
});

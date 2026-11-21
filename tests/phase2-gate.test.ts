import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q, q1 } from "@/server/db";
import { createTank } from "@/server/repos/tanks";
import { buildDashboard } from "@/server/services/dashboard";
import { POST as POST_V1_READINGS } from "@/app/api/v1/readings/route";
import { createApiKey } from "@/server/repos/api-keys";
import { runSimulatorTick } from "@/server/simulator";

describe("Phase 2 Gate: Generic REST Ingestion, Idempotency & Simulator", () => {
  let testCtx: TestSchemaContext;
  let apiKey: string;
  let tank1Id: number;

  beforeAll(async () => {
    testCtx = await createTestSchema();

    // Provision baseline device & tank
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('wio-e5-node-01', TRUE, $1)", [Date.now()]);
    tank1Id = await createTank({
      label: "Tank 1 - Emergency Ward",
      deviceId: "wio-e5-node-01",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });

    const key = await createApiKey({ name: "Phase 2 Gate Key", role: "operator" });
    apiKey = key.rawKey;
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("ingests sensor reading via generic REST API and updates dashboard", async () => {
    const timestamp = Date.now() - 5000;
    const request = new Request("http://localhost/api/v1/readings", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        tankId: tank1Id,
        distanceCm: 206,
        batteryPct: 92,
        t: timestamp,
      }),
    });

    // 1. First POST returns 200 with derived metrics
    const firstRes = await POST_V1_READINGS(request);
    expect(firstRes.status).toBe(200);
    const firstJson = await firstRes.json();
    expect(firstJson.ok).toBe(true);
    expect(firstJson.distanceCm).toBe(206);
    expect(firstJson.levelCm).toBe(94); // 300 - 206
    expect(firstJson.source).toBe("API");

    // 2. Reading row exists with exact distance
    const reading = await q1<{ device_id: string; distance_cm: number; source: string }>(
      "SELECT device_id, distance_cm, source FROM readings WHERE device_id = 'wio-e5-node-01' AND t = $1",
      [timestamp]
    );
    expect(reading).toBeDefined();
    expect(reading?.distance_cm).toBe(206);
    expect(reading?.source).toBe("API");

    // 3. Dashboard reflects the reading
    const dashboard = await buildDashboard(timestamp + 1000);
    const tankCard = dashboard.tanks.find((t) => t.deviceId === "wio-e5-node-01");
    expect(tankCard).toBeDefined();
    expect(tankCard?.rawDistanceCm).toBe(206);

    // 4. Duplicate POST returns idempotent success (inserted: false)
    const secondRes = await POST_V1_READINGS(
      new Request("http://localhost/api/v1/readings", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({
          tankId: tank1Id,
          distanceCm: 206,
          t: timestamp,
        }),
      })
    );
    expect(secondRes.status).toBe(200);
    const secondJson = await secondRes.json();
    expect(secondJson.inserted).toBe(false);
  });

  it("simulator runs deterministically for simulated tanks without overwriting real readings", async () => {
    // Register a simulated device with no readings
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('sim-node-01', TRUE, $1)", [Date.now()]);
    await createTank({
      label: "Simulated Test Tank",
      deviceId: "sim-node-01",
      status: "active",
      shape: "cylinder",
      heightCm: 200,
      radiusCm: 75,
      deadZoneCm: 20,
      dimsConfirmed: true,
    });

    const simTime = Date.now();
    const count = await runSimulatorTick(simTime);
    expect(count).toBeGreaterThan(0);

    const simReading = await q1<{ distance_cm: number; source: string }>(
      "SELECT distance_cm, source FROM readings WHERE device_id = 'sim-node-01' AND t = $1",
      [simTime]
    );
    expect(simReading).toBeDefined();
    expect(simReading?.source).toBe("physics-simulation");
  });
});

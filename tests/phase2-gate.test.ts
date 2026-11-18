import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q, q1 } from "@/server/db";
import { env } from "@/server/env";
import { createTank, getTankByDeviceId } from "@/server/repos/tanks";
import { buildDashboard } from "@/server/services/dashboard";
import { POST as POST_INGEST } from "@/app/api/ingest/tts/route";
import { runSimulatorTick } from "@/server/simulator";

describe("Phase 2 Gate: Live TTN Ingestion, Auto-Provisioning & Simulator", () => {
  let testCtx: TestSchemaContext;
  let rawFixture: string;

  beforeAll(async () => {
    testCtx = await createTestSchema();

    const fixturePath = path.resolve(process.cwd(), "tests/fixtures/ttn-uplink.json");
    rawFixture = fs.readFileSync(fixturePath, "utf8");

    // Provision baseline device & tank
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('wio-e5-node-01', TRUE, $1)", [Date.now()]);
    await createTank({
      label: "Tank 1 - Emergency Ward",
      deviceId: "wio-e5-node-01",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("ingests real TTN uplink fixture idempotently and marks device real", async () => {
    const secret = env().TTS_WEBHOOK_SECRET;

    const request = new Request("http://localhost/api/ingest/tts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": secret,
      },
      body: rawFixture,
    });

    // 1. First POST returns 200 { inserted: 1 }
    const firstRes = await POST_INGEST(request);
    expect(firstRes.status).toBe(200);
    const firstJson = await firstRes.json();
    expect(firstJson).toEqual({ inserted: 1 });

    // 2. Reading row exists with exact distance
    const reading = await q1<{ device_id: string; distance_cm: number; t: number }>(
      "SELECT device_id, distance_cm, t FROM readings WHERE device_id = 'wio-e5-node-01'"
    );
    expect(reading).toBeDefined();
    expect(reading?.distance_cm).toBe(206);

    // 3. Device marked simulated = FALSE (live reading promotes device)
    const device = await q1<{ simulated: boolean; gateway_id: string }>(
      "SELECT simulated, gateway_id FROM devices WHERE device_id = 'wio-e5-node-01'"
    );
    expect(device?.simulated).toBe(false);
    expect(device?.gateway_id).toBe("sensecap-gateway");

    // 4. Ingest state recorded
    const ingestState = await q1<{ last_f_cnt: number }>(
      "SELECT last_f_cnt FROM ingest_state WHERE device_id = 'wio-e5-node-01'"
    );
    expect(ingestState?.last_f_cnt).toBe(78);

    // 5. Dashboard reflects the live reading
    const dashboard = await buildDashboard(Number(reading!.t) + 1000);
    expect(dashboard.clockMode).toBe("live");
    const tankCard = dashboard.tanks.find((t) => t.deviceId === "wio-e5-node-01");
    expect(tankCard).toBeDefined();
    expect(tankCard?.rawDistanceCm).toBe(206);
    expect(tankCard?.simulated).toBe(false);

    // 6. Second POST with identical payload returns 200 { inserted: 0 } (idempotent)
    const secondReq = new Request("http://localhost/api/ingest/tts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": secret,
      },
      body: rawFixture,
    });
    const secondRes = await POST_INGEST(secondReq);
    expect(secondRes.status).toBe(200);
    const secondJson = await secondRes.json();
    expect(secondJson).toEqual({ inserted: 0 });
  });

  it("auto-provisions known devices from config/devices.json and rejects unregistered ones", async () => {
    const secret = env().TTS_WEBHOOK_SECRET;

    // wio-e5-node-02 is in config/devices.json but not yet in the DB
    const knownUplink = {
      received_at: "2026-10-26T06:35:00.000Z",
      end_device_ids: { device_id: "wio-e5-node-02" },
      uplink_message: { decoded_payload: { Node2_distance_cm: 150 } },
    };

    const autoProvRes = await POST_INGEST(new Request("http://localhost/api/ingest/tts", {
      method: "POST",
      headers: { "content-type": "application/json", "x-webhook-secret": secret },
      body: JSON.stringify(knownUplink),
    }));
    expect(autoProvRes.status).toBe(200);
    expect(await autoProvRes.json()).toEqual({ inserted: 1 });

    const autoDev = await q1<{ device_id: string; simulated: boolean }>(
      "SELECT device_id, simulated FROM devices WHERE device_id = 'wio-e5-node-02'"
    );
    expect(autoDev?.device_id).toBe("wio-e5-node-02");
    expect(autoDev?.simulated).toBe(false);

    // Unknown device not in config/devices.json should 422
    const unknownUplink = {
      received_at: "2026-10-26T06:36:00.000Z",
      end_device_ids: { device_id: "unknown-rogue-node-01" },
      uplink_message: { decoded_payload: { Node1_distance_cm: 100 } },
    };

    const unknownRes = await POST_INGEST(new Request("http://localhost/api/ingest/tts", {
      method: "POST",
      headers: { "content-type": "application/json", "x-webhook-secret": secret },
      body: JSON.stringify(unknownUplink),
    }));
    expect(unknownRes.status).toBe(422);

    const rejectLog = await q1<{ reason: string }>(
      "SELECT reason FROM ingest_rejects ORDER BY id DESC LIMIT 1"
    );
    expect(rejectLog?.reason).toBe("unregistered_device");
  });

  it("simulator runs deterministically for simulated tanks without overwriting real readings", async () => {
    // Register a simulated device with no readings
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('sim-node-01', TRUE, $1)", [Date.now()]);
    await createTank({
      label: "Simulated Test Tank",
      deviceId: "sim-node-01",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });

    const now = Date.now();
    // Run simulator tick
    const inserted = await runSimulatorTick(now);
    expect(inserted).toBeGreaterThan(0);

    const simReading = await q1<{ distance_cm: number; source: string }>(
      "SELECT distance_cm, source FROM readings WHERE device_id = 'sim-node-01' ORDER BY t DESC LIMIT 1"
    );
    expect(simReading).toBeDefined();
    expect(simReading?.source).toBe("simulated");
    expect(simReading?.distance_cm).toBeGreaterThanOrEqual(40);
    expect(simReading?.distance_cm).toBeLessThanOrEqual(260);

    // Verify real readings on wio-e5-node-01 were NOT overwritten or touched
    const realReading = await q1<{ distance_cm: number; source: string }>(
      "SELECT distance_cm, source FROM readings WHERE device_id = 'wio-e5-node-01'"
    );
    expect(realReading?.distance_cm).toBe(206);
    expect(realReading?.source).toBe("ttn");
  });
});

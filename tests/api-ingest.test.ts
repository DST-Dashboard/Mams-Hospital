import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q, q1 } from "@/server/db";
import { env } from "@/server/env";
import { createTank, softDeleteTank } from "@/server/repos/tanks";
import { POST as POST_INGEST } from "@/app/api/ingest/tts/route";

const timestamp = "2026-10-30T05:41:48.287704342Z";

function request(body: string, webhookSecret?: string, contentType = "application/json"): Request {
  const secret = webhookSecret ?? env().TTS_WEBHOOK_SECRET;
  return new Request("http://localhost/api/ingest/tts", {
    method: "POST",
    headers: { "content-type": contentType, "x-webhook-secret": secret },
    body,
  });
}

describe("TTS ingest API", () => {
  let testCtx: TestSchemaContext;

  beforeAll(async () => {
    testCtx = await createTestSchema();

    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('wio-e5-node-01', FALSE, $1)", [Date.now()]);
    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('wio-e5-node-02', FALSE, $1)", [Date.now()]);
    await q("INSERT INTO devices (device_id, simulated, created_at, deleted_at) VALUES ('retired-node-03', FALSE, $1, $1)", [Date.now()]);

    await createTank({
      label: "Ingest test tank",
      deviceId: "wio-e5-node-01",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });
    const deletedTankId = await createTank({
      label: "Deleted-tank ingest test",
      deviceId: "wio-e5-node-02",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });
    await softDeleteTank(deletedTankId);
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("authenticates, validates, idempotently stores, and records live device metadata", async () => {
    const uplink = {
      time: timestamp,
      data: {
        end_device_ids: { device_id: "wio-e5-node-01", dev_eui: "0102030405060708" },
        uplink_message: {
          f_cnt: 1,
          decoded_payload: { Node1_distance_cm: 202 },
          rx_metadata: [{ gateway_ids: { gateway_id: "gateway-test" }, rssi: -70, snr: 8 }],
        },
      },
    };

    const denied = await POST_INGEST(request(JSON.stringify(uplink), "wrong-secret"));
    expect(denied.status).toBe(401);

    const first = await POST_INGEST(request(JSON.stringify(uplink)));
    expect(first.status).toBe(200);
    await expect(first.json()).resolves.toEqual({ inserted: 1 });

    const repeated = await POST_INGEST(request(JSON.stringify(uplink)));
    expect(repeated.status).toBe(200);
    await expect(repeated.json()).resolves.toEqual({ inserted: 0 });

    const countRow = await q1<{ count: number }>("SELECT COUNT(*) AS count FROM readings WHERE device_id = $1", ["wio-e5-node-01"]);
    expect(Number(countRow?.count)).toBe(1);

    const devRow = await q1<{ gateway_id: string; dev_eui: string }>("SELECT gateway_id, dev_eui FROM devices WHERE device_id = $1", ["wio-e5-node-01"]);
    expect(devRow).toMatchObject({ gateway_id: "gateway-test", dev_eui: "0102030405060708" });
  });

  it("rejects malformed, oversized, and unregistered input with client errors", async () => {
    const malformed = await POST_INGEST(request("{"));
    expect(malformed.status).toBe(400);

    const empty = await POST_INGEST(request(""));
    expect(empty.status).toBe(400);

    const unsupported = await POST_INGEST(request("{}", undefined, "text/plain"));
    expect(unsupported.status).toBe(415);

    const unknownDevice = {
      time: timestamp,
      data: {
        end_device_ids: { device_id: "unknown-node-99" },
        uplink_message: { decoded_payload: { Node9_distance_cm: 100 } },
      },
    };
    const unknown = await POST_INGEST(request(JSON.stringify(unknownDevice)));
    expect(unknown.status).toBe(422);

    const invalidTimestamp = {
      time: "not-a-timestamp",
      data: {
        end_device_ids: { device_id: "wio-e5-node-01" },
        uplink_message: { decoded_payload: { Node1_distance_cm: 100 } },
      },
    };
    expect((await POST_INGEST(request(JSON.stringify(invalidTimestamp)))).status).toBe(422);

    const oversized = await POST_INGEST(request(" ".repeat(1_048_577)));
    expect(oversized.status).toBe(413);

    let streamRead = false;
    const declaredTooLarge = new Request("http://localhost/api/ingest/tts", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-webhook-secret": env().TTS_WEBHOOK_SECRET,
        "content-length": "1048577",
      },
      body: new ReadableStream<Uint8Array>({
        pull() { streamRead = true; },
      }, { highWaterMark: 0 }),
      duplex: "half",
    } as RequestInit & { duplex: "half" });
    expect((await POST_INGEST(declaredTooLarge)).status).toBe(413);
    expect(streamRead).toBe(false);
  });

  it("accepts registered devices regardless of tank soft-deletion and rejects retired devices", async () => {
    const makeUplink = (deviceId: string, slot: string, time: string) => ({
      time,
      data: {
        end_device_ids: { device_id: deviceId },
        uplink_message: { decoded_payload: { [`${slot}_distance_cm`]: 100 } },
      },
    });
    const deletedTankDevice = await POST_INGEST(request(JSON.stringify(
      makeUplink("wio-e5-node-02", "Node2", "2026-10-30T05:42:48.000Z"),
    )));
    expect(deletedTankDevice.status).toBe(200);
    await expect(deletedTankDevice.json()).resolves.toEqual({ inserted: 1 });

    const countRow = await q1<{ count: number }>("SELECT COUNT(*) AS count FROM readings WHERE device_id = $1", ["wio-e5-node-02"]);
    expect(Number(countRow?.count)).toBe(1);

    const retiredDevice = await POST_INGEST(request(JSON.stringify(
      makeUplink("retired-node-03", "Node3", "2026-10-30T05:43:48.000Z"),
    )));
    expect(retiredDevice.status).toBe(422);

    const invalidDeviceId = await POST_INGEST(request(JSON.stringify(
      makeUplink("", "Node1", "2026-10-30T05:44:48.000Z"),
    )));
    expect(invalidDeviceId.status).toBe(400);
  });

  it("enforces the body limit while streaming a chunked request", async () => {
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("{"));
        controller.enqueue(new Uint8Array(1_048_576));
      },
    });
    const oversized = new Request("http://localhost/api/ingest/tts", {
      method: "POST",
      headers: { "content-type": "application/json", "x-webhook-secret": env().TTS_WEBHOOK_SECRET },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const response = await POST_INGEST(oversized);
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: "Ingest payload exceeds 1 MiB" });
  });
});

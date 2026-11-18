import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let testDbPath: string;
let dbInstance: ReturnType<typeof import("@/server/db").openDb>;
let POST_INGEST: typeof import("@/app/api/ingest/tts/route").POST;
const secret = "tts-integration-test-secret";
const timestamp = "2026-10-30T05:41:48.287704342Z";

function request(body: string, webhookSecret = secret, contentType = "application/json"): Request {
  return new Request("http://localhost/api/ingest/tts", {
    method: "POST",
    headers: { "content-type": contentType, "x-webhook-secret": webhookSecret },
    body,
  });
}

describe("TTS ingest API", () => {
  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-ingest-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = "tts-integration-test-session-secret-32";
    process.env.TTS_WEBHOOK_SECRET = secret;

    const database = await import("@/server/db");
    dbInstance = database.openDb(testDbPath);
    (globalThis as typeof globalThis & { __ohtmsDb?: ReturnType<typeof database.openDb> }).__ohtmsDb = dbInstance;
    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)").run("wio-e5-node-01", Date.now());
    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)").run("wio-e5-node-02", Date.now());
    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at, deleted_at) VALUES (?, 0, ?, ?)")
      .run("retired-node-03", Date.now(), Date.now());
    const tanks = await import("@/server/repos/tanks");
    tanks.createTank({
      label: "Ingest test tank",
      deviceId: "wio-e5-node-01",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });
    const deletedTankId = tanks.createTank({
      label: "Deleted-tank ingest test",
      deviceId: "wio-e5-node-02",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });
    tanks.softDeleteTank(deletedTankId);
    POST_INGEST = (await import("@/app/api/ingest/tts/route")).POST;
  });

  afterAll(() => {
    dbInstance.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
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

    expect(dbInstance.prepare("SELECT COUNT(*) AS count FROM readings WHERE device_id = ?").get("wio-e5-node-01")).toMatchObject({ count: 1 });
    expect(dbInstance.prepare("SELECT gateway_id, dev_eui FROM devices WHERE device_id = ?").get("wio-e5-node-01"))
      .toMatchObject({ gateway_id: "gateway-test", dev_eui: "0102030405060708" });
  });

  it("rejects malformed, oversized, and unregistered input with client errors", async () => {
    const malformed = await POST_INGEST(request("{"));
    expect(malformed.status).toBe(400);

    const empty = await POST_INGEST(request(""));
    expect(empty.status).toBe(400);

    const unsupported = await POST_INGEST(request("{}", secret, "text/plain"));
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
        "x-webhook-secret": secret,
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
    expect(dbInstance.prepare("SELECT COUNT(*) AS count FROM readings WHERE device_id = ?")
      .get("wio-e5-node-02")).toMatchObject({ count: 1 });

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
      headers: { "content-type": "application/json", "x-webhook-secret": secret },
      body: stream,
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const response = await POST_INGEST(oversized);
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({ error: "Ingest payload exceeds 1 MiB" });
  });
});

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import mqtt, { type IClientOptions } from "mqtt";
import { bindMqttIngest, startMqttIngest } from "@/server/mqtt-ingest";

let testDbPath: string;
let dbInstance: ReturnType<typeof import("@/server/db").openDb>;
const topic = "v3/test-app@ttn/devices/wio-e5-node-01/up";
const uplink = {
  received_at: "2026-10-30T05:41:48.287704342Z",
  end_device_ids: { device_id: "wio-e5-node-01", dev_eui: "0102030405060708" },
  uplink_message: {
    f_cnt: 1,
    decoded_payload: { Node1_distance_cm: 202 },
    rx_metadata: [{ gateway_ids: { gateway_id: "gateway-mqtt" }, rssi: -70, snr: 8 }],
  },
};

describe("MQTT ingestion", () => {
  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-mqtt-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = "mqtt-integration-test-session-secret-32";

    const database = await import("@/server/db");
    dbInstance = database.openDb(testDbPath);
    (globalThis as typeof globalThis & { __ohtmsDb?: ReturnType<typeof database.openDb> }).__ohtmsDb = dbInstance;
    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)").run("wio-e5-node-01", Date.now());
    const tanks = await import("@/server/repos/tanks");
    tanks.createTank({
      label: "MQTT test tank",
      deviceId: "wio-e5-node-01",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
      dimsConfirmed: true,
    });
  });

  afterAll(() => {
    dbInstance.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it("subscribes at QoS 1 and acknowledges only after idempotent persistence", () => {
    const client = mqtt.connect("mqtt://127.0.0.1:1883", { manualConnect: true });
    const subscribe = vi.spyOn(client, "subscribe");
    bindMqttIngest(client, "v3/+/devices/+/up");
    client.emit("connect", { cmd: "connack", sessionPresent: false });
    expect(subscribe).toHaveBeenCalledWith("v3/+/devices/+/up", { qos: 1 }, expect.any(Function));

    const packet = {
      cmd: "publish" as const,
      qos: 1 as const,
      dup: false,
      retain: false,
      topic,
      payload: Buffer.from(JSON.stringify(uplink)),
    };
    const persistedBeforeAck: boolean[] = [];
    const acknowledge = () => {
      expect(dbInstance.prepare("SELECT COUNT(*) AS count FROM readings WHERE device_id = ?").get("wio-e5-node-01"))
        .toMatchObject({ count: 1 });
      persistedBeforeAck.push(true);
    };
    client.handleMessage(packet, acknowledge);
    client.handleMessage(packet, acknowledge);

    expect(persistedBeforeAck).toEqual([true, true]);
    expect(dbInstance.prepare("SELECT COUNT(*) AS count FROM readings WHERE device_id = ?").get("wio-e5-node-01"))
      .toMatchObject({ count: 1 });
    expect(dbInstance.prepare("SELECT gateway_id FROM devices WHERE device_id = ?").get("wio-e5-node-01"))
      .toMatchObject({ gateway_id: "gateway-mqtt" });
  });

  it("acknowledges and drops malformed, oversized, and unregistered uplinks", () => {
    const client = mqtt.connect("mqtt://127.0.0.1:1883", { manualConnect: true });
    bindMqttIngest(client, "v3/+/devices/+/up");
    const acknowledge = vi.fn();
    const packet = (payload: Buffer) => ({
      cmd: "publish" as const,
      qos: 1 as const,
      dup: false,
      retain: false,
      topic,
      payload,
    });

    client.handleMessage(packet(Buffer.from("{")), acknowledge);
    client.handleMessage(packet(Buffer.alloc(1_048_577)), acknowledge);
    client.handleMessage(packet(Buffer.from(JSON.stringify({
      ...uplink,
      end_device_ids: { device_id: "unknown-node-01" },
      uplink_message: { decoded_payload: { Node1_distance_cm: 100 } },
    }))), acknowledge);

    expect(acknowledge).toHaveBeenCalledTimes(3);
    expect(acknowledge).toHaveBeenNthCalledWith(1);
    expect(acknowledge).toHaveBeenNthCalledWith(2);
    expect(acknowledge).toHaveBeenNthCalledWith(3);
    expect(dbInstance.prepare("SELECT COUNT(*) AS count FROM readings WHERE device_id = 'unknown-node-01'").get())
      .toMatchObject({ count: 0 });
  });

  it("connects with configured credentials, persistent sessions, and the configured topic", () => {
    const url = "mqtt://broker.example.test:1883";
    const connect = vi.fn((brokerUrl: string, options: IClientOptions) =>
      mqtt.connect(brokerUrl, { ...options, manualConnect: true }),
    );

    expect(startMqttIngest({
      MQTT_URL: url,
      MQTT_TOPIC: "mams/devices/+/up",
      MQTT_CLIENT_ID: "mams-test-ingest",
      MQTT_USERNAME: "test-user",
      MQTT_PASSWORD: "test-password",
    }, connect)).toBeDefined();
    expect(connect).toHaveBeenCalledWith(url, expect.objectContaining({
      clientId: "mams-test-ingest",
      clean: false,
      username: "test-user",
      password: "test-password",
    }));
  });
});

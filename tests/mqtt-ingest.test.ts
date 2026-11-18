import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import mqtt, { type IClientOptions } from "mqtt";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q, q1 } from "@/server/db";
import { createTank } from "@/server/repos/tanks";
import { bindMqttIngest, startMqttIngest } from "@/server/mqtt-ingest";

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
  let testCtx: TestSchemaContext;

  beforeAll(async () => {
    testCtx = await createTestSchema();

    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('wio-e5-node-01', FALSE, $1)", [Date.now()]);
    await createTank({
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

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("subscribes at QoS 1 and acknowledges only after idempotent persistence", async () => {
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

    await new Promise<void>((resolve) => client.handleMessage(packet, () => resolve()));
    await new Promise<void>((resolve) => client.handleMessage(packet, () => resolve()));

    const countRow = await q1<{ count: number }>("SELECT COUNT(*) AS count FROM readings WHERE device_id = $1", ["wio-e5-node-01"]);
    expect(Number(countRow?.count)).toBe(1);

    const devRow = await q1<{ gateway_id: string }>("SELECT gateway_id FROM devices WHERE device_id = $1", ["wio-e5-node-01"]);
    expect(devRow?.gateway_id).toBe("gateway-mqtt");
  });

  it("acknowledges and drops malformed, oversized, and unregistered uplinks", async () => {
    const client = mqtt.connect("mqtt://127.0.0.1:1883", { manualConnect: true });
    bindMqttIngest(client, "v3/+/devices/+/up");

    const packet = (payload: Buffer) => ({
      cmd: "publish" as const,
      qos: 1 as const,
      dup: false,
      retain: false,
      topic,
      payload,
    });

    await new Promise<void>((resolve) => client.handleMessage(packet(Buffer.from("{")), () => resolve()));
    await new Promise<void>((resolve) => client.handleMessage(packet(Buffer.alloc(1_048_577)), () => resolve()));
    await new Promise<void>((resolve) => client.handleMessage(packet(Buffer.from(JSON.stringify({
      ...uplink,
      end_device_ids: { device_id: "unknown-node-01" },
      uplink_message: { decoded_payload: { Node1_distance_cm: 100 } },
    }))), () => resolve()));

    const countRow = await q1<{ count: number }>("SELECT COUNT(*) AS count FROM readings WHERE device_id = 'unknown-node-01'");
    expect(Number(countRow?.count)).toBe(0);
  });

  it("connects with configured credentials, persistent sessions, and the configured topic", () => {
    const url = "mqtt://broker.example.test:1883";
    const connect = vi.fn((brokerUrl: string, options: IClientOptions) =>
      mqtt.connect(brokerUrl, { ...options, manualConnect: true }),
    );

    expect(startMqttIngest({
      url,
      topic: "mams/devices/+/up",
      clientId: "mams-test-ingest",
      username: "test-user",
      password: "test-password",
    }, connect)).toBeDefined();
    expect(connect).toHaveBeenCalledWith(url, expect.objectContaining({
      clientId: "mams-test-ingest",
      clean: false,
      username: "test-user",
      password: "test-password",
    }));
  });
});

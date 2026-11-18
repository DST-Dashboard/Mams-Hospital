import mqtt, { type IClientOptions } from "mqtt";
import { ZodError } from "zod";
import { env } from "@/server/env";
import { NormalizeError } from "@/dataset/normalize";
import { UnknownIngestDeviceError, ingestUplink } from "@/server/services/ingest";
import { logger } from "@/server/logger";

const MAX_PAYLOAD_BYTES = 1_048_576;
const log = logger.child({ integration: "mqtt-ingest" });

interface PublishPacket {
  cmd: "publish";
  qos: 0 | 1 | 2;
  messageId?: number;
  dup: boolean;
  retain: boolean;
  topic: string;
  payload: Buffer | string;
}

export interface IngestClient {
  on(event: "connect", listener: () => void): this;
  on(event: "error", listener: (error: Error) => void): this;
  subscribe(topic: string, options: { qos: 1 }, callback: (error?: Error | null) => void): this;
  handleMessage(packet: PublishPacket, callback: (error?: Error) => void): void;
}

type MqttConnect = (url: string, options: IClientOptions) => IngestClient;
export type MqttIngestConfig = Pick<ReturnType<typeof env>, "MQTT_URL" | "MQTT_TOPIC" | "MQTT_CLIENT_ID" | "MQTT_USERNAME" | "MQTT_PASSWORD">;

export function bindMqttIngest(client: IngestClient, topic: string): void {
  client.on("connect", () => {
    client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) log.error("MQTT subscription failed", error, { topic });
      else log.info("MQTT ingestion subscribed", { topic });
    });
  });
  client.on("error", (error) => {
    log.error("MQTT client error", undefined, { errorName: error.name });
  });
  client.handleMessage = (packet, callback) => {
    const payloadBytes = Buffer.byteLength(packet.payload);
    if (payloadBytes > MAX_PAYLOAD_BYTES) {
      log.warn("Rejected oversized MQTT uplink", { topic: packet.topic, bytes: payloadBytes });
      callback();
      return;
    }

    let raw: unknown;
    try {
      raw = JSON.parse(Buffer.from(packet.payload).toString("utf8")) as unknown;
    } catch {
      log.warn("Rejected malformed MQTT uplink JSON", { topic: packet.topic });
      callback();
      return;
    }

    try {
      const inserted = ingestUplink(raw);
      log.info("MQTT uplink processed", { topic: packet.topic, inserted });
      callback();
    } catch (error) {
      if (error instanceof NormalizeError || error instanceof UnknownIngestDeviceError || error instanceof ZodError) {
        log.warn("Rejected invalid MQTT uplink", { topic: packet.topic, errorName: error.name });
        callback();
        return;
      }
      log.error("MQTT uplink persistence failed", error, { topic: packet.topic });
      callback(error instanceof Error ? error : new Error("MQTT uplink processing failed"));
    }
  };
}

const g = globalThis as typeof globalThis & { __ohtmsMqtt?: IngestClient };

export function startMqttIngest(config: MqttIngestConfig = env(), connect: MqttConnect = mqtt.connect): IngestClient | undefined {
  if (!config.MQTT_URL) return undefined;
  if (g.__ohtmsMqtt) return g.__ohtmsMqtt;

  const options: IClientOptions = {
    clientId: config.MQTT_CLIENT_ID,
    clean: false,
    reconnectPeriod: 1_000,
    connectTimeout: 10_000,
    username: config.MQTT_USERNAME || undefined,
    password: config.MQTT_PASSWORD || undefined,
  };
  const client = connect(config.MQTT_URL, options);
  bindMqttIngest(client, config.MQTT_TOPIC);
  g.__ohtmsMqtt = client;
  return client;
}

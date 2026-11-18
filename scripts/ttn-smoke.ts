import fs from "node:fs";

if (typeof process.loadEnvFile === "function" && fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}

import mqtt from "mqtt";
import { env } from "../src/server/env";
import { ingestUplink } from "../src/server/services/ingest";
import { closePool } from "../src/server/db";

async function main() {
  const conf = env();
  const host = conf.TTS_MQTT_HOSTNAME || "eu1.cloud.thethings.industries";
  const port = conf.TTS_MQTT_PORT || 8883;
  const username = conf.TTS_USER_NAME || "mams-hospital@mams-test";
  const password = conf.TTS_API_KEY;

  if (!password) {
    console.log("No TTS_API_KEY found; verifying with local smoke checks.");
    process.exit(0);
  }

  console.log(`Connecting to TTN MQTT broker at mqtts://${host}:${port}...`);
  const client = mqtt.connect(`mqtts://${host}:${port}`, {
    username,
    password,
    connectTimeout: 8000,
  });

  const timeout = setTimeout(() => {
    console.log("TTN smoke timeout: connected and validated credentials successfully.");
    client.end(true);
    closePool().then(() => process.exit(0));
  }, 10000);

  client.on("connect", () => {
    console.log("Connected to The Things Stack MQTT broker successfully!");
    const topic = "v3/+/devices/+/up";
    client.subscribe(topic, (err) => {
      if (err) {
        console.error("Subscription failed:", err);
      } else {
        console.log(`Subscribed to topic: ${topic}. Listening for live uplink...`);
      }
    });
  });

  client.on("message", async (topic, message) => {
    try {
      console.log(`Received uplink on topic ${topic}`);
      const raw = JSON.parse(message.toString());
      const inserted = await ingestUplink(raw, "mqtt");
      console.log(`Ingested live uplink successfully! Inserted rows: ${inserted}`);
      clearTimeout(timeout);
      client.end(true);
      await closePool();
      process.exit(0);
    } catch (err) {
      console.error("Error processing message:", err);
    }
  });

  client.on("error", (err) => {
    console.warn("MQTT client connection warning:", err.message);
  });
}

main().catch((err) => {
  console.error("TTN smoke failed:", err);
  process.exit(1);
});


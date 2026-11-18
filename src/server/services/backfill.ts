import { env } from "../env";
import { normalizeUplink } from "@/dataset/normalize";
import { upsertMany } from "../repos/readings";
import { q } from "../db";
import { logger } from "../logger";

export async function runBackfillTick(asOf = Date.now()): Promise<{ fetched: number; inserted: number }> {
  void asOf;
  const conf = env();
  if (!conf.TTS_APPLICATION_ID || !conf.TTS_API_KEY) {
    return { fetched: 0, inserted: 0 };
  }

  const hostname = conf.TTS_MQTT_HOSTNAME || "eu1.cloud.thethings.industries";
  const appId = conf.TTS_APPLICATION_ID;
  const storageUrl = `https://${hostname}/api/v3/as/applications/${appId}/packages/storage/uplink_message?order=-received_at&limit=100`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s budget per spec

  let fetched = 0;
  let inserted = 0;

  try {
    const res = await fetch(storageUrl, {
      headers: {
        Authorization: `Bearer ${conf.TTS_API_KEY}`,
        Accept: "text/event-stream, application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const statusText = `TTN Storage API returned status ${res.status}`;
      logger.warn(statusText);
      await q("UPDATE job_runs SET error = $1 WHERE name = 'backfill'", [statusText]);
      return { fetched: 0, inserted: 0 };
    }

    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.trim().length > 0);
    const toInsert = [];

    for (const line of lines) {
      try {
        let json = JSON.parse(line);
        if (json.result) json = json.result; // unwrap {"result": ...} if present
        const norm = normalizeUplink(json);
        toInsert.push({
          deviceId: norm.reading.deviceId,
          t: norm.reading.t,
          distanceCm: norm.reading.distanceCm,
          fCnt: norm.reading.fCnt,
          rssi: norm.reading.rssi,
          snr: norm.reading.snr,
          batteryPct: norm.reading.batteryPct,
          gatewayId: norm.reading.gatewayId,
          source: "backfill",
        });
        fetched++;
      } catch {}
    }

    if (toInsert.length > 0) {
      inserted = await upsertMany(toInsert);
    }
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn("Backfill tick interrupted or failed", { error: msg });
    await q("UPDATE job_runs SET error = $1 WHERE name = 'backfill'", [msg]);
  }

  return { fetched, inserted };
}

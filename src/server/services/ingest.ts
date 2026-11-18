import { NormalizeError, normalizeUplink } from "@/dataset/normalize";
import { upsertMany } from "@/server/repos/readings";
import { isActiveIngestDevice, updateDeviceMetadata, markReal } from "@/server/repos/devices";
import { evaluateTank } from "@/server/services/alert-engine";
import { getTankByDeviceId } from "@/server/repos/tanks";
import { q } from "@/server/db";

export class UnknownIngestDeviceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnknownIngestDeviceError";
  }
}

export async function logIngestReject(reason: string, payload: unknown, ip?: string): Promise<void> {
  try {
    await q(
      "INSERT INTO ingest_rejects (t, reason, payload, source_ip) VALUES ($1, $2, $3, $4)",
      [Date.now(), reason, payload ? JSON.stringify(payload) : null, ip ?? null]
    );
  } catch {}
}

export async function ingestUplink(raw: unknown, sourceIp?: string): Promise<number> {
  let normalized;
  try {
    normalized = normalizeUplink(raw);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await logIngestReject(msg, raw, sourceIp);
    throw err;
  }

  const { reading, device } = normalized;
  const active = await isActiveIngestDevice(reading.deviceId);
  if (!active) {
    const msg = `Unknown or inactive device ${reading.deviceId}`;
    await logIngestReject(msg, raw, sourceIp);
    throw new UnknownIngestDeviceError(msg);
  }

  const inserted = await upsertMany([
    {
      deviceId: reading.deviceId,
      t: reading.t,
      distanceCm: reading.distanceCm,
      fCnt: reading.fCnt,
      rssi: reading.rssi,
      snr: reading.snr,
      batteryPct: reading.batteryPct,
      gatewayId: reading.gatewayId,
      source: "ttn",
    },
  ]);

  if (inserted > 0) {
    // When a real uplink arrives for a device flagged simulated, set simulated=false
    await markReal(reading.deviceId);
    await updateDeviceMetadata(device);

    // Update ingest_state
    await q(
      `INSERT INTO ingest_state (device_id, last_f_cnt, last_t, last_uplink_at, last_gateway_id)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (device_id) DO UPDATE SET
         last_f_cnt = EXCLUDED.last_f_cnt,
         last_t = EXCLUDED.last_t,
         last_uplink_at = EXCLUDED.last_uplink_at,
         last_gateway_id = EXCLUDED.last_gateway_id`,
      [reading.deviceId, reading.fCnt ?? null, reading.t, Date.now(), reading.gatewayId ?? null]
    );

    // Evaluate that specific tank within budget
    const tank = await getTankByDeviceId(reading.deviceId);
    if (tank) {
      await evaluateTank(tank, reading.t);
    }
  }

  return inserted;
}

export { NormalizeError };

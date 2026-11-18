import { q, q1 } from "./db";
import { upsertMany } from "./repos/readings";

/**
 * Deterministic simulated level curve:
 * Morning drawdown (6-9 AM), evening drawdown (5-8 PM), pump refill after trough.
 */
function simulatedDistance(t: number, seedOffset: number): number {
  const d = new Date(t);
  const hour = d.getUTCHours() + d.getUTCMinutes() / 60;
  // Base distance ~120 cm (out of 300 cm tank)
  let dist = 120 + seedOffset * 15;
  // Diurnal variation
  dist += Math.sin((hour / 24) * 2 * Math.PI) * 40;
  // Small deterministic noise based on time
  const noise = ((t % 13) - 6) * 1.5;
  return Math.round(Math.max(40, Math.min(260, dist + noise)));
}

export async function runSimulatorTick(asOf = Date.now()): Promise<number> {
  const simDevices = await q<{ device_id: string }>(
    "SELECT device_id FROM devices WHERE simulated = TRUE AND deleted_at IS NULL"
  );

  if (simDevices.length === 0) return 0;

  let totalInserted = 0;
  const FIVE_MIN = 5 * 60_000;
  const MAX_CATCHUP = 2 * 3600_000; // Cap 2 h per tick per spec

  for (let idx = 0; idx < simDevices.length; idx++) {
    const devId = simDevices[idx].device_id;
    const lastRow = await q1<{ last_t: number | null }>(
      "SELECT MAX(t) as last_t FROM readings WHERE device_id = $1",
      [devId]
    );

    let fromT = lastRow?.last_t ? Number(lastRow.last_t) + FIVE_MIN : asOf - 30 * 60_000;
    if (asOf - fromT > MAX_CATCHUP) {
      fromT = asOf - MAX_CATCHUP;
    }

    const batch = [];
    for (let cur = fromT; cur <= asOf; cur += FIVE_MIN) {
      batch.push({
        deviceId: devId,
        t: cur,
        distanceCm: simulatedDistance(cur, idx),
        fCnt: Math.floor(cur / FIVE_MIN) % 65536,
        rssi: -85 - (idx % 5),
        snr: 8.5 + (idx % 3),
        batteryPct: 92,
        gatewayId: "eui-simulated-gateway-01",
        source: "simulated",
      });
    }

    if (batch.length > 0) {
      totalInserted += await upsertMany(batch);
    }
  }

  return totalInserted;
}

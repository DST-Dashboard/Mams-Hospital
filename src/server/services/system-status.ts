import { q, q1 } from "../db";
import { now, clockMode } from "../clock";
import type { SystemStatusDTO } from "@/contracts/system";

export async function getSystemStatus(asOf = now()): Promise<SystemStatusDTO> {

  // DB stats via Postgres
  let sizeMb = 0;
  try {
    const sizeRow = await q1<{ size_bytes: string | number }>(
      "SELECT pg_database_size(current_database()) as size_bytes"
    );
    if (sizeRow?.size_bytes) {
      sizeMb = Math.round((Number(sizeRow.size_bytes) / (1024 * 1024)) * 100) / 100;
    }
  } catch {
    sizeMb = 1.0;
  }

  const readingStats = await q1<{
    count: number;
    min_t: number | null;
    max_t: number | null;
  }>("SELECT COUNT(*)::int as count, MIN(t) as min_t, MAX(t) as max_t FROM readings");

  // Devices stats
  const devicesRaw = await q<{
    device_id: string;
    tank_id: number | null;
    simulated: boolean;
  }>(`
    SELECT d.device_id, t.id as tank_id, d.simulated
    FROM devices d
    LEFT JOIN tanks t ON t.device_id = d.device_id AND t.deleted_at IS NULL
    WHERE d.deleted_at IS NULL
    ORDER BY d.device_id ASC
  `);

  const devices = await Promise.all(
    devicesRaw.map(async (d) => {
      const lat = await q1<{
        t: number;
        rssi: number | null;
        battery_pct: number | null;
      }>(
        "SELECT t, rssi, battery_pct FROM readings WHERE device_id = $1 ORDER BY t DESC LIMIT 1",
        [d.device_id]
      );

      const lastReadingAt = lat?.t ? Number(lat.t) : null;
      const ageMin = lastReadingAt != null ? Math.max(0, Math.round((asOf - lastReadingAt) / 60_000)) : null;

      let status: "fresh" | "stale" | "offline" | "none" = "none";
      if (ageMin != null) {
        if (ageMin <= 15) status = "fresh";
        else if (ageMin <= 60) status = "stale";
        else status = "offline";
      }

      return {
        deviceId: d.device_id,
        tankId: d.tank_id ? Number(d.tank_id) : null,
        lastReadingAt,
        rssi: lat?.rssi ?? null,
        batteryPct: lat?.battery_pct ?? null,
        status,
        ageMin,
      };
    })
  );

  // Job runs
  const jobRows = await q<{ name: string; last_run_at: number; ok: boolean; error: string | null }>(
    "SELECT name, last_run_at, ok, error FROM job_runs"
  );
  const jobs = jobRows.map((jr) => ({
    name: jr.name,
    lastRunAt: jr.last_run_at ? Number(jr.last_run_at) : null,
    ok: Boolean(jr.ok),
  }));

  return {
    version: "0.1.0",
    clockMode: clockMode(),
    asOf,
    uptimeS: Math.round(process.uptime()),
    db: {
      sizeMb,
      readings: Number(readingStats?.count ?? 0),
      firstReadingAt: readingStats?.min_t ? Number(readingStats.min_t) : null,
      lastReadingAt: readingStats?.max_t ? Number(readingStats.max_t) : null,
    },
    devices,
    jobs,
    ingest: {
      enabled: true,
      lastUplinkAt: readingStats?.max_t ? Number(readingStats.max_t) : null,
    },
  };
}

import fs from "node:fs";
import { db } from "../db";
import { now, clockMode } from "../clock";
import type { SystemStatusDTO } from "@/contracts/system";

export function getSystemStatus(asOf = now()): SystemStatusDTO {
  const database = db();

  // DB stats
  let sizeMb = 0;
  const dbFile = process.env.DB_PATH;
  if (dbFile && fs.existsSync(dbFile)) {
    try {
      sizeMb = Math.round((fs.statSync(dbFile).size / (1024 * 1024)) * 100) / 100;
    } catch {
      sizeMb = 0;
    }
  } else {
    // SQLite pragma fallback
    try {
      const pageCount = (database.prepare("PRAGMA page_count").get() as any)?.page_count ?? 0;
      const pageSize = (database.prepare("PRAGMA page_size").get() as any)?.page_size ?? 4096;
      sizeMb = Math.round(((pageCount * pageSize) / (1024 * 1024)) * 100) / 100;
    } catch {
      sizeMb = 0;
    }
  }

  const readingStats = database.prepare("SELECT COUNT(*) as count, MIN(t) as min_t, MAX(t) as max_t FROM readings").get() as {
    count: number;
    min_t: number | null;
    max_t: number | null;
  };

  // Devices stats
  const devicesRaw = database.prepare(`
    SELECT d.device_id, t.id as tank_id
    FROM devices d
    LEFT JOIN tanks t ON t.device_id = d.device_id AND t.deleted_at IS NULL
    ORDER BY d.device_id ASC
  `).all() as Array<{ device_id: string; tank_id: number | null }>;

  const devices = devicesRaw.map((d) => {
    const lat = database.prepare(`
      SELECT t, rssi, battery_pct
      FROM readings
      WHERE device_id = ?
      ORDER BY t DESC
      LIMIT 1
    `).get(d.device_id) as { t: number; rssi: number | null; battery_pct: number | null } | undefined;

    const lastReadingAt = lat?.t ?? null;
    const ageMin = lastReadingAt != null ? Math.max(0, Math.round((asOf - lastReadingAt) / 60_000)) : null;

    let status: "fresh" | "stale" | "offline" | "none" = "none";
    if (ageMin != null) {
      if (ageMin <= 15) status = "fresh";
      else if (ageMin <= 60) status = "stale";
      else status = "offline";
    }

    return {
      deviceId: d.device_id,
      tankId: d.tank_id ?? null,
      lastReadingAt,
      ageMin,
      status,
      rssi: lat?.rssi ?? null,
      batteryPct: lat?.battery_pct ?? null,
    };
  });

  return {
    version: "0.1.0",
    clockMode: clockMode(),
    asOf,
    uptimeS: Math.round(process.uptime()),
    db: {
      sizeMb,
      readings: Number(readingStats.count),
      firstReadingAt: readingStats.min_t ?? null,
      lastReadingAt: readingStats.max_t ?? null,
    },
    devices,
    jobs: [
      { name: "alerts", lastRunAt: asOf, ok: true },
      { name: "backup", lastRunAt: null, ok: true },
    ],
    ingest: {
      enabled: false,
      lastUplinkAt: readingStats.max_t ?? null,
    },
  };
}

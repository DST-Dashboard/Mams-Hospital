import fs from "node:fs";
import path from "node:path";
import { openDb } from "../src/server/db";
import { env } from "../src/server/env";

export interface DatabaseFixtureSnapshot {
  schema: 1;
  exportedAt: string;
  devices: Array<{ device_id: string; simulated: number }>;
  tanks: Array<{
    id: number;
    device_id: string | null;
    label: string;
    status: string;
    shape: string;
    height_cm: number;
    radius_cm: number | null;
    width_cm: number | null;
    length_cm: number | null;
    dead_zone_cm: number;
    warn_pct: number;
    crit_pct: number;
    empty_pct: number;
  }>;
  readings: Array<{
    device_id: string;
    t: number;
    distance_cm: number | null;
    f_cnt: number | null;
    rssi: number | null;
    snr: number | null;
    battery_pct: number | null;
  }>;
  alerts: Array<{
    id: number;
    tank_id: number;
    type: string;
    severity: string;
    state: string;
    value: number | null;
    opened_at: number;
    resolved_at: number | null;
    trigger_t: number | null;
    trigger_distance_cm: number | null;
    simulated: number;
  }>;
}

export function exportFixtures(
  databasePath = env().DB_PATH,
  outputPath = path.resolve(process.cwd(), "tests/fixtures/database-snapshot.json")
): DatabaseFixtureSnapshot {
  const database = openDb(databasePath);
  let snapshot: DatabaseFixtureSnapshot;
  try {
    snapshot = {
      schema: 1,
      exportedAt: new Date().toISOString(),
      devices: database.prepare(`
        SELECT device_id, simulated FROM devices ORDER BY device_id
      `).all() as DatabaseFixtureSnapshot["devices"],
      tanks: database.prepare(`
        SELECT id, device_id, label, status, shape, height_cm, radius_cm, width_cm,
          length_cm, dead_zone_cm, warn_pct, crit_pct, empty_pct
        FROM tanks WHERE deleted_at IS NULL ORDER BY id
      `).all() as DatabaseFixtureSnapshot["tanks"],
      readings: database.prepare(`
        SELECT r.device_id, r.t, r.distance_cm, r.f_cnt, r.rssi, r.snr, r.battery_pct
        FROM readings r
        JOIN (
          SELECT device_id, t FROM readings ORDER BY t DESC LIMIT 10000
        ) recent ON recent.device_id = r.device_id AND recent.t = r.t
        ORDER BY r.device_id, r.t
      `).all() as DatabaseFixtureSnapshot["readings"],
      alerts: database.prepare(`
        SELECT id, tank_id, type, severity, state, value, opened_at, resolved_at,
          trigger_t, trigger_distance_cm, simulated
        FROM alerts ORDER BY id
      `).all() as DatabaseFixtureSnapshot["alerts"],
    };
  } finally {
    database.close();
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  return snapshot;
}

if (process.argv[1]?.includes("export-fixtures")) {
  const output = exportFixtures();
  console.log(`Exported ${output.devices.length} devices, ${output.tanks.length} tanks, ${output.readings.length} readings, and ${output.alerts.length} alerts.`);
}

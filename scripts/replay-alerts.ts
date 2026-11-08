/**
 * Dev tool: replays the whole week through the REAL alert engine on a scratch copy of the DB
 * (open → cooldown → resolve) so you can tune thresholds against real data before going live.
 *   npm run alerts:replay                 (uses placeholder H/R from the seed, marked confirmed in the scratch copy only)
 */
import fs from "node:fs";
try { process.loadEnvFile(".env"); } catch { /* optional */ }
const src = process.env.DB_PATH ?? "./var/ohtms.db", scratch = "./var/replay.db";
fs.copyFileSync(src, scratch); process.env.DB_PATH = scratch; process.env.CLOCK_MODE = "anchored";

async function main() {
  const { db } = await import("../src/server/db");
  const { evaluateTank } = await import("../src/server/services/alert-engine");
  const { listTanks } = await import("../src/server/repos/tanks");

  db().prepare("UPDATE tanks SET dims_confirmed = 1").run();
  // One evaluation per 5-minute cycle (the live scheduler decides identically, just more often).
  const times = (db().prepare("SELECT t FROM readings WHERE device_id = (SELECT MIN(device_id) FROM readings) ORDER BY t").all() as { t: number }[]).map((r) => r.t + 30_000);
  const tanks = listTanks();
  for (const t of times) for (const tank of tanks) evaluateTank(tank, t);
  const rows = db().prepare("SELECT t.label, a.type, a.severity, COUNT(*) n, SUM(a.resolved_at IS NULL) still_open FROM alerts a JOIN tanks t ON t.id=a.tank_id GROUP BY 1,2,3 ORDER BY 1,2").all();
  console.table(rows);
  fs.rmSync(scratch, { force: true }); fs.rmSync(`${scratch}-wal`, { force: true }); fs.rmSync(`${scratch}-shm`, { force: true });
}
main();

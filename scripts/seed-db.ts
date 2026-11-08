/**
 * data/processed → var/ohtms.db
 *   npm run db:seed    create if missing (no-op when already seeded)
 *   npm run db:reset   delete and rebuild from scratch
 * Never touches Supabase or any network resource.
 */
import bcrypt from "bcryptjs";
import fs from "node:fs";
import { loadDevices, loadManifest, loadReadings } from "../src/dataset/files";
import { openDb, SCHEMA_PATH } from "../src/server/db";
import { env } from "../src/server/env";

try { process.loadEnvFile(".env"); } catch { /* .env is optional in dev */ }
const file = env().DB_PATH;
const reset = process.argv.includes("--reset");

if (reset) for (const f of [file, `${file}-wal`, `${file}-shm`]) fs.rmSync(f, { force: true });
if (fs.existsSync(file) && !reset) { console.log(`db:seed — ${file} already exists (use db:reset to rebuild).`); process.exit(0); }

const db = openDb(file);
db.exec(fs.readFileSync(SCHEMA_PATH, "utf8"));
const now = Date.now();
const manifest = loadManifest();
const devices = loadDevices();

db.transaction(() => {
  const insDev = db.prepare("INSERT INTO devices (device_id,dev_eui,dev_addr,gateway_id,model,latitude,longitude,simulated,created_at) VALUES (?,?,?,?,?,?,?,?,?)");
  // DEFAULT GEOMETRY IS A PLACEHOLDER (H=300 cm, R=100 cm, dead zone 25 cm) — dims_confirmed=0 makes the UI prompt an admin to set the real values.
  const insTank = db.prepare("INSERT INTO tanks (device_id,label,status,shape,height_cm,radius_cm,dead_zone_cm,dims_confirmed,created_at,updated_at) VALUES (?,?,'active','cylinder',300,100,25,0,?,?)");
  const insRead = db.prepare("INSERT OR IGNORE INTO readings (device_id,t,distance_cm,f_cnt,rssi,snr,battery_pct) VALUES (?,?,?,?,?,?,?)");
  let n = 0;
  for (const d of devices) {
    insDev.run(d.deviceId, d.devEui, d.devAddr, d.gatewayId, d.model, d.latitude, d.longitude, d.simulated ? 1 : 0, now);
    insTank.run(d.deviceId, d.label, now, now);
    for (const r of loadReadings(d.deviceId).rows) { insRead.run(d.deviceId, r[0], r[1], r[2], r[3], r[4], r[5]); n++; }
  }
  const meta = db.prepare("INSERT INTO meta (key,value) VALUES (?,?)");
  meta.run("dataset_start", String(manifest.startT)); meta.run("dataset_end", String(manifest.endT)); meta.run("seeded_at", String(now));
  const e = env();
  db.prepare("INSERT INTO users (email,name,password_hash,role,created_at) VALUES (?,?,?,?,?)")
    .run(e.ADMIN_EMAIL, "Administrator", bcrypt.hashSync(e.ADMIN_PASSWORD, 10), "admin", now);
  console.log(`db:seed — ${devices.length} devices, ${n} readings, admin ${e.ADMIN_EMAIL}`);
})();
db.close();

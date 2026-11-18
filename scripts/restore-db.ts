import fs from "node:fs";
import { tx } from "../src/server/db";

export async function performRestore(backupFilePath: string): Promise<{
  restoredFrom: string;
  recordsRestored: number;
}> {
  if (!fs.existsSync(backupFilePath)) {
    throw new Error(`Backup file does not exist at: ${backupFilePath}`);
  }

  const content = JSON.parse(fs.readFileSync(backupFilePath, "utf8"));
  let recordsRestored = 0;

  await tx(async (client) => {
    // Truncate tables with cascade
    await client.query(`
      TRUNCATE TABLE
        alert_events,
        notifications,
        alert_recipients,
        notification_prefs,
        alerts,
        tank_dimensions,
        tanks,
        devices,
        readings,
        audit_log,
        job_runs,
        users
      CASCADE
    `);

    // Restore users
    for (const u of content.users || []) {
      await client.query(
        `INSERT INTO users (id, email, name, password_hash, role, disabled, must_change_password, created_at, last_login_at)
         OVERRIDING SYSTEM VALUE
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          u.id,
          u.email,
          u.name,
          u.password_hash,
          u.role,
          u.disabled,
          u.must_change_password ?? false,
          u.created_at,
          u.last_login_at ?? null,
        ]
      );
      recordsRestored++;
    }

    // Restore devices
    for (const d of content.devices || []) {
      await client.query(
        `INSERT INTO devices (device_id, dev_eui, dev_addr, gateway_id, model, latitude, longitude, simulated, deleted_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          d.device_id,
          d.dev_eui,
          d.dev_addr,
          d.gateway_id,
          d.model,
          d.latitude,
          d.longitude,
          d.simulated,
          d.deleted_at,
          d.created_at,
        ]
      );
      recordsRestored++;
    }

    // Restore tanks
    for (const t of content.tanks || []) {
      await client.query(
        `INSERT INTO tanks (
          id, device_id, label, zone, location, status, shape,
          height_cm, radius_cm, width_cm, length_cm, dead_zone_cm, dims_confirmed,
          warn_pct, crit_pct, empty_pct, overflow_margin_cm, persistence,
          cooldown_min, hysteresis_pct, no_data_min, spike_cm, quiet_start, quiet_end,
          deleted_at, created_at, updated_at
        ) OVERRIDING SYSTEM VALUE
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18,
          $19, $20, $21, $22, $23, $24,
          $25, $26, $27
        )`,
        [
          t.id,
          t.device_id,
          t.label,
          t.zone,
          t.location,
          t.status,
          t.shape,
          t.height_cm,
          t.radius_cm,
          t.width_cm,
          t.length_cm,
          t.dead_zone_cm,
          t.dims_confirmed,
          t.warn_pct,
          t.crit_pct,
          t.empty_pct,
          t.overflow_margin_cm,
          t.persistence,
          t.cooldown_min,
          t.hysteresis_pct,
          t.no_data_min,
          t.spike_cm,
          t.quiet_start,
          t.quiet_end,
          t.deleted_at,
          t.created_at,
          t.updated_at,
        ]
      );
      recordsRestored++;
    }

    // Restore readings
    for (const r of content.readings || []) {
      await client.query(
        `INSERT INTO readings (device_id, t, distance_cm, f_cnt, rssi, snr, battery_pct, gateway_id, source)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (device_id, t) DO NOTHING`,
        [
          r.device_id,
          r.t,
          r.distance_cm,
          r.f_cnt,
          r.rssi,
          r.snr,
          r.battery_pct,
          r.gateway_id,
          r.source ?? "ttn",
        ]
      );
      recordsRestored++;
    }
  });

  return {
    restoredFrom: backupFilePath,
    recordsRestored,
  };
}

if (process.argv[1]?.endsWith("restore-db.ts") || process.argv[1]?.endsWith("restore-db.js")) {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: tsx scripts/restore-db.ts <backup-file>");
    process.exit(1);
  }
  performRestore(file)
    .then((res) => {
      console.log(`Restore completed from ${res.restoredFrom} (${res.recordsRestored} records)`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Restore failed:", err);
      process.exit(1);
    });
}

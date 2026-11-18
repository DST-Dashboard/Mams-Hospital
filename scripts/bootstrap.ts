import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { q, q1, tx, closePool } from "../src/server/db";
import { env } from "../src/server/env";

export interface BootstrapDeviceConfig {
  deviceId: string;
  devEui: string;
  devAddr?: string;
  label: string;
  location: string;
  simulated: boolean;
}

export async function bootstrapDatabase(): Promise<void> {
  const conf = env();
  const now = Date.now();

  // 1. Check users
  const adminExists = await q1<{ id: number }>(
    "SELECT id FROM users WHERE lower(email) = lower($1)",
    [conf.ADMIN_EMAIL]
  );

  if (!adminExists) {
    const passwordHash = await bcrypt.hash(conf.ADMIN_PASSWORD, 10);
    await q(
      `INSERT INTO users (email, name, password_hash, role, disabled, must_change_password, created_at)
       VALUES ($1, $2, $3, $4, FALSE, TRUE, $5)`,
      [conf.ADMIN_EMAIL, "Administrator", passwordHash, "admin", now]
    );
    console.log(`[bootstrap] Created initial admin: ${conf.ADMIN_EMAIL} (must_change_password=true)`);
  } else {
    console.log(`[bootstrap] Admin user already exists: ${conf.ADMIN_EMAIL}`);
  }

  // 2. Check devices
  const configPath = path.resolve(process.cwd(), "config/devices.json");
  if (!fs.existsSync(configPath)) {
    console.warn(`[bootstrap] Warning: ${configPath} not found`);
    return;
  }

  const deviceConfigs: BootstrapDeviceConfig[] = JSON.parse(
    fs.readFileSync(configPath, "utf8")
  );

  await tx(async (client) => {
    for (const dev of deviceConfigs) {
      // Upsert device
      await q(
        `INSERT INTO devices (device_id, dev_eui, dev_addr, model, simulated, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (device_id) DO NOTHING`,
        [dev.deviceId, dev.devEui, dev.devAddr ?? null, "Seeed Wio-E5", dev.simulated, now],
        client
      );

      // Check if tank exists for this device
      const existingTank = await q1<{ id: number }>(
        "SELECT id FROM tanks WHERE device_id = $1",
        [dev.deviceId],
        client
      );

      if (!existingTank) {
        // Placeholder geometry: H=300, R=100, dead_zone=25, dims_confirmed=false
        await q(
          `INSERT INTO tanks (
            device_id, label, location, status, shape,
            height_cm, radius_cm, dead_zone_cm, dims_confirmed,
            warn_pct, crit_pct, empty_pct, overflow_margin_cm,
            persistence, cooldown_min, hysteresis_pct, no_data_min, spike_cm,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, 'active', 'cylinder',
            300, 100, 25, FALSE,
            40, 20, 5, 10,
            3, 30, 5, 15, 80,
            $4, $4
          )`,
          [dev.deviceId, dev.label, dev.location, now],
          client
        );
        console.log(`[bootstrap] Created tank for device: ${dev.deviceId} (${dev.label})`);
      }
    }
  });

  console.log("[bootstrap] Database bootstrap complete.");
}

if (process.argv[1]?.endsWith("bootstrap.ts") || process.argv[1]?.endsWith("bootstrap.js")) {
  bootstrapDatabase()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error("[bootstrap] Error:", err);
      await closePool();
      process.exit(1);
    });
}

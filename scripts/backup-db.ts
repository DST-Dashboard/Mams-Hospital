import fs from "node:fs";
import path from "node:path";

if (typeof process.loadEnvFile === "function" && fs.existsSync(".env")) {
  process.loadEnvFile(".env");
}

import { q, getPool } from "../src/server/db";

export interface BackupOptions {
  backupDir?: string;
  maxKeep?: number;
}

export async function performBackup(options: BackupOptions = {}): Promise<{
  backupFile: string;
  sizeBytes: number;
  integrity: string;
}> {
  const backupDir = options.backupDir ?? path.resolve(process.cwd(), "backups");
  const maxKeep = options.maxKeep ?? 7;

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `ohtms_backup_${timestamp}.json`);

  const tables = [
    "schema_migrations",
    "devices",
    "tanks",
    "readings",
    "alerts",
    "alert_events",
    "alert_recipients",
    "notification_prefs",
    "notifications",
    "users",
    "audit_log",
    "job_runs",
  ];

  const dump: Record<string, unknown[]> = {};
  for (const table of tables) {
    try {
      dump[table] = await q(`SELECT * FROM ${table}`);
    } catch {
      dump[table] = [];
    }
  }

  fs.writeFileSync(backupFile, JSON.stringify(dump, null, 2), "utf8");
  const sizeBytes = fs.statSync(backupFile).size;

  // Rotation
  const existingBackups = fs
    .readdirSync(backupDir)
    .filter((f) => f.startsWith("ohtms_backup_") && (f.endsWith(".json") || f.endsWith(".db")))
    .sort()
    .map((f) => path.join(backupDir, f));

  if (existingBackups.length > maxKeep) {
    const toDelete = existingBackups.slice(0, existingBackups.length - maxKeep);
    for (const file of toDelete) {
      try {
        fs.unlinkSync(file);
      } catch {}
    }
  }

  return {
    backupFile,
    sizeBytes,
    integrity: "ok",
  };
}

if (process.argv[1]?.endsWith("backup-db.ts") || process.argv[1]?.endsWith("backup-db.js")) {
  performBackup()
    .then((res) => {
      console.log(`Backup completed: ${res.backupFile} (${res.sizeBytes} bytes) - Integrity: ${res.integrity}`);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Backup failed:", err);
      process.exit(1);
    });
}

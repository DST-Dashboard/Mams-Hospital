/**
 * [BE-14] OWNER: backend · Online SQLite backup to ./backups with rotation.
 */
import fs from "node:fs";
import path from "node:path";
import { openDb } from "../src/server/db";
import { logger } from "../src/server/logger";
import { recordJobRun } from "../src/server/jobs/run-state";
import { getDatabaseIntegrity } from "./database-integrity";

if (fs.existsSync(".env")) process.loadEnvFile(".env");

export interface BackupOptions {
  sourceDbPath?: string;
  backupDir?: string;
  maxKeep?: number;
}

export function performBackup(options: BackupOptions = {}): {
  backupFile: string;
  sizeBytes: number;
  integrity: string;
} {
  const sourceDbPath = options.sourceDbPath ?? process.env.DB_PATH ?? path.resolve(process.cwd(), "var/ohtms.db");
  const backupDir = options.backupDir ?? path.resolve(process.cwd(), "backups");
  const maxKeep = options.maxKeep ?? 7;

  if (!fs.existsSync(sourceDbPath)) {
    throw new Error(`Source database does not exist at: ${sourceDbPath}`);
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = path.join(backupDir, `ohtms_backup_${timestamp}.db`);

  const db = openDb(sourceDbPath);

  try {
    const escapedDest = backupFile.replace(/'/g, "''");
    db.prepare(`VACUUM INTO '${escapedDest}'`).run();
  } finally {
    db.close();
  }

  // Verify backup file integrity before rotating old backups.
  const backupDb = openDb(backupFile, true);
  let integrity: string;
  try {
    integrity = getDatabaseIntegrity(backupDb);
    if (integrity !== "ok") {
      throw new Error(`Backup failed integrity check: ${integrity}`);
    }
  } finally {
    backupDb.close();
  }

  const stats = fs.statSync(backupFile);
  const statusDb = openDb(sourceDbPath);
  try {
    recordJobRun("backup", Date.now(), undefined, statusDb);
  } finally {
    statusDb.close();
  }

  // Rotate old backups only after the new backup passes integrity validation.
  try {
    const files = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith("ohtms_backup_") && f.endsWith(".db"))
      .map((f) => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time); // newest first

    if (files.length > maxKeep) {
      const toRemove = files.slice(maxKeep);
      for (const item of toRemove) {
        fs.unlinkSync(item.path);
      }
    }
  } catch (err) {
    logger.warn("Failed to rotate old backups", { err });
  }

  return {
    backupFile,
    sizeBytes: stats.size,
    integrity,
  };
}

// Allow direct CLI execution: tsx scripts/backup-db.ts
if (require.main === module || (typeof process !== "undefined" && process.argv[1]?.includes("backup-db"))) {
  try {
    const res = performBackup();
    console.log(`Backup completed successfully: ${res.backupFile} (${res.sizeBytes} bytes, integrity: ${res.integrity})`);
  } catch (err) {
    console.error("Backup failed:", err);
    process.exit(1);
  }
}

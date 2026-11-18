/**
 * [BE-14] OWNER: backend · Restore + integrity check.
 */
import fs from "node:fs";
import path from "node:path";
import { openDb } from "../src/server/db";
import { logger } from "../src/server/logger";
import { getDatabaseIntegrity } from "./database-integrity";

if (fs.existsSync(".env")) process.loadEnvFile(".env");

export interface RestoreOptions {
  backupFile?: string;
  targetDbPath?: string;
  createPreRestoreBackup?: boolean;
}

export function performRestore(options: RestoreOptions = {}): {
  restoredFrom: string;
  targetDb: string;
  preRestoreBackup: string | null;
  integrity: string;
} {
  const targetDb = options.targetDbPath ?? process.env.DB_PATH ?? path.resolve(process.cwd(), "var/ohtms.db");
  const backupDir = path.resolve(process.cwd(), "backups");

  let backupFile = options.backupFile;
  if (!backupFile) {
    if (!fs.existsSync(backupDir)) {
      throw new Error(`No backups directory found at: ${backupDir}`);
    }
    const candidates = fs
      .readdirSync(backupDir)
      .filter((f) => f.startsWith("ohtms_backup_") && f.endsWith(".db"))
      .map((f) => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    const newest = candidates[0];
    if (!newest) throw new Error("No backup files found in backups directory");
    backupFile = newest.path;
  }

  if (!fs.existsSync(backupFile)) {
    throw new Error(`Backup file does not exist: ${backupFile}`);
  }

  // 1. Verify backup file integrity before touching target DB
  const backupDb = openDb(backupFile, true);
  let integrity: string;
  try {
    integrity = getDatabaseIntegrity(backupDb);
    if (integrity !== "ok") {
      throw new Error(`Backup file is corrupted (integrity check: ${integrity})`);
    }
  } finally {
    backupDb.close();
  }

  // 2. Create pre-restore safety copy of existing target database
  let preRestoreBackup: string | null = null;
  if (options.createPreRestoreBackup !== false && fs.existsSync(targetDb)) {
    const preRestoreDir = path.dirname(targetDb);
    preRestoreBackup = path.join(preRestoreDir, `ohtms_pre_restore_${Date.now()}.bak`);
    fs.copyFileSync(targetDb, preRestoreBackup);
  }

  // 3. Clean any existing WAL and SHM files
  const walFile = `${targetDb}-wal`;
  const shmFile = `${targetDb}-shm`;
  if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
  if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);

  // 4. Restore: copy backup file to target location
  const targetDir = path.dirname(targetDb);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.copyFileSync(backupFile, targetDb);

  // 5. Final validation of restored database
  const restoredDb = openDb(targetDb);
  try {
    const finalCheck = getDatabaseIntegrity(restoredDb);
    if (finalCheck !== "ok") {
      throw new Error(`Restored database failed integrity check: ${finalCheck}`);
    }
  } finally {
    restoredDb.close();
  }

  logger.info("Database restore completed successfully", {
    restoredFrom: backupFile,
    targetDb,
    preRestoreBackup,
  });

  return {
    restoredFrom: backupFile,
    targetDb,
    preRestoreBackup,
    integrity,
  };
}

// Allow CLI execution: tsx scripts/restore-db.ts [backupFile]
if (require.main === module || (typeof process !== "undefined" && process.argv[1]?.includes("restore-db"))) {
  const customBackup = process.argv[2];
  try {
    const res = performRestore({ backupFile: customBackup });
    console.log(`Database restored successfully from: ${res.restoredFrom}`);
  } catch (err) {
    console.error("Restore failed:", err);
    process.exit(1);
  }
}

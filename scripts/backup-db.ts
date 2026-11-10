/**
 * [BE-14] OWNER: backend · Online SQLite backup to ./backups with rotation.
 */
import fs from "node:fs";
import path from "node:path";
import { openDb } from "../src/server/db";
import { logger } from "../src/server/logger";

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
    // 1. Checkpoint WAL to flush all transactions to main database
    try {
      db.prepare("PRAGMA wal_checkpoint(TRUNCATE)").run();
    } catch {
      // Ignore if not in WAL mode
    }

    // 2. Perform online vacuum into destination file
    const escapedDest = backupFile.replace(/'/g, "''");
    try {
      db.prepare(`VACUUM INTO '${escapedDest}'`).run();
    } catch {
      // Fallback: Copy file
      fs.copyFileSync(sourceDbPath, backupFile);
    }
  } finally {
    db.close();
  }

  // 3. Verify backup file integrity
  const backupDb = openDb(backupFile, true);
  let integrity = "ok";
  try {
    const result = backupDb.prepare("PRAGMA integrity_check").get() as any;
    integrity = result?.integrity_check ?? Object.values(result ?? {})[0] ?? "unknown";
    if (integrity !== "ok") {
      throw new Error(`Backup failed integrity check: ${integrity}`);
    }
  } finally {
    backupDb.close();
  }

  const stats = fs.statSync(backupFile);

  // 4. Rotate old backups
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

// [BE-14] OWNER: backend
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

let testDbPath: string;
let backupDir: string;
let dbInstance: any;

describe("BE-14: Database Backup and Restore", () => {
  let performBackup: typeof import("../scripts/backup-db").performBackup;
  let performRestore: typeof import("../scripts/restore-db").performRestore;

  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-backups-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    backupDir = path.join(os.tmpdir(), `ohtms-backups-${Date.now()}`);
    process.env.DB_PATH = testDbPath;

    const { openDb } = await import("@/server/db");
    const { runMigrations } = await import("@/server/migrations/runner");
    dbInstance = openDb(testDbPath);
    (globalThis as any).__ohtmsDb = dbInstance;
    runMigrations(dbInstance);

    // Seed test data
    dbInstance.prepare("INSERT INTO users (id, email, name, password_hash, role, disabled, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)")
      .run(1, "backup_admin@test.local", "Backup Admin", "hash123", "admin", Date.now());

    const backupMod = await import("../scripts/backup-db");
    const restoreMod = await import("../scripts/restore-db");
    performBackup = backupMod.performBackup;
    performRestore = restoreMod.performRestore;
  });

  afterAll(() => {
    if (dbInstance) {
      dbInstance.close();
    }
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
      if (fs.existsSync(`${testDbPath}-wal`)) fs.unlinkSync(`${testDbPath}-wal`);
      if (fs.existsSync(`${testDbPath}-shm`)) fs.unlinkSync(`${testDbPath}-shm`);
      if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
    } catch {}
  });

  it("performs online backup with integrity verification and rotation", () => {
    const res = performBackup({
      sourceDbPath: testDbPath,
      backupDir,
      maxKeep: 3,
    });

    expect(fs.existsSync(res.backupFile)).toBe(true);
    expect(res.sizeBytes).toBeGreaterThan(0);
    expect(res.integrity).toBe("ok");

    // Perform additional backups to test rotation limit (maxKeep = 3)
    performBackup({ sourceDbPath: testDbPath, backupDir, maxKeep: 3 });
    performBackup({ sourceDbPath: testDbPath, backupDir, maxKeep: 3 });
    performBackup({ sourceDbPath: testDbPath, backupDir, maxKeep: 3 });

    const remainingBackups = fs.readdirSync(backupDir).filter((f) => f.startsWith("ohtms_backup_"));
    expect(remainingBackups.length).toBeLessThanOrEqual(3);
  });

  it("restores database from backup with pre-restore safety copy", async () => {
    // 1. Take a clean backup
    const backupRes = performBackup({
      sourceDbPath: testDbPath,
      backupDir,
    });

    // 2. Mutate the main database (simulate user modification)
    dbInstance.prepare("INSERT INTO users (id, email, name, password_hash, role, disabled, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)")
      .run(99, "extra_user@test.local", "Extra User", "hash", "viewer", Date.now());
    expect(dbInstance.prepare("SELECT * FROM users WHERE id = 99").get()).toBeDefined();

    // Close db before file replacement
    dbInstance.close();

    // 3. Restore
    const restoreRes = performRestore({
      backupFile: backupRes.backupFile,
      targetDbPath: testDbPath,
      createPreRestoreBackup: true,
    });

    expect(restoreRes.integrity).toBe("ok");
    expect(restoreRes.preRestoreBackup).not.toBeNull();
    expect(fs.existsSync(restoreRes.preRestoreBackup!)).toBe(true);

    // 4. Reopen and verify restored state
    const { openDb } = await import("@/server/db");
    dbInstance = openDb(testDbPath);
    (globalThis as any).__ohtmsDb = dbInstance;

    // User 99 should not exist in the restored database
    const user99 = dbInstance.prepare("SELECT * FROM users WHERE id = 99").get();
    expect(user99).toBeUndefined();

    // Original user 1 should exist
    const user1 = dbInstance.prepare("SELECT * FROM users WHERE id = 1").get();
    expect(user1).toBeDefined();

    // Clean up pre-restore backup
    if (restoreRes.preRestoreBackup && fs.existsSync(restoreRes.preRestoreBackup)) {
      fs.unlinkSync(restoreRes.preRestoreBackup);
    }
  });

  it("rejects restoring corrupted backup files", () => {
    const corruptFile = path.join(backupDir, "corrupted_backup.db");
    fs.writeFileSync(corruptFile, "THIS IS NOT A VALID SQLITE DATABASE FILE");

    expect(() => {
      performRestore({
        backupFile: corruptFile,
        targetDbPath: testDbPath,
      });
    }).toThrow();

    if (fs.existsSync(corruptFile)) fs.unlinkSync(corruptFile);
  });
});

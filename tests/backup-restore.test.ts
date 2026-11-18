// [BE-14] OWNER: backend
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q, q1 } from "@/server/db";
import { performBackup } from "../scripts/backup-db";
import { performRestore } from "../scripts/restore-db";

describe("BE-14: Database Backup and Restore", () => {
  let testCtx: TestSchemaContext;
  let backupDir: string;

  beforeAll(async () => {
    testCtx = await createTestSchema();
    backupDir = path.join(os.tmpdir(), `ohtms-backups-${Date.now()}`);

    // Seed test data
    await q(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('backup_admin@test.local', 'Backup Admin', 'hash123', 'admin', FALSE, $1)",
      [Date.now()]
    );
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
    try {
      if (fs.existsSync(backupDir)) fs.rmSync(backupDir, { recursive: true, force: true });
    } catch {}
  });

  it("performs online backup with integrity verification and rotation", async () => {
    const res = await performBackup({
      backupDir,
      maxKeep: 3,
    });

    expect(fs.existsSync(res.backupFile)).toBe(true);
    expect(res.sizeBytes).toBeGreaterThan(0);
    expect(res.integrity).toBe("ok");

    // Perform additional backups to test rotation limit (maxKeep = 3)
    await performBackup({ backupDir, maxKeep: 3 });
    await performBackup({ backupDir, maxKeep: 3 });
    await performBackup({ backupDir, maxKeep: 3 });

    const files = fs.readdirSync(backupDir).filter((f) => f.startsWith("ohtms_backup_"));
    expect(files.length).toBeLessThanOrEqual(3);
  });

  it("restores database cleanly from backup dump", async () => {
    // 1. Take a backup with our admin user
    const backupRes = await performBackup({ backupDir, maxKeep: 3 });

    // 2. Insert a temporary user that should disappear after restore
    await q(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('temp@test.local', 'Temp User', 'hash', 'viewer', FALSE, $1)",
      [Date.now()]
    );
    const countBefore = await q1<{ count: number }>("SELECT COUNT(*)::int as count FROM users");
    expect(Number(countBefore?.count)).toBeGreaterThanOrEqual(2);

    // 3. Restore from the previous backup
    const restoreRes = await performRestore(backupRes.backupFile);
    expect(restoreRes.recordsRestored).toBeGreaterThan(0);

    // 4. Verify original admin exists and temp user is gone
    const adminUser = await q1<{ email: string }>("SELECT email FROM users WHERE email = 'backup_admin@test.local'");
    expect(adminUser?.email).toBe("backup_admin@test.local");

    const tempUser = await q1<{ email: string }>("SELECT email FROM users WHERE email = 'temp@test.local'");
    expect(tempUser).toBeNull();
  });
});

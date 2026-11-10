import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { openDb } from "@/server/db";
import {
  getAppliedMigrations,
  getPendingMigrations,
  initMigrationTable,
  runMigrations,
} from "@/server/migrations/runner";

const TEST_DB = path.resolve(process.cwd(), "var/test_migrations.db");

describe("BE-01: Database Migration System", () => {
  beforeEach(() => {
    for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
      fs.rmSync(f, { force: true });
    }
  });

  afterEach(() => {
    for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
      fs.rmSync(f, { force: true });
    }
  });

  it("initializes a fresh database and applies all migrations sequentially", () => {
    const db = openDb(TEST_DB);
    const applied = getAppliedMigrations(db);

    expect(applied).toContain("001_init.sql");
    expect(applied).toContain("002_notifications.sql");
    expect(applied).toContain("003_zones_templates.sql");
    expect(applied).toContain("004_sessions.sql");

    // All core tables should exist
    const tables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as { name: string }[]
    ).map((t) => t.name);

    expect(tables).toContain("_migrations");
    expect(tables).toContain("tanks");
    expect(tables).toContain("devices");
    expect(tables).toContain("readings");
    expect(tables).toContain("alerts");
    expect(tables).toContain("users");
    expect(tables).toContain("audit_log");
    expect(tables).toContain("alert_recipients");
    expect(tables).toContain("notification_prefs");
    expect(tables).toContain("zones");
    expect(tables).toContain("threshold_templates");
    expect(tables).toContain("sessions");
    expect(tables).toContain("password_resets");

    db.close();
  });

  it("prevents duplicate execution of already applied migrations", () => {
    const db = openDb(TEST_DB);
    const pendingBefore = getPendingMigrations(db);
    expect(pendingBefore).toHaveLength(0);

    // Re-running migrations should be a no-op
    const appliedAgain = runMigrations(db);
    expect(appliedAgain).toHaveLength(0);

    db.close();
  });

  it("supports existing database upgrade (detects existing tables without _migrations)", () => {
    // Simulate legacy DB created with schema.sql where _migrations didn't exist
    const db = openDb(TEST_DB);
    // Drop _migrations table to simulate legacy DB
    db.exec("DROP TABLE _migrations");

    // initMigrationTable should detect existing 'tanks' table and mark 001_init.sql as applied
    initMigrationTable(db);
    const applied = getAppliedMigrations(db);
    expect(applied).toContain("001_init.sql");

    db.close();
  });

  it("rolls back on migration failure", () => {
    const db = openDb(TEST_DB);
    const tempDir = path.resolve(process.cwd(), "var/temp_migrations");
    fs.mkdirSync(tempDir, { recursive: true });

    // Valid migration followed by an invalid one
    fs.writeFileSync(
      path.join(tempDir, "099_good.sql"),
      "CREATE TABLE good_table (id INT);"
    );
    fs.writeFileSync(
      path.join(tempDir, "100_bad.sql"),
      "SYNTAX ERROR INVALID SQL;"
    );

    expect(() => runMigrations(db, tempDir)).toThrow(/Migration 100_bad.sql failed/);

    // 099_good.sql was committed in its own transaction
    const applied = getAppliedMigrations(db);
    expect(applied).toContain("099_good.sql");
    expect(applied).not.toContain("100_bad.sql");

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
    db.close();
  });
});

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { openDb } from "@/server/db";
import { SqliteCompat } from "@/server/sqlite-compat";
import {
  getAppliedMigrations,
  getPendingMigrations,
  runMigrations,
} from "@/server/migrations/runner";

const TEST_DB = path.resolve(process.cwd(), "var/test_migrations.db");
const TEMP_MIGRATIONS_DIR = path.resolve(process.cwd(), "var/temp_migrations");

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
    fs.rmSync(TEMP_MIGRATIONS_DIR, { recursive: true, force: true });
  });

  it("initializes a fresh database and applies all migrations sequentially", () => {
    const db = openDb(TEST_DB);
    const applied = getAppliedMigrations(db);

    expect(applied).toContain("001_init.sql");
    expect(applied).toContain("002_notifications.sql");
    expect(applied).toContain("003_zones_templates.sql");
    expect(applied).toContain("004_sessions.sql");
    expect(applied).toContain("005_jobs_auth_push.sql");
    expect(applied).toContain("006_device_soft_delete.sql");
    expect(applied).toContain("007_notification_attempt_limit.sql");

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
    expect(tables).toContain("job_runs");
    expect(tables).toContain("reading_rollups");
    expect(tables).toContain("notification_dispatches");
    expect(tables).toContain("push_subscriptions");
    expect(() => db.prepare("SELECT attempted_at FROM notifications LIMIT 0").all()).not.toThrow();
    expect(() => db.prepare("SELECT totp_enabled FROM users LIMIT 0").all()).not.toThrow();
    expect(() => db.prepare("SELECT deleted_at FROM devices LIMIT 0").all()).not.toThrow();
    expect(() => db.prepare("SELECT attempt_count FROM notifications LIMIT 0").all()).not.toThrow();

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
    const db = new SqliteCompat(TEST_DB);
    try {
      db.exec(fs.readFileSync(path.resolve(process.cwd(), "src/server/schema.sql"), "utf8"));
      db.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)").run("legacy-device", Date.now());
      db.prepare(`
        INSERT INTO tanks (device_id, label, height_cm, radius_cm, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run("legacy-device", "Legacy tank", 300, 100, Date.now(), Date.now());
      db.prepare("INSERT INTO readings (device_id, t, distance_cm) VALUES (?, ?, ?)").run("legacy-device", 1234, 56);

      expect(runMigrations(db)).toEqual([
        "002_notifications.sql",
        "003_zones_templates.sql",
        "004_sessions.sql",
        "005_jobs_auth_push.sql",
        "006_device_soft_delete.sql",
        "007_notification_attempt_limit.sql",
      ]);
      expect(getAppliedMigrations(db)).toContain("001_init.sql");
      expect(db.prepare("SELECT label FROM tanks WHERE device_id = ?").get("legacy-device"))
        .toEqual({ label: "Legacy tank" });
      expect(db.prepare("SELECT t, distance_cm FROM readings WHERE device_id = ?").get("legacy-device"))
        .toEqual({ t: 1234, distance_cm: 56 });
      expect(db.prepare("SELECT totp_enabled FROM users LIMIT 0").all()).toEqual([]);
      expect(getPendingMigrations(db)).toEqual([]);
    } finally {
      db.close();
    }
  });

  it("rolls back on migration failure", () => {
    const db = openDb(TEST_DB);
    fs.mkdirSync(TEMP_MIGRATIONS_DIR, { recursive: true });

    // Valid migration followed by an invalid one
    fs.writeFileSync(
      path.join(TEMP_MIGRATIONS_DIR, "099_good.sql"),
      "CREATE TABLE good_table (id INT);"
    );
    fs.writeFileSync(
      path.join(TEMP_MIGRATIONS_DIR, "100_bad.sql"),
      "SYNTAX ERROR INVALID SQL;"
    );

    expect(() => runMigrations(db, TEMP_MIGRATIONS_DIR)).toThrow(/Migration 100_bad.sql failed/);

    // 099_good.sql was committed in its own transaction
    const applied = getAppliedMigrations(db);
    expect(applied).toContain("099_good.sql");
    expect(applied).not.toContain("100_bad.sql");

    // Cleanup
    db.close();
  });
});

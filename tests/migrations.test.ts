import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Pool } from "pg";
import {
  getAppliedMigrations,
  getMigrationFiles,
  runMigrations,
} from "@/server/migrations/runner";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("BE-01: Database Migration System (PostgreSQL)", () => {
  const baseConn =
    process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://postgres:password@localhost:5432/ohtms_test";

  let testSchema: string;
  let schemaConn: string;

  beforeAll(async () => {
    testSchema = `test_mig_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const pool = new Pool({ connectionString: baseConn, max: 1 });
    await pool.query(`CREATE SCHEMA ${testSchema}`);
    await pool.end();
    schemaConn = `${baseConn}${baseConn.includes("?") ? "&" : "?"}options=-csearch_path%3D${testSchema},public`;
  });

  afterAll(async () => {
    const pool = new Pool({ connectionString: baseConn, max: 1 });
    await pool.query(`DROP SCHEMA IF EXISTS ${testSchema} CASCADE`);
    await pool.end();
  });

  it("applies all migrations in order and records in schema_migrations", async () => {
    const applied = await runMigrations(schemaConn);
    expect(applied).toEqual([
      "001_init.sql",
      "002_alerts_notify.sql",
      "003_ingest_jobs.sql",
      "004_dimensions.sql",
      "005_auth.sql",
      "006_manual_entry_tank_owners.sql",
      "007_manual_reading_user.sql",
    ]);

    const pool = new Pool({ connectionString: schemaConn, max: 1 });
    const client = await pool.connect();
    try {
      const records = await getAppliedMigrations(client);
      expect(records).toEqual(applied);

      // Verify core tables exist in schema
      const tablesRes = await client.query<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = $1",
        [testSchema]
      );
      const tables = tablesRes.rows.map((r) => r.table_name);
      expect(tables).toContain("schema_migrations");
      expect(tables).toContain("tanks");
      expect(tables).toContain("devices");
      expect(tables).toContain("readings");
      expect(tables).toContain("alerts");
      expect(tables).toContain("alert_events");
      expect(tables).toContain("alert_recipients");
      expect(tables).toContain("notification_prefs");
      expect(tables).toContain("notifications");
      expect(tables).toContain("users");
      expect(tables).toContain("audit_log");
      expect(tables).toContain("ingest_state");
      expect(tables).toContain("ingest_rejects");
      expect(tables).toContain("job_runs");
      expect(tables).toContain("rate_limits");
      expect(tables).toContain("tank_dimensions");
      expect(tables).toContain("password_resets");
    } finally {
      client.release();
      await pool.end();
    }
  });

  it("is idempotent: subsequent run applies 0 migrations", async () => {
    const secondRun = await runMigrations(schemaConn);
    expect(secondRun).toEqual([]);
  });

  it("rolls back transactions atomically when a migration fails", async () => {
    const tempDir = path.join(os.tmpdir(), `temp_mig_${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    fs.writeFileSync(path.join(tempDir, "001_valid.sql"), "CREATE TABLE temp_good (id INT);");
    fs.writeFileSync(path.join(tempDir, "002_invalid.sql"), "SYNTAX ERROR INVALID SQL;");

    const errSchema = `test_err_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const pool = new Pool({ connectionString: baseConn, max: 1 });
    await pool.query(`CREATE SCHEMA ${errSchema}`);
    await pool.end();
    const errConn = `${baseConn}${baseConn.includes("?") ? "&" : "?"}options=-csearch_path%3D${errSchema},public`;

    await expect(runMigrations(errConn, tempDir)).rejects.toThrow(/Migration 002_invalid\.sql failed/);

    const checkPool = new Pool({ connectionString: errConn, max: 1 });
    const res = await checkPool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'temp_good'",
      [errSchema]
    );
    expect(res.rows.length).toBe(0); // whole batch rolled back atomically

    await checkPool.query(`DROP SCHEMA IF EXISTS ${errSchema} CASCADE`);
    await checkPool.end();
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

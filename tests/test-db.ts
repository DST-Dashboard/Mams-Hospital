import { Pool } from "pg";
import { runMigrations } from "@/server/migrations/runner";
import { env } from "@/server/env";
import { closePool } from "@/server/db";

export interface TestSchemaContext {
  schemaName: string;
  connectionString: string;
  cleanup: () => Promise<void>;
}

export async function createTestSchema(): Promise<TestSchemaContext> {
  const baseConn =
    process.env.TEST_DATABASE_URL ??
    process.env.DATABASE_URL ??
    "postgresql://postgres:password@localhost:5432/ohtms_test";

  const schemaName = `test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const pool = new Pool({ connectionString: baseConn, max: 1 });
  const client = await pool.connect();

  try {
    // 1. Create unique schema
    await client.query(`CREATE SCHEMA ${schemaName}`);
    // 2. Set search_path so unqualified tables belong to this schema
    await client.query(`SET search_path TO ${schemaName}, public`);
  } finally {
    client.release();
    await pool.end();
  }

  // Connection string with search_path parameter
  const schemaConn = `${baseConn}${baseConn.includes("?") ? "&" : "?"}options=-csearch_path%3D${schemaName},public`;

  // Update process.env so server modules use this schema
  process.env.DATABASE_URL = schemaConn;
  await closePool();

  // Run migrations in this schema
  await runMigrations(schemaConn);

  return {
    schemaName,
    connectionString: schemaConn,
    cleanup: async () => {
      await closePool();
      const dropPool = new Pool({ connectionString: baseConn, max: 1 });
      try {
        await dropPool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
      } catch {}
      await dropPool.end();
    },
  };
}

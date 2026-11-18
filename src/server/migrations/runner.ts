import fs from "node:fs";
import path from "node:path";
import { Pool, PoolClient } from "pg";
import { env } from "../env";

export const MIGRATIONS_DIR = path.resolve(process.cwd(), "src/server/migrations");
const MIGRATION_LOCK_ID = 849204921;

export async function getMigrationFiles(dir = MIGRATIONS_DIR): Promise<string[]> {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export async function initMigrationTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at BIGINT NOT NULL
    );
  `);
}

export async function getAppliedMigrations(client: PoolClient): Promise<string[]> {
  await initMigrationTable(client);
  const res = await client.query<{ id: string }>(
    "SELECT id FROM schema_migrations ORDER BY id ASC"
  );
  return res.rows.map((r) => r.id);
}

/**
 * Runs all pending migrations sequentially inside a transactional advisory lock.
 * Uses DATABASE_URL_UNPOOLED if set, falling back to DATABASE_URL.
 */
export async function runMigrations(
  connectionString?: string,
  dir = MIGRATIONS_DIR
): Promise<string[]> {
  const connStr =
    connectionString ??
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.DATABASE_URL ??
    env().DATABASE_URL;

  const pool = new Pool({
    connectionString: connStr,
    max: 1,
  });

  const client = await pool.connect();
  const applied: string[] = [];

  try {
    await client.query("BEGIN");
    // Acquire transaction-level advisory lock so concurrent deploys wait safely
    await client.query("SELECT pg_advisory_xact_lock($1)", [MIGRATION_LOCK_ID]);

    await initMigrationTable(client);

    const appliedSet = new Set(await getAppliedMigrations(client));
    const files = await getMigrationFiles(dir);
    const pending = files.filter((f) => !appliedSet.has(f));

    for (const filename of pending) {
      const filePath = path.join(dir, filename);
      const sql = fs.readFileSync(filePath, "utf8");

      try {
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (id, applied_at) VALUES ($1, $2)",
          [filename, Date.now()]
        );
        applied.push(filename);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Migration ${filename} failed: ${msg}`);
      }
    }

    await client.query("COMMIT");
    return applied;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

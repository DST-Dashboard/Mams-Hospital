import { Pool, PoolClient, QueryResultRow, types } from "pg";
import { env } from "./env";

// Ensure BIGINT (int8, oid 20) is returned as a JavaScript Number (safe up to 9e15; epoch ms is ~1.7e12)
types.setTypeParser(20, (val: string | null) => (val === null ? null : Number(val)));

interface GlobalWithPool {
  __ohtmsPool?: Pool;
}

const g = globalThis as unknown as GlobalWithPool;

export function getPool(connectionString?: string): Pool {
  if (connectionString) {
    return new Pool({
      connectionString,
      max: process.env.VERCEL ? 3 : 10,
    });
  }

  if (g.__ohtmsPool) return g.__ohtmsPool;

  const conf = env();
  const pool = new Pool({
    connectionString: conf.DATABASE_URL,
    max: process.env.VERCEL ? 3 : 10,
  });

  if (process.env.NODE_ENV !== "production") {
    g.__ohtmsPool = pool;
  }

  return pool;
}

/** Execute a query with parameters using the singleton pool */
export async function q<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client?: PoolClient
): Promise<T[]> {
  const runner = client || getPool();
  const res = await runner.query<T>(sql, params);
  return res.rows;
}

/** Execute a query returning the first row, or null */
export async function q1<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: unknown[] = [],
  client?: PoolClient
): Promise<T | null> {
  const rows = await q<T>(sql, params, client);
  return rows.length > 0 ? rows[0] : null;
}

/** Execute a block inside a transaction with automatic rollback on error */
export async function tx<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/** Close the singleton pool (used in test teardown or process exit) */
export async function closePool(): Promise<void> {
  if (g.__ohtmsPool) {
    await g.__ohtmsPool.end();
    g.__ohtmsPool = undefined;
  }
}

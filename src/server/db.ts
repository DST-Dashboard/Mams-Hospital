import fs from "node:fs";
import path from "node:path";
import { env } from "./env";
import { runMigrations } from "./migrations/runner";
import { SqliteCompat } from "./sqlite-compat";

const g = globalThis as unknown as { __ohtmsDb?: any };
export const SCHEMA_PATH = path.join(process.cwd(), "src/server/schema.sql");

function createDbInstance(file: string): any {
  try {
    const BetterSqlite = require("better-sqlite3");
    return new BetterSqlite(file);
  } catch {
    return new SqliteCompat(file);
  }
}

export function openDb(file = env().DB_PATH, skipMigrations = false): any {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = createDbInstance(file);
  try {
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.pragma("busy_timeout = 5000");
    if (!skipMigrations) {
      runMigrations(db);
    }
    return db;
  } catch (err) {
    try {
      db.close();
    } catch {}
    throw err;
  }
}

/** Singleton (survives Next dev hot-reload). Throws a helpful error if the DB hasn't been seeded. */
export function db(): any {
  if (g.__ohtmsDb) return g.__ohtmsDb;
  const file = env().DB_PATH;
  if (!fs.existsSync(file)) throw new Error(`Database not found at ${file}. Run: npm run setup`);
  return (g.__ohtmsDb = openDb(file));
}

export const tx = <T,>(fn: () => T): T => db().transaction(fn)();

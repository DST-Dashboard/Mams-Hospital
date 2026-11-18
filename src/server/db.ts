import fs from "node:fs";
import path from "node:path";
import BetterSqlite3 from "better-sqlite3";
import { env } from "./env";
import { runMigrations } from "./migrations/runner";
import { SqliteCompat, type SqliteDatabase } from "./sqlite-compat";

const g = globalThis as typeof globalThis & { __ohtmsDb?: SqliteDatabase };

function createDbInstance(file: string): SqliteDatabase {
  try {
    return new BetterSqlite3(file);
  } catch {
    return new SqliteCompat(file);
  }
}

export function openDb(file = env().DB_PATH, skipMigrations = false): SqliteDatabase {
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
export function db(): SqliteDatabase {
  if (g.__ohtmsDb) return g.__ohtmsDb;
  const file = env().DB_PATH;
  if (!fs.existsSync(file)) throw new Error(`Database not found at ${file}. Run: npm run setup`);
  return (g.__ohtmsDb = openDb(file));
}

export const tx = <T,>(fn: () => T): T => db().transaction(fn)();

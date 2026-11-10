import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

const g = globalThis as unknown as { __ohtmsDb?: Database.Database };
export const SCHEMA_PATH = path.join(process.cwd(), "src/server/schema.sql");

export function openDb(file = env().DB_PATH): Database.Database {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  return db;
}

/** Singleton (survives Next dev hot-reload). Throws a helpful error if the DB hasn't been seeded. */
export function db(): Database.Database {
  if (g.__ohtmsDb) return g.__ohtmsDb;
  const file = env().DB_PATH;
  if (!fs.existsSync(file)) throw new Error(`Database not found at ${file}. Run: npm run setup`);
  return (g.__ohtmsDb = openDb(file));
}

export const tx = <T,>(fn: () => T): T => db().transaction(fn)();

/**
 * [BE-01] OWNER: backend · Database migration runner.
 * Applies numbered .sql files in order, records them in _migrations,
 * supports upgrading existing databases, fresh databases, and transactional execution.
 */
import type Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export const MIGRATIONS_DIR = path.resolve(process.cwd(), "src/server/migrations");

export function initMigrationTable(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `);

  // Existing database upgrade support:
  // If the database has tables like 'tanks' or 'devices' from schema.sql / 001_init.sql,
  // but _migrations was just created, mark 001_init.sql as already applied.
  const checkTable = db.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='tanks'"
  ).get();
  const alreadyMarked = db.prepare(
    "SELECT id FROM _migrations WHERE id = '001_init.sql'"
  ).get();

  if (checkTable && !alreadyMarked) {
    db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)").run(
      "001_init.sql",
      Date.now()
    );
  }
}

export function getAppliedMigrations(db: Database.Database): string[] {
  initMigrationTable(db);
  const rows = db.prepare("SELECT id FROM _migrations ORDER BY id ASC").all() as { id: string }[];
  return rows.map((r) => r.id);
}

export function getMigrationFiles(dir = MIGRATIONS_DIR): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export function getPendingMigrations(db: Database.Database, dir = MIGRATIONS_DIR): string[] {
  const applied = new Set(getAppliedMigrations(db));
  const files = getMigrationFiles(dir);
  return files.filter((f) => !applied.has(f));
}

/**
 * Runs all pending migrations sequentially inside transactions.
 * Returns the list of migration IDs applied in this run.
 */
export function runMigrations(db: Database.Database, dir = MIGRATIONS_DIR): string[] {
  initMigrationTable(db);
  const pending = getPendingMigrations(db, dir);
  const applied: string[] = [];

  for (const filename of pending) {
    const filePath = path.join(dir, filename);
    const sql = fs.readFileSync(filePath, "utf8");

    try {
      db.transaction(() => {
        db.exec(sql);
        db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)").run(
          filename,
          Date.now()
        );
      })();
      applied.push(filename);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Migration ${filename} failed: ${msg}`);
    }
  }

  return applied;
}

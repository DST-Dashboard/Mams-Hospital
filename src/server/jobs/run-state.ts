import { db } from "../db";
import type { SqliteDatabase } from "../sqlite-compat";

export function recordJobRun(name: string, at: number, error?: unknown, database?: SqliteDatabase): void {
  const message = error instanceof Error ? error.message : error == null ? null : String(error);
  (database ?? db()).prepare(`
    INSERT INTO job_runs (name, last_run_at, ok, error)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET last_run_at=excluded.last_run_at, ok=excluded.ok, error=excluded.error
  `).run(name, at, error == null ? 1 : 0, message?.slice(0, 1000) ?? null);
}

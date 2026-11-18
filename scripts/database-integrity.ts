import type { SqliteDatabase } from "../src/server/sqlite-compat";

export function getDatabaseIntegrity(database: SqliteDatabase): string {
  const result: unknown = database.prepare("PRAGMA integrity_check").get();
  if (typeof result === "object" && result !== null) {
    const integrity = Object.values(result)[0];
    if (typeof integrity === "string") return integrity;
  }
  throw new Error("SQLite integrity check returned an unexpected result");
}

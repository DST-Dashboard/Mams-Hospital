import { DatabaseSync } from "node:sqlite";

type SqliteBinding = string | number | bigint | Uint8Array | null;
type SqliteNamedBindings = Record<string, SqliteBinding>;

export interface SqliteStatement {
  all(...params: unknown[]): unknown[];
  get(...params: unknown[]): unknown;
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
}

export interface SqliteDatabase {
  pragma(pragmaStr: string): unknown;
  exec(sql: string): void;
  close(): void;
  prepare(sql: string): SqliteStatement;
  transaction<T>(fn: () => T): () => T;
}

function normalizeBinding(value: unknown): SqliteBinding {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return Number(value);
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return value;
  if (value instanceof Uint8Array) return value;
  throw new TypeError("Unsupported SQLite binding value");
}

function isNamedBindings(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Uint8Array);
}

function normalizeParams(params: unknown[]): SqliteBinding[] | SqliteNamedBindings {
  if (params.length === 1 && Array.isArray(params[0])) {
    return params[0].map(normalizeBinding);
  }
  if (params.length === 1 && isNamedBindings(params[0])) {
    return Object.fromEntries(Object.entries(params[0]).map(([key, value]) => [key, normalizeBinding(value)]));
  }
  return params.map(normalizeBinding);
}

export class SqliteCompat implements SqliteDatabase {
  private db: DatabaseSync;

  constructor(filePath: string) {
    this.db = new DatabaseSync(filePath);
  }

  pragma(pragmaStr: string): unknown {
    const trimmed = pragmaStr.trim();
    if (trimmed.includes("=")) {
      this.db.exec(`PRAGMA ${trimmed};`);
      return;
    }
    const rows = this.db.prepare(`PRAGMA ${trimmed}`).all();
    if (rows.length === 1) {
      const firstRow = rows[0] as Record<string, unknown>;
      const keys = Object.keys(firstRow);
      if (keys.length === 1) return firstRow[keys[0]!];
    }
    return rows;
  }

  exec(sql: string): this {
    this.db.exec(sql);
    return this;
  }

  close(): void {
    try {
      this.db.close();
    } catch {
      // Ignore if already closed
    }
  }

  transaction<T>(fn: () => T): () => T {
    return (): T => {
      this.db.exec("BEGIN");
      try {
        const result = fn();
        this.db.exec("COMMIT");
        return result;
      } catch (err) {
        this.db.exec("ROLLBACK");
        throw err;
      }
    };
  }

  prepare(sql: string): SqliteStatement {
    const stmt = this.db.prepare(sql);

    return {
      all: (...params: unknown[]) => {
        const arg = normalizeParams(params);
        return Array.isArray(arg) ? stmt.all(...arg) : stmt.all(arg);
      },
      get: (...params: unknown[]) => {
        const arg = normalizeParams(params);
        return Array.isArray(arg) ? stmt.get(...arg) : stmt.get(arg);
      },
      run: (...params: unknown[]) => {
        const arg = normalizeParams(params);
        const res = Array.isArray(arg) ? stmt.run(...arg) : stmt.run(arg);
        return {
          changes: Number(res.changes),
          lastInsertRowid: typeof res.lastInsertRowid === "bigint" ? Number(res.lastInsertRowid) : res.lastInsertRowid,
        };
      },
    };
  }
}

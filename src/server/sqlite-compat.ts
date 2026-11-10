import { DatabaseSync } from "node:sqlite";

export class SqliteCompat {
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
    this.db.close();
  }

  transaction<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => ReturnType<T> {
    return (...args: Parameters<T>): ReturnType<T> => {
      this.db.exec("BEGIN");
      try {
        const result = fn(...args);
        this.db.exec("COMMIT");
        return result;
      } catch (err) {
        this.db.exec("ROLLBACK");
        throw err;
      }
    };
  }

  prepare(sql: string) {
    const stmt = this.db.prepare(sql);
    return {
      all: (...params: any[]) => {
        const arg = params.length === 1 && typeof params[0] === "object" && params[0] !== null ? params[0] : params;
        return Array.isArray(arg) ? stmt.all(...arg) : stmt.all(arg);
      },
      get: (...params: any[]) => {
        const arg = params.length === 1 && typeof params[0] === "object" && params[0] !== null ? params[0] : params;
        return Array.isArray(arg) ? stmt.get(...arg) : stmt.get(arg);
      },
      run: (...params: any[]) => {
        const arg = params.length === 1 && typeof params[0] === "object" && params[0] !== null ? params[0] : params;
        const res = Array.isArray(arg) ? stmt.run(...arg) : stmt.run(arg);
        return {
          changes: Number(res.changes),
          lastInsertRowid: typeof res.lastInsertRowid === "bigint" ? Number(res.lastInsertRowid) : res.lastInsertRowid,
        };
      },
    };
  }
}

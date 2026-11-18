import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "ohtms_session" && cookieValue ? { value: cookieValue } : undefined }),
  headers: async () => new Headers(),
}));

let testDbPath: string;
let dbInstance: ReturnType<typeof import("@/server/db").openDb>;
let createSession: typeof import("@/server/repos/sessions").createSession;
let revokeSession: typeof import("@/server/repos/sessions").revokeSession;
let sign: typeof import("@/server/auth/session").sign;
let currentSession: typeof import("@/server/auth/guard").currentSession;
const secret = "session-auth-test-secret-at-least-32-characters";

describe("persisted cookie sessions", () => {
  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-session-auth-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = secret;
    const database = await import("@/server/db");
    dbInstance = database.openDb(testDbPath);
    (globalThis as typeof globalThis & { __ohtmsDb?: ReturnType<typeof database.openDb> }).__ohtmsDb = dbInstance;
    dbInstance.prepare("INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (1, ?, ?, ?, 'viewer', ?)")
      .run("session-user@example.test", "Session User", "unused-test-hash", Date.now());
    const sessions = await import("@/server/repos/sessions");
    createSession = sessions.createSession;
    revokeSession = sessions.revokeSession;
    sign = (await import("@/server/auth/session")).sign;
    currentSession = (await import("@/server/auth/guard")).currentSession;
  });

  afterAll(() => {
    dbInstance.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it("uses the current database role and rejects disabled or revoked sessions", async () => {
    const sessionId = createSession(1);
    cookieValue = await sign({ uid: 1, role: "admin", name: "Stale JWT role", sessionId }, secret, 1);
    expect(await currentSession()).toMatchObject({ uid: 1, role: "viewer", name: "Session User" });

    revokeSession(sessionId);
    expect(await currentSession()).toBeNull();

    const newSessionId = createSession(1);
    cookieValue = await sign({ uid: 1, role: "viewer", name: "Session User", sessionId: newSessionId }, secret, 1);
    dbInstance.prepare("UPDATE users SET disabled = 1 WHERE id = 1").run();
    expect(await currentSession()).toBeNull();
  });

  it("rejects cookie tokens without a persisted session identifier", async () => {
    cookieValue = await sign({ uid: 1, role: "viewer", name: "Session User" }, secret, 1);
    expect(await currentSession()).toBeNull();
  });
});

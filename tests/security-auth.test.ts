import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

let testDbPath: string;
let dbInstance: ReturnType<typeof import("@/server/db").openDb>;
const secret = "security-auth-test-secret-at-least-32-characters";

describe("API keys and TOTP", () => {
  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-security-auth-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = secret;
    const database = await import("@/server/db");
    dbInstance = database.openDb(testDbPath);
    (globalThis as typeof globalThis & { __ohtmsDb?: ReturnType<typeof database.openDb> }).__ohtmsDb = dbInstance;
    dbInstance.prepare("INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (1, ?, ?, ?, 'admin', ?)")
      .run("auth-security@example.test", "Auth Security", "unused-test-hash", Date.now());
  });

  afterAll(() => {
    dbInstance.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it("stores only API-key digests, authenticates the assigned role, and revokes keys", async () => {
    const apiKeys = await import("@/server/repos/api-keys");
    const created = apiKeys.createApiKey({ userId: 1, name: "Read-only integration", role: "viewer" });
    expect(created.key).toMatch(/^mams_[A-Za-z0-9_-]{40,60}$/);
    expect(apiKeys.authenticateApiKey(created.key)).toMatchObject({ uid: 1, role: "viewer" });
    expect(dbInstance.prepare("SELECT key_hash FROM api_keys WHERE id = ?").get(created.id))
      .not.toMatchObject({ key_hash: created.key });
    expect(apiKeys.listApiKeys(1)).toHaveLength(1);
    expect(apiKeys.revokeApiKey(created.id, 1)).toBe(true);
    expect(apiKeys.authenticateApiKey(created.key)).toBeNull();
  });

  it("confirms TOTP setup, prevents counter reuse, and disables with a fresh code", async () => {
    const totp = await import("@/server/auth/totp");
    const at = 1_700_000_000_000;
    const secretValue = totp.beginTotpSetup(1);
    expect(totp.hasTotpEnabled(1)).toBe(false);
    expect(totp.confirmTotpSetup(1, totp.totpCode(secretValue, at), at)).toBe(true);
    expect(totp.hasTotpEnabled(1)).toBe(true);

    const nextCounter = at + 30_000;
    const nextCode = totp.totpCode(secretValue, nextCounter);
    expect(totp.verifyUserTotp(1, nextCode, nextCounter)).toBe(true);
    expect(totp.verifyUserTotp(1, nextCode, nextCounter)).toBe(false);
    expect(totp.disableTotp(1, totp.totpCode(secretValue, nextCounter + 30_000), nextCounter + 30_000)).toBe(true);
    expect(totp.hasTotpEnabled(1)).toBe(false);
  });
});

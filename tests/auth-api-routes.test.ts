import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import bcrypt from "bcryptjs";
import { z } from "zod";

const { postResponseTasks, sentEmails } = vi.hoisted(() => ({
  postResponseTasks: [] as Array<() => void | Promise<void>>,
  sentEmails: [] as Array<{ to: string; subject: string; text: string }>,
}));

let cookieValue: string | undefined;
vi.mock("next/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/server")>();
  return {
    ...actual,
    after: (task: () => void | Promise<void>) => { postResponseTasks.push(task); },
  };
});
vi.mock("@/server/notify/email", () => ({
  sendEmail: async (message: { to: string; subject: string; text: string }) => { sentEmails.push(message); },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => name === "ohtms_session" && cookieValue ? { value: cookieValue } : undefined,
    set: (name: string, value: string) => { if (name === "ohtms_session") cookieValue = value; },
    delete: (name: string) => { if (name === "ohtms_session") cookieValue = undefined; },
  }),
  headers: async () => new Headers(),
}));

let testDbPath: string;
let dbInstance: ReturnType<typeof import("@/server/db").openDb>;
let loginRoute: typeof import("@/app/api/auth/login/route");
let meRoute: typeof import("@/app/api/auth/me/route");
let passwordRoute: typeof import("@/app/api/auth/password/route");
let forgotRoute: typeof import("@/app/api/auth/forgot/route");
let resetRoute: typeof import("@/app/api/auth/reset/route");
let logoutRoute: typeof import("@/app/api/auth/logout/route");
const sessionSecret = "auth-api-integration-session-secret";

const request = (url: string, body: unknown) => new Request(`http://localhost${url}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("authentication API integration", () => {
  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-auth-api-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = sessionSecret;
    process.env.SMTP_URL = "smtp://mail.example.test";
    process.env.SMTP_FROM = "mams@example.test";
    process.env.APP_BASE_URL = "https://mams.example.test";
    const database = await import("@/server/db");
    dbInstance = database.openDb(testDbPath);
    (globalThis as typeof globalThis & { __ohtmsDb?: ReturnType<typeof database.openDb> }).__ohtmsDb = dbInstance;
    const passwordHash = await bcrypt.hash("InitialAdmin#2026", 10);
    dbInstance.prepare("INSERT INTO users (id, email, name, password_hash, role, disabled, created_at) VALUES (1, ?, ?, ?, 'admin', 0, ?)")
      .run("auth-api@example.test", "Auth API Admin", passwordHash, Date.now());
    loginRoute = await import("@/app/api/auth/login/route");
    meRoute = await import("@/app/api/auth/me/route");
    passwordRoute = await import("@/app/api/auth/password/route");
    forgotRoute = await import("@/app/api/auth/forgot/route");
    resetRoute = await import("@/app/api/auth/reset/route");
    logoutRoute = await import("@/app/api/auth/logout/route");
  });

  afterAll(() => {
    dbInstance.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it("logs in, changes and resets a password, then revokes the session on logout", async () => {
    const denied = await loginRoute.POST(request("/api/auth/login", { email: "auth-api@example.test", password: "wrong-password" }));
    expect(denied.status).toBe(401);

    const loggedIn = await loginRoute.POST(request("/api/auth/login", { email: "auth-api@example.test", password: "InitialAdmin#2026" }));
    expect(loggedIn.status).toBe(200);
    await expect(loggedIn.json()).resolves.toMatchObject({ id: 1, role: "admin" });
    expect(cookieValue).toBeTruthy();
    await expect(meRoute.GET().then((response) => response.json())).resolves.toMatchObject({ uid: 1, role: "admin" });

    const changed = await passwordRoute.POST(request("/api/auth/password", {
      current: "InitialAdmin#2026",
      next: "ChangedAdmin#2026",
    }));
    expect(changed.status).toBe(200);
    expect((await meRoute.GET()).status).toBe(401);

    const forgot = await forgotRoute.POST(request("/api/auth/forgot", { email: "auth-api@example.test" }));
    expect(forgot.status).toBe(200);
    await expect(forgot.json()).resolves.toEqual({
      ok: true,
      message: "If that email is registered, password reset instructions have been sent.",
    });
    expect(postResponseTasks).toHaveLength(1);
    await postResponseTasks.shift()?.();
    const resetToken = new URL(sentEmails[0]!.text.match(/https:\/\/\S+/)![0]).searchParams.get("token");
    expect(resetToken).toBeTruthy();
    const reset = await resetRoute.POST(request("/api/auth/reset", { token: resetToken, password: "ResetAdmin#2026" }));
    expect(reset.status).toBe(200);
    expect((await resetRoute.POST(request("/api/auth/reset", { token: resetToken, password: "AgainAdmin#2026" }))).status).toBe(400);

    const relogin = await loginRoute.POST(request("/api/auth/login", { email: "auth-api@example.test", password: "ResetAdmin#2026" }));
    expect(relogin.status).toBe(200);
    expect((await meRoute.GET()).status).toBe(200);
    expect((await logoutRoute.POST()).status).toBe(200);
    expect(cookieValue).toBeUndefined();
    expect((await meRoute.GET()).status).toBe(401);
  });

  it("keeps unknown-account password recovery indistinguishable", async () => {
    const known = await forgotRoute.POST(request("/api/auth/forgot", { email: "auth-api@example.test" }));
    const unknown = await forgotRoute.POST(request("/api/auth/forgot", { email: "missing@example.test" }));
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    const knownBody = await known.json();
    const unknownBody = await unknown.json();
    expect(knownBody).toEqual(unknownBody);
    expect(knownBody).not.toHaveProperty("token");
    expect(postResponseTasks).toHaveLength(1);
  });
});

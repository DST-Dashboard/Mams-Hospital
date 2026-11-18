import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q } from "@/server/db";
import { env } from "@/server/env";

const { sentEmails } = vi.hoisted(() => ({
  sentEmails: [] as Array<{ to: string; subject: string; text: string }>,
}));

let cookieValue: string | undefined;
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

import * as loginRoute from "@/app/api/auth/login/route";
import * as meRoute from "@/app/api/auth/me/route";
import * as passwordRoute from "@/app/api/auth/password/route";
import * as forgotRoute from "@/app/api/auth/forgot/route";
import * as resetRoute from "@/app/api/auth/reset/route";
import * as logoutRoute from "@/app/api/auth/logout/route";

const request = (url: string, body: unknown) => new Request(`http://localhost${url}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

describe("authentication API integration", () => {
  let testCtx: TestSchemaContext;
  let adminId: number;

  beforeAll(async () => {
    testCtx = await createTestSchema();
    process.env.SMTP_URL = "smtp://mail.example.test";
    process.env.EMAIL_FROM = "mams@example.test";
    process.env.APP_BASE_URL = "https://mams.example.test";

    const passwordHash = await bcrypt.hash("InitialAdmin#2026", 10);
    const [admin] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('auth-api@example.test', 'Auth API Admin', $1, 'admin', FALSE, $2) RETURNING id",
      [passwordHash, Date.now()]
    );
    adminId = admin.id;
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("logs in, changes and resets a password, then revokes the session on logout", async () => {
    const denied = await loginRoute.POST(request("/api/auth/login", { email: "auth-api@example.test", password: "wrong-password" }));
    expect(denied.status).toBe(401);

    const loggedIn = await loginRoute.POST(request("/api/auth/login", { email: "auth-api@example.test", password: "InitialAdmin#2026" }));
    expect(loggedIn.status).toBe(200);
    await expect(loggedIn.json()).resolves.toMatchObject({ id: adminId, role: "admin" });
    expect(cookieValue).toBeTruthy();
    await expect(meRoute.GET().then((response) => response.json())).resolves.toMatchObject({ uid: adminId, role: "admin" });

    const changed = await passwordRoute.POST(request("/api/auth/password", {
      current: "InitialAdmin#2026",
      next: "ChangedAdmin#2026",
    }));
    expect(changed.status).toBe(200);

    const forgot = await forgotRoute.POST(request("/api/auth/forgot", { email: "auth-api@example.test" }));
    expect(forgot.status).toBe(200);
    await expect(forgot.json()).resolves.toEqual({
      ok: true,
      message: "If that email is registered, password reset instructions have been sent.",
    });

    // Wait a tick for safeAfter email delivery
    await new Promise((r) => setTimeout(r, 50));
    expect(sentEmails.length).toBeGreaterThanOrEqual(1);
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
  });
});

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import bcrypt from "bcryptjs";
import { z } from "zod";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "ohtms_session" && cookieValue ? { value: cookieValue } : undefined }),
  headers: async () => new Headers(),
}));

let testDbPath: string;
let dbInstance: ReturnType<typeof import("@/server/db").openDb>;
let adminCookie: string;
let viewerCookie: string;
let keysRoute: typeof import("@/app/api/keys/route");
let keyRoute: typeof import("@/app/api/keys/[id]/route");
let usersRoute: typeof import("@/app/api/users/route");
let userRoute: typeof import("@/app/api/users/[id]/route");
let zonesRoute: typeof import("@/app/api/zones/route");
let zoneRoute: typeof import("@/app/api/zones/[id]/route");
let templatesRoute: typeof import("@/app/api/templates/route");
let templateRoute: typeof import("@/app/api/templates/[id]/route");
let totpSetupRoute: typeof import("@/app/api/auth/totp/setup/route");
let totpVerifyRoute: typeof import("@/app/api/auth/totp/verify/route");
let totpRoute: typeof import("@/app/api/auth/totp/route");
const sessionSecret = "admin-api-integration-session-secret";

const request = (url: string, method: string, body?: unknown) => new Request(`http://localhost${url}`, {
  method,
  ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
});
const context = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

describe("admin API integration", () => {
  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-admin-api-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = sessionSecret;
    const database = await import("@/server/db");
    dbInstance = database.openDb(testDbPath);
    (globalThis as typeof globalThis & { __ohtmsDb?: ReturnType<typeof database.openDb> }).__ohtmsDb = dbInstance;

    const now = Date.now();
    const passwordHash = await bcrypt.hash("AdminPassword#2026", 10);
    dbInstance.prepare("INSERT INTO users (id, email, name, password_hash, role, disabled, created_at) VALUES (?, ?, ?, ?, 'admin', 0, ?)")
      .run(1, "admin-api@example.test", "API Admin", passwordHash, now);
    dbInstance.prepare("INSERT INTO users (id, email, name, password_hash, role, disabled, created_at) VALUES (?, ?, ?, ?, 'viewer', 0, ?)")
      .run(2, "viewer-api@example.test", "API Viewer", passwordHash, now);

    const sessions = await import("@/server/repos/sessions");
    const authSession = await import("@/server/auth/session");
    adminCookie = await authSession.sign(
      { uid: 1, role: "admin", name: "API Admin", sessionId: sessions.createSession(1) },
      sessionSecret,
      1,
    );
    viewerCookie = await authSession.sign(
      { uid: 2, role: "viewer", name: "API Viewer", sessionId: sessions.createSession(2) },
      sessionSecret,
      1,
    );

    keysRoute = await import("@/app/api/keys/route");
    keyRoute = await import("@/app/api/keys/[id]/route");
    usersRoute = await import("@/app/api/users/route");
    userRoute = await import("@/app/api/users/[id]/route");
    zonesRoute = await import("@/app/api/zones/route");
    zoneRoute = await import("@/app/api/zones/[id]/route");
    templatesRoute = await import("@/app/api/templates/route");
    templateRoute = await import("@/app/api/templates/[id]/route");
    totpSetupRoute = await import("@/app/api/auth/totp/setup/route");
    totpVerifyRoute = await import("@/app/api/auth/totp/verify/route");
    totpRoute = await import("@/app/api/auth/totp/route");
  });

  afterAll(() => {
    dbInstance.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it("creates, lists, and revokes API keys with admin authorization", async () => {
    cookieValue = adminCookie;
    const createdResponse = await keysRoute.POST(request("/api/keys", "POST", { name: "Integration key", role: "operator" }));
    expect(createdResponse.status).toBe(201);
    const created = z.object({ id: z.number().int(), key: z.string().startsWith("mams_") }).parse(await createdResponse.json());

    const listedResponse = await keysRoute.GET();
    expect(listedResponse.status).toBe(200);
    const listed = z.object({ items: z.array(z.object({ id: z.number(), name: z.string(), role: z.string() })) }).parse(await listedResponse.json());
    expect(listed.items).toContainEqual(expect.objectContaining({ id: created.id, name: "Integration key", role: "operator" }));
    expect(listedResponse.headers.get("set-cookie")).toBeNull();

    const revokedResponse = await keyRoute.DELETE(request(`/api/keys/${created.id}`, "DELETE"), context(created.id));
    expect(revokedResponse.status).toBe(200);

    cookieValue = viewerCookie;
    expect((await keysRoute.GET()).status).toBe(403);
  });

  it("runs user list, create, detail, update, and disable endpoints", async () => {
    cookieValue = adminCookie;
    expect((await usersRoute.GET()).status).toBe(200);

    const createdResponse = await usersRoute.POST(request("/api/users", "POST", {
      email: "new-operator@example.test",
      name: "New Operator",
      role: "operator",
      password: "StrongHospital#2026",
    }));
    expect(createdResponse.status).toBe(201);
    const created = z.object({ id: z.number().int(), email: z.string(), role: z.string() }).parse(await createdResponse.json());

    expect((await userRoute.GET(request(`/api/users/${created.id}`, "GET"), context(created.id))).status).toBe(200);
    const updatedResponse = await userRoute.PATCH(request(`/api/users/${created.id}`, "PATCH", { name: "Updated Operator" }), context(created.id));
    expect(updatedResponse.status).toBe(200);
    await expect(updatedResponse.json()).resolves.toMatchObject({ name: "Updated Operator" });

    expect((await userRoute.DELETE(request(`/api/users/${created.id}`, "DELETE"), context(created.id))).status).toBe(200);
    await expect(userRoute.GET(request(`/api/users/${created.id}`, "GET"), context(created.id)).then((response) => response.json()))
      .resolves.toMatchObject({ disabled: true });
  });

  it("runs zone and threshold-template CRUD endpoints", async () => {
    cookieValue = adminCookie;
    expect((await zonesRoute.GET()).status).toBe(200);
    const zoneCreated = await zonesRoute.POST(request("/api/zones", "POST", { name: "Ward A", description: "Clinical wing" }));
    expect(zoneCreated.status).toBe(201);
    const zone = z.object({ id: z.number().int() }).parse(await zoneCreated.json());
    expect((await zoneRoute.GET(request(`/api/zones/${zone.id}`, "GET"), context(zone.id))).status).toBe(200);
    expect((await zoneRoute.PATCH(request(`/api/zones/${zone.id}`, "PATCH", { name: "Ward B" }), context(zone.id))).status).toBe(200);
    expect((await zoneRoute.DELETE(request(`/api/zones/${zone.id}`, "DELETE"), context(zone.id))).status).toBe(200);
    expect((await zoneRoute.GET(request(`/api/zones/${zone.id}`, "GET"), context(zone.id))).status).toBe(404);

    expect((await templatesRoute.GET()).status).toBe(200);
    const templateCreated = await templatesRoute.POST(request("/api/templates", "POST", { name: "Clinical thresholds" }));
    expect(templateCreated.status).toBe(201);
    const template = z.object({ id: z.number().int() }).parse(await templateCreated.json());
    expect((await templateRoute.GET(request(`/api/templates/${template.id}`, "GET"), context(template.id))).status).toBe(200);
    expect((await templateRoute.PATCH(request(`/api/templates/${template.id}`, "PATCH", { name: "Updated thresholds" }), context(template.id))).status).toBe(200);
    expect((await templateRoute.DELETE(request(`/api/templates/${template.id}`, "DELETE"), context(template.id))).status).toBe(200);
    expect((await templateRoute.GET(request(`/api/templates/${template.id}`, "GET"), context(template.id))).status).toBe(404);
  });

  it("enrolls, confirms, and disables TOTP through authenticated endpoints", async () => {
    cookieValue = adminCookie;
    const totp = await import("@/server/auth/totp");
    const at = Date.now();
    vi.useFakeTimers();
    vi.setSystemTime(at);
    try {
      const setup = await totpSetupRoute.POST(request("/api/auth/totp/setup", "POST", {}));
      expect(setup.status).toBe(200);
      const setupBody = z.object({ secret: z.string() }).parse(await setup.json());

      const verified = await totpVerifyRoute.POST(request("/api/auth/totp/verify", "POST", { token: totp.totpCode(setupBody.secret, at) }));
      expect(verified.status).toBe(200);
      await expect(verified.json()).resolves.toMatchObject({ enabled: true });

      vi.setSystemTime(at + 30_000);
      const disabled = await totpRoute.DELETE(request("/api/auth/totp", "DELETE", {
        currentPassword: "AdminPassword#2026",
        token: totp.totpCode(setupBody.secret, at + 30_000),
      }));
      expect(disabled.status).toBe(200);
      await expect(disabled.json()).resolves.toMatchObject({ enabled: false });
    } finally {
      vi.useRealTimers();
    }
  });
});

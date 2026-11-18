import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q } from "@/server/db";
import { env } from "@/server/env";
import { sign } from "@/server/auth/session";

import * as usersRoute from "@/app/api/users/route";
import * as userRoute from "@/app/api/users/[id]/route";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "ohtms_session" && cookieValue ? { value: cookieValue } : undefined }),
  headers: async () => new Headers(),
}));

const request = (url: string, method: string, body?: unknown) => new Request(`http://localhost${url}`, {
  method,
  ...(body === undefined ? {} : { headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
});
const context = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

describe("admin user management API integration", () => {
  let testCtx: TestSchemaContext;
  let adminCookie: string;
  let viewerCookie: string;

  beforeAll(async () => {
    testCtx = await createTestSchema();
    const secret = env().SESSION_SECRET;
    const now = Date.now();
    const passwordHash = await bcrypt.hash("AdminPassword#2026", 10);

    const [admin] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('admin-api@example.test', 'API Admin', $1, 'admin', FALSE, $2) RETURNING id",
      [passwordHash, now]
    );
    const [viewer] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, disabled, created_at) VALUES ('viewer-api@example.test', 'API Viewer', $1, 'viewer', FALSE, $2) RETURNING id",
      [passwordHash, now]
    );

    adminCookie = await sign({ uid: admin.id, role: "admin", name: "API Admin" }, secret, 1);
    viewerCookie = await sign({ uid: viewer.id, role: "viewer", name: "API Viewer" }, secret, 1);
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("enforces admin-only access on user management endpoints", async () => {
    cookieValue = viewerCookie;
    expect((await usersRoute.GET()).status).toBe(403);
    expect((await usersRoute.POST(request("/api/users", "POST", {
      email: "new-op@test.local",
      name: "New Op",
      role: "operator",
      password: "StrongPassword#2026",
    }))).status).toBe(403);
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
});

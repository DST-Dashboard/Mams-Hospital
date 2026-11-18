import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { q } from "@/server/db";
import { env } from "@/server/env";
import { sign } from "@/server/auth/session";
import { createTank } from "@/server/repos/tanks";
import { GET as GET_RECIPIENTS, PUT as PUT_RECIPIENT, DELETE as DELETE_RECIPIENT } from "@/app/api/tanks/[id]/recipients/route";

let cookieValue: string | undefined;
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (name: string) => name === "ohtms_session" && cookieValue ? { value: cookieValue } : undefined }),
  headers: async () => new Headers(),
}));

describe("tank notification recipients API", () => {
  let testCtx: TestSchemaContext;
  let tankId: number;
  let adminId: number;
  let viewerId: number;
  let adminCookie: string;
  let viewerCookie: string;

  const context = () => ({ params: Promise.resolve({ id: String(tankId) }) });

  beforeAll(async () => {
    testCtx = await createTestSchema();
    const secret = env().SESSION_SECRET;

    const [admin] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, created_at) VALUES ('admin@example.test', 'Admin', 'unused-test-hash', 'admin', $1) RETURNING id",
      [Date.now()]
    );
    const [viewer] = await q<{ id: number }>(
      "INSERT INTO users (email, name, password_hash, role, created_at) VALUES ('viewer@example.test', 'Viewer', 'unused-test-hash', 'viewer', $1) RETURNING id",
      [Date.now()]
    );
    adminId = admin.id;
    viewerId = viewer.id;

    await q("INSERT INTO devices (device_id, simulated, created_at) VALUES ('recipient-device', FALSE, $1)", [Date.now()]);
    tankId = await createTank({
      label: "Recipient test tank",
      deviceId: "recipient-device",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
    });

    adminCookie = await sign({ uid: adminId, role: "admin", name: "Admin" }, secret, 8);
    viewerCookie = await sign({ uid: viewerId, role: "viewer", name: "Viewer" }, secret, 8);
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  it("allows admins to set, list, and remove tank recipients", async () => {
    cookieValue = adminCookie;
    const input = { userId: viewerId, channels: ["in_app", "email"] };
    const put = await PUT_RECIPIENT(new Request(`http://localhost/api/tanks/${tankId}/recipients`, {
      method: "PUT",
      body: JSON.stringify(input),
    }), context());
    expect(put.status).toBe(200);

    const get = await GET_RECIPIENTS(new Request(`http://localhost/api/tanks/${tankId}/recipients`), context());
    expect(get.status).toBe(200);
    await expect(get.json()).resolves.toMatchObject({
      items: [{ userId: viewerId, email: "viewer@example.test", channels: ["in_app", "email"] }],
    });

    const remove = await DELETE_RECIPIENT(new Request(
      `http://localhost/api/tanks/${tankId}/recipients?userId=${viewerId}`,
      { method: "DELETE" },
    ), context());
    expect(remove.status).toBe(200);
  });

  it("enforces admin access and rejects invalid recipient input", async () => {
    cookieValue = viewerCookie;
    expect((await GET_RECIPIENTS(new Request(`http://localhost/api/tanks/${tankId}/recipients`), context())).status).toBe(403);

    cookieValue = adminCookie;
    const invalid = await PUT_RECIPIENT(new Request(`http://localhost/api/tanks/${tankId}/recipients`, {
      method: "PUT",
      body: JSON.stringify({ userId: 99999, channels: [] }),
    }), context());
    expect(invalid.status).toBe(400);
  });
});

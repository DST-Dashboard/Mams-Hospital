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
let tankId: number;
let adminCookie: string;
let viewerCookie: string;
let GET_RECIPIENTS: typeof import("@/app/api/tanks/[id]/recipients/route").GET;
let PUT_RECIPIENT: typeof import("@/app/api/tanks/[id]/recipients/route").PUT;
let DELETE_RECIPIENT: typeof import("@/app/api/tanks/[id]/recipients/route").DELETE;
const secret = "recipient-test-session-secret-at-least-32";

const context = () => ({ params: Promise.resolve({ id: String(tankId) }) });

describe("tank notification recipients API", () => {
  beforeAll(async () => {
    testDbPath = path.join(os.tmpdir(), `ohtms-test-recipients-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
    process.env.DB_PATH = testDbPath;
    process.env.SESSION_SECRET = secret;
    const database = await import("@/server/db");
    dbInstance = database.openDb(testDbPath);
    (globalThis as typeof globalThis & { __ohtmsDb?: ReturnType<typeof database.openDb> }).__ohtmsDb = dbInstance;

    for (const [id, role, name] of [[1, "admin", "Admin"], [2, "viewer", "Viewer"]] as const) {
      dbInstance.prepare("INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)")
        .run(id, `${name.toLowerCase()}@example.test`, name, "unused-test-hash", role, Date.now());
    }
    dbInstance.prepare("INSERT INTO devices (device_id, simulated, created_at) VALUES (?, 0, ?)")
      .run("recipient-device", Date.now());
    tankId = (await import("@/server/repos/tanks")).createTank({
      label: "Recipient test tank",
      deviceId: "recipient-device",
      status: "active",
      shape: "cylinder",
      heightCm: 300,
      radiusCm: 100,
      deadZoneCm: 25,
    });

    const session = await import("@/server/auth/session");
    const createSession = (await import("@/server/repos/sessions")).createSession;
    adminCookie = await session.sign({
      uid: 1,
      role: "admin",
      name: "Admin",
      sessionId: createSession(1),
    }, secret, 8);
    viewerCookie = await session.sign({
      uid: 2,
      role: "viewer",
      name: "Viewer",
      sessionId: createSession(2),
    }, secret, 8);

    const routes = await import("@/app/api/tanks/[id]/recipients/route");
    GET_RECIPIENTS = routes.GET;
    PUT_RECIPIENT = routes.PUT;
    DELETE_RECIPIENT = routes.DELETE;
  });

  afterAll(() => {
    dbInstance.close();
    for (const suffix of ["", "-wal", "-shm"]) {
      const file = `${testDbPath}${suffix}`;
      if (fs.existsSync(file)) fs.unlinkSync(file);
    }
  });

  it("allows admins to set, list, and remove tank recipients", async () => {
    cookieValue = adminCookie;
    const input = { userId: 2, channels: ["in_app", "email"] };
    const put = await PUT_RECIPIENT(new Request(`http://localhost/api/tanks/${tankId}/recipients`, {
      method: "PUT",
      body: JSON.stringify(input),
    }), context());
    expect(put.status).toBe(200);

    const get = await GET_RECIPIENTS(new Request(`http://localhost/api/tanks/${tankId}/recipients`), context());
    expect(get.status).toBe(200);
    await expect(get.json()).resolves.toMatchObject({
      items: [{ userId: 2, email: "viewer@example.test", channels: ["in_app", "email"] }],
    });

    const remove = await DELETE_RECIPIENT(new Request(
      `http://localhost/api/tanks/${tankId}/recipients?userId=2`,
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
      body: JSON.stringify({ userId: 99, channels: [] }),
    }), context());
    expect(invalid.status).toBe(400);
  });
});

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestSchema, TestSchemaContext } from "./test-db";
import { checkLoginRateLimit, recordLoginFailure, resetLoginRateLimit } from "@/server/rate-limit";
import { createUser, byId, deleteUser, countActiveAdmins, listUsers } from "@/server/repos/users";
import { audit, listAudit } from "@/server/repos/audit";
import nextConfig from "../next.config";

let testCtx: TestSchemaContext;

describe("Phase 6 Hardening: Auth, Rate Limits, Audit, and Security Headers", () => {
  beforeAll(async () => {
    testCtx = await createTestSchema();
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
  });

  describe("Login Rate Limiter", () => {
    it("locks after 5 consecutive failed attempts", async () => {
      const key = "login:test-ip:test@example.com";
      await resetLoginRateLimit(key);

      for (let i = 0; i < 4; i++) {
        await recordLoginFailure(key);
        const rl = await checkLoginRateLimit(key);
        expect(rl.allowed).toBe(true);
        expect(rl.remaining).toBe(5 - (i + 1));
      }

      // 5th failure
      await recordLoginFailure(key);
      const locked = await checkLoginRateLimit(key);
      expect(locked.allowed).toBe(false);
      expect(locked.remaining).toBe(0);
      expect(locked.resetMs).toBeGreaterThan(0);

      // Cleanup
      await resetLoginRateLimit(key);
      const reset = await checkLoginRateLimit(key);
      expect(reset.allowed).toBe(true);
      expect(reset.remaining).toBe(5);
    });
  });

  describe("Users Security & Admin Guard", () => {
    it("never returns password hashes in UserDTO", async () => {
      const user = await createUser({
        email: "hardening-user@mams.local",
        name: "Hardening User",
        role: "viewer",
        password: "SecurePassword!2026",
      });

      expect((user as Record<string, unknown>).password_hash).toBeUndefined();
      expect((user as Record<string, unknown>).passwordHash).toBeUndefined();
      expect(user.email).toBe("hardening-user@mams.local");
    });

    it("prevents deleting the last remaining active administrator", async () => {
      const activeAdmins = await countActiveAdmins();
      expect(activeAdmins).toBe(0);

      const admin = await createUser({
        email: "sole-admin@mams.local",
        name: "Sole Admin",
        role: "admin",
        password: "AdminPassword!2026",
      });

      expect(await countActiveAdmins()).toBe(1);

      // Attempting to delete the sole admin should throw
      await expect(deleteUser(admin.id)).rejects.toThrow(
        "Cannot delete the last remaining active administrator"
      );

      // Create a second admin
      const secondAdmin = await createUser({
        email: "second-admin@mams.local",
        name: "Second Admin",
        role: "admin",
        password: "AdminPassword!2026",
      });

      expect(await countActiveAdmins()).toBe(2);

      // Deleting the second admin now succeeds
      await deleteUser(secondAdmin.id);
      expect(await countActiveAdmins()).toBe(1);

      const deleted = await byId(secondAdmin.id);
      expect(deleted?.disabled).toBe(true);
    });
  });

  describe("Audit Log Paging & Filtering", () => {
    it("records and filters audit logs by action and entity", async () => {
      await audit({
        userId: 1,
        action: "tank.recalibrate",
        entity: "tank",
        entityId: "1",
        before: { heightCm: 300 },
        after: { heightCm: 320 },
      });

      await audit({
        userId: 1,
        action: "tank.delete",
        entity: "tank",
        entityId: "2",
      });

      const all = await listAudit({ page: 1, pageSize: 50 });
      expect(all.total).toBeGreaterThanOrEqual(2);

      const filtered = await listAudit({ action: "tank.recalibrate", page: 1, pageSize: 10 });
      expect(filtered.items.length).toBeGreaterThanOrEqual(1);
      expect(filtered.items[0]?.action).toBe("tank.recalibrate");
      expect(filtered.items[0]?.entity).toBe("tank");
    });
  });

  describe("Security Headers Configuration", () => {
    it("defines CSP, HSTS, X-Frame-Options DENY in next.config.ts", async () => {
      expect(nextConfig.headers).toBeDefined();
      const headersList = await nextConfig.headers!();
      expect(headersList.length).toBeGreaterThan(0);
      const rootHeaders = headersList[0]?.headers;
      expect(rootHeaders).toBeDefined();

      const headerMap = new Map(rootHeaders!.map((h) => [h.key, h.value]));
      expect(headerMap.get("X-Frame-Options")).toBe("DENY");
      expect(headerMap.get("X-Content-Type-Options")).toBe("nosniff");
      expect(headerMap.get("Strict-Transport-Security")).toContain("max-age=31536000");
      expect(headerMap.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    });
  });
});

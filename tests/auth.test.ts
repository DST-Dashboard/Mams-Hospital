import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import { openDb } from "@/server/db";
import { validatePassword } from "@/server/auth/password-policy";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginRateLimit,
} from "@/server/rate-limit";
import {
  createSession,
  validateSession,
  revokeSession,
} from "@/server/repos/sessions";
import {
  createUser,
  updateUser,
  deleteUser,
  byId,
  changeUserPassword,
  createPasswordReset,
  verifyAndConsumePasswordReset,
} from "@/server/repos/users";

const TEST_DB = path.resolve(process.cwd(), "var/test_auth.db");

describe("BE-03: Authentication and User Management", () => {
  let dbInstance: any;

  beforeAll(() => {
    process.env.DB_PATH = TEST_DB;
    for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
      try {
        fs.rmSync(f, { force: true });
      } catch {}
    }
    dbInstance = openDb(TEST_DB);
  });

  afterAll(() => {
    if (dbInstance) {
      dbInstance.close();
      dbInstance = null;
    }
    for (const f of [TEST_DB, `${TEST_DB}-wal`, `${TEST_DB}-shm`]) {
      try {
        fs.rmSync(f, { force: true });
      } catch {}
    }
  });

  describe("Password Policy", () => {
    it("rejects passwords shorter than 8 characters", () => {
      expect(validatePassword("Short1!").valid).toBe(false);
    });

    it("rejects common passwords", () => {
      expect(validatePassword("password123").valid).toBe(false);
      expect(validatePassword("admin123").valid).toBe(false);
    });

    it("rejects passwords without numbers or symbols", () => {
      expect(validatePassword("onlylettersherenonumber").valid).toBe(false);
    });

    it("accepts strong compliant passwords", () => {
      expect(validatePassword("HospitalSafe#2026").valid).toBe(true);
      expect(validatePassword("SecurePass99").valid).toBe(true);
    });
  });

  describe("User CRUD & Role Management", () => {
    it("creates a new operator and hashes password", () => {
      const user = createUser({
        email: "nurse.priya@mams.local",
        name: "Nurse Priya",
        role: "operator",
        password: "StrongPass#2026",
      });

      expect(user.id).toBeGreaterThan(0);
      expect(user.email).toBe("nurse.priya@mams.local");
      expect(user.role).toBe("operator");

      const inDb = byId(user.id);
      expect(inDb).toBeDefined();
      expect(inDb!.passwordHash).not.toBe("StrongPass#2026");
      expect(bcrypt.compareSync("StrongPass#2026", inDb!.passwordHash)).toBe(true);
    });

    it("prevents duplicate user email registration", () => {
      createUser({
        email: "duplicate@mams.local",
        name: "Original",
        role: "viewer",
        password: "PassWord123!",
      });

      expect(() =>
        createUser({
          email: "duplicate@mams.local",
          name: "Second",
          role: "viewer",
          password: "PassWord123!",
        })
      ).toThrow(/already exists/);
    });

    it("updates user role and details", () => {
      const user = createUser({
        email: "update.test@mams.local",
        name: "Test User",
        role: "viewer",
        password: "PassWord123!",
      });

      const updated = updateUser(user.id, { role: "admin", name: "Promoted Admin" });
      expect(updated.role).toBe("admin");
      expect(updated.name).toBe("Promoted Admin");
    });

    it("disables a user", () => {
      const user = createUser({
        email: "disabled.test@mams.local",
        name: "Dis User",
        role: "viewer",
        password: "PassWord123!",
      });

      deleteUser(user.id);
      const after = byId(user.id);
      expect(after?.disabled).toBe(true);
    });
  });

  describe("Login Rate Limiting", () => {
    it("allows up to 5 failed attempts before blocking", () => {
      const key = "test:ip:10.0.0.99:user@mams.local";
      resetLoginRateLimit(key);

      for (let i = 0; i < 4; i++) {
        recordLoginFailure(key);
        const check = checkLoginRateLimit(key);
        expect(check.allowed).toBe(true);
        expect(check.remaining).toBe(5 - (i + 1));
      }

      // 5th failure
      recordLoginFailure(key);
      const blocked = checkLoginRateLimit(key);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetMs).toBeGreaterThan(0);

      resetLoginRateLimit(key);
      const cleared = checkLoginRateLimit(key);
      expect(cleared.allowed).toBe(true);
    });
  });

  describe("Session Lifecycle", () => {
    it("creates, validates, and revokes sessions", () => {
      const user = createUser({
        email: "session.user@mams.local",
        name: "Session User",
        role: "viewer",
        password: "PassWord123!",
      });

      const sessionId = createSession(user.id, 8, "127.0.0.1", "Vitest");
      expect(sessionId).toHaveLength(64);

      const val = validateSession(sessionId);
      expect(val.valid).toBe(true);
      expect(val.userId).toBe(user.id);

      revokeSession(sessionId);
      const revoked = validateSession(sessionId);
      expect(revoked.valid).toBe(false);
    });
  });

  describe("Password Reset Flow", () => {
    it("issues a reset token, verifies, and consumes it", async () => {
      const user = createUser({
        email: "reset.target@mams.local",
        name: "Reset Target",
        role: "operator",
        password: "InitialPassword#1",
      });

      const token = createPasswordReset(user.email);
      expect(token).toBeDefined();

      await verifyAndConsumePasswordReset(token, "BrandNewPassword#99");

      // Verify user can now authenticate with new password
      const updated = byId(user.id)!;
      expect(await bcrypt.compare("BrandNewPassword#99", updated.passwordHash)).toBe(true);

      // Token cannot be reused
      await expect(
        verifyAndConsumePasswordReset(token, "AnotherPassword#22")
      ).rejects.toThrow(/already been used/);
    });
  });

  describe("Password Change", () => {
    it("allows user to change their password when providing correct current password", async () => {
      const user = createUser({
        email: "change.user@mams.local",
        name: "Change User",
        role: "operator",
        password: "OldPassword#1",
      });

      await expect(
        changeUserPassword(user.id, "WrongPassword#1", "NewPassword#2")
      ).rejects.toThrow(/Current password is incorrect/);

      await changeUserPassword(user.id, "OldPassword#1", "NewPassword#2");
      const updated = byId(user.id)!;
      expect(await bcrypt.compare("NewPassword#2", updated.passwordHash)).toBe(true);
    });
  });
});

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { validatePassword } from "@/server/auth/password-policy";
import { sign, verify, COOKIE } from "@/server/auth/session";
import {
  checkLoginRateLimit,
  recordLoginFailure,
  resetLoginRateLimit,
} from "@/server/rate-limit";
import {
  createUser,
  updateUser,
  deleteUser,
  byId,
  changeUserPassword,
  createPasswordReset,
  verifyAndConsumePasswordReset,
} from "@/server/repos/users";
import { createTestSchema, TestSchemaContext } from "./test-db";

describe("BE-03: Authentication and User Management", () => {
  let testCtx: TestSchemaContext;

  beforeAll(async () => {
    testCtx = await createTestSchema();
  });

  afterAll(async () => {
    if (testCtx) await testCtx.cleanup();
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
    it("creates a new operator and hashes password", async () => {
      const user = await createUser({
        email: "nurse.priya@mams.local",
        name: "Nurse Priya",
        role: "operator",
        password: "StrongPass#2026",
      });

      expect(user.id).toBeGreaterThan(0);
      expect(user.email).toBe("nurse.priya@mams.local");
      expect(user.role).toBe("operator");

      const inDb = await byId(user.id);
      expect(inDb).toBeDefined();
      expect(inDb!.passwordHash).not.toBe("StrongPass#2026");
      expect(await bcrypt.compare("StrongPass#2026", inDb!.passwordHash)).toBe(true);
    });

    it("prevents duplicate user email registration", async () => {
      await createUser({
        email: "duplicate@mams.local",
        name: "Original",
        role: "viewer",
        password: "PassWord123!",
      });

      await expect(
        createUser({
          email: "duplicate@mams.local",
          name: "Second",
          role: "viewer",
          password: "PassWord123!",
        })
      ).rejects.toThrow(/already exists/);
    });

    it("updates user role and details", async () => {
      const user = await createUser({
        email: "update.test@mams.local",
        name: "Test User",
        role: "viewer",
        password: "PassWord123!",
      });

      const updated = await updateUser(user.id, { role: "admin", name: "Promoted Admin" });
      expect(updated.role).toBe("admin");
      expect(updated.name).toBe("Promoted Admin");
    });

    it("disables a user", async () => {
      const user = await createUser({
        email: "disabled.test@mams.local",
        name: "Dis User",
        role: "viewer",
        password: "PassWord123!",
      });

      await deleteUser(user.id);
      const after = await byId(user.id);
      expect(after?.disabled).toBe(true);
    });
  });

  describe("Login Rate Limiting", () => {
    it("allows up to 5 failed attempts before blocking", async () => {
      const key = "test:ip:10.0.0.99:user@mams.local";
      await resetLoginRateLimit(key);

      for (let i = 0; i < 4; i++) {
        await recordLoginFailure(key);
        const check = await checkLoginRateLimit(key);
        expect(check.allowed).toBe(true);
        expect(check.remaining).toBe(5 - (i + 1));
      }

      // 5th failure
      await recordLoginFailure(key);
      const blocked = await checkLoginRateLimit(key);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.resetMs).toBeGreaterThan(0);

      await resetLoginRateLimit(key);
      const cleared = await checkLoginRateLimit(key);
      expect(cleared.allowed).toBe(true);
    });
  });

  describe("Session JWT Lifecycle", () => {
    it("signs and verifies stateless JWT tokens for sessions", async () => {
      const secret = "012345678901234567890123456789012345";
      const token = await sign(
        { uid: 1, role: "admin", name: "Administrator" },
        secret,
        8
      );
      expect(typeof token).toBe("string");

      const session = await verify(token, secret);
      expect(session).toMatchObject({
        uid: 1,
        role: "admin",
        name: "Administrator",
      });

      const invalid = await verify(token, "wrong-secret-must-be-at-least-32-chars-long");
      expect(invalid).toBeNull();
    });
  });

  describe("Password Reset Flow", () => {
    it("issues a reset token, verifies, and consumes it", async () => {
      const user = await createUser({
        email: "reset.target@mams.local",
        name: "Reset Target",
        role: "operator",
        password: "InitialPassword#1",
      });

      const token = await createPasswordReset(user.email);
      expect(token).toBeDefined();

      await verifyAndConsumePasswordReset(token, "BrandNewPassword#99");

      // Verify user can now authenticate with new password
      const updated = (await byId(user.id))!;
      expect(await bcrypt.compare("BrandNewPassword#99", updated.passwordHash)).toBe(true);

      // Token cannot be reused
      await expect(
        verifyAndConsumePasswordReset(token, "AnotherPassword#22")
      ).rejects.toThrow(/already been used/);
    });
  });

  describe("Password Change", () => {
    it("allows user to change their password when providing correct current password", async () => {
      const user = await createUser({
        email: "change.user@mams.local",
        name: "Change User",
        role: "operator",
        password: "OldPassword#1",
      });

      await expect(
        changeUserPassword(user.id, "WrongPassword#1", "NewPassword#2")
      ).rejects.toThrow(/Current password is incorrect/);

      await changeUserPassword(user.id, "OldPassword#1", "NewPassword#2");
      const updated = (await byId(user.id))!;
      expect(await bcrypt.compare("NewPassword#2", updated.passwordHash)).toBe(true);
    });
  });
});

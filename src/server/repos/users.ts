/**
 * [BE-03] OWNER: backend · User repository.
 * Complete CRUD, password hashing, password resets, and session management.
 */
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { db } from "../db";
import { assertPasswordPolicy } from "../auth/password-policy";
import type { UserDTO } from "@/contracts";

export interface UserRow {
  id: number;
  email: string;
  name: string;
  role: "viewer" | "operator" | "admin";
  passwordHash: string;
  disabled: boolean;
  createdAt: number;
  lastLoginAt: number | null;
}

type Raw = Record<string, any>;

const mapRow = (r: Raw): UserRow => ({
  id: r.id,
  email: r.email,
  name: r.name,
  role: r.role,
  passwordHash: r.password_hash,
  disabled: !!r.disabled,
  createdAt: r.created_at,
  lastLoginAt: r.last_login_at,
});

const toDto = (u: UserRow): UserDTO => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  disabled: u.disabled,
  createdAt: u.createdAt,
  lastLoginAt: u.lastLoginAt,
});

export const byEmail = (email: string): UserRow | undefined => {
  const r = db().prepare("SELECT * FROM users WHERE email=? COLLATE NOCASE").get(email) as
    | Raw
    | undefined;
  return r && mapRow(r);
};

export const byId = (id: number): UserRow | undefined => {
  const r = db().prepare("SELECT * FROM users WHERE id=?").get(id) as Raw | undefined;
  return r && mapRow(r);
};

export const touchLogin = (id: number): void => {
  db().prepare("UPDATE users SET last_login_at=? WHERE id=?").run(Date.now(), id);
};

export const listUsers = (): UserDTO[] => {
  const rows = db().prepare("SELECT * FROM users ORDER BY id ASC").all() as Raw[];
  return rows.map(mapRow).map(toDto);
};

export const createUser = (data: {
  email: string;
  name: string;
  role: "viewer" | "operator" | "admin";
  password: string;
}): UserDTO => {
  assertPasswordPolicy(data.password);

  const existing = byEmail(data.email);
  if (existing) {
    throw new Error(`User with email "${data.email}" already exists`);
  }

  const now = Date.now();
  const passwordHash = bcrypt.hashSync(data.password, 10);

  const res = db()
    .prepare(
      `INSERT INTO users (email, name, password_hash, role, disabled, created_at, last_login_at)
       VALUES (?, ?, ?, ?, 0, ?, NULL)`
    )
    .run(data.email.trim().toLowerCase(), data.name.trim(), passwordHash, data.role, now);

  const newId = Number(res.lastInsertRowid);
  return toDto(byId(newId)!);
};

export const updateUser = (
  id: number,
  patch: {
    name?: string;
    role?: "viewer" | "operator" | "admin";
    disabled?: boolean;
    password?: string;
  }
): UserDTO => {
  const user = byId(id);
  if (!user) throw new Error("User not found");

  const updates: string[] = [];
  const params: any[] = [];

  if (patch.name !== undefined) {
    updates.push("name = ?");
    params.push(patch.name.trim());
  }

  if (patch.role !== undefined) {
    updates.push("role = ?");
    params.push(patch.role);
  }

  if (patch.disabled !== undefined) {
    updates.push("disabled = ?");
    params.push(patch.disabled ? 1 : 0);
  }

  if (patch.password !== undefined && patch.password.trim() !== "") {
    assertPasswordPolicy(patch.password);
    updates.push("password_hash = ?");
    params.push(bcrypt.hashSync(patch.password, 10));
  }

  if (updates.length > 0) {
    params.push(id);
    db().prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...params);
  }

  return toDto(byId(id)!);
};

export const deleteUser = (id: number): void => {
  // Soft disable user
  db().prepare("UPDATE users SET disabled = 1 WHERE id = ?").run(id);
};

export const changeUserPassword = async (
  userId: number,
  current: string,
  next: string
): Promise<void> => {
  const user = byId(userId);
  if (!user) throw new Error("User not found");

  const matches = await bcrypt.compare(current, user.passwordHash);
  if (!matches) {
    throw new Error("Current password is incorrect");
  }

  assertPasswordPolicy(next);
  const newHash = await bcrypt.hash(next, 10);

  db().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, userId);
};

export const createPasswordReset = (email: string): string => {
  const user = byEmail(email);
  if (!user) {
    // Generate dummy token to prevent email enumeration timing attacks
    return crypto.randomBytes(32).toString("hex");
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const now = Date.now();
  const expiresAt = now + 3600_000; // 1 hour expiration

  db()
    .prepare(
      `INSERT INTO password_resets (token_hash, user_id, created_at, expires_at, used_at)
       VALUES (?, ?, ?, ?, NULL)`
    )
    .run(tokenHash, user.id, now, expiresAt);

  return rawToken;
};

export const verifyAndConsumePasswordReset = async (
  rawToken: string,
  newPassword: string
): Promise<void> => {
  assertPasswordPolicy(newPassword);

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const row = db()
    .prepare(
      `SELECT user_id, expires_at, used_at FROM password_resets
       WHERE token_hash = ?`
    )
    .get(tokenHash) as { user_id: number; expires_at: number; used_at: number | null } | undefined;

  if (!row) {
    throw new Error("Invalid or expired password reset token");
  }

  if (row.used_at !== null) {
    throw new Error("This password reset token has already been used");
  }

  if (row.expires_at < Date.now()) {
    throw new Error("Password reset token has expired");
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  db().transaction(() => {
    db().prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(newHash, row.user_id);
    db().prepare("UPDATE password_resets SET used_at = ? WHERE token_hash = ?").run(
      Date.now(),
      tokenHash
    );
  })();
};

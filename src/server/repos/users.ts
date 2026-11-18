import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { q, q1, tx } from "../db";
import { assertPasswordPolicy } from "../auth/password-policy";
import type { UserDTO } from "@/contracts";

export interface UserRow {
  id: number;
  email: string;
  name: string;
  role: "viewer" | "operator" | "admin";
  passwordHash: string;
  disabled: boolean;
  mustChangePassword: boolean;
  createdAt: number;
  lastLoginAt: number | null;
}

export class PasswordResetError extends Error {}

interface Raw {
  id: number;
  email: string;
  name: string;
  role: UserRow["role"];
  password_hash: string;
  disabled: boolean;
  must_change_password: boolean;
  created_at: number;
  last_login_at: number | null;
}

const mapRow = (r: Raw): UserRow => ({
  id: Number(r.id),
  email: r.email,
  name: r.name,
  role: r.role,
  passwordHash: r.password_hash,
  disabled: Boolean(r.disabled),
  mustChangePassword: Boolean(r.must_change_password),
  createdAt: Number(r.created_at),
  lastLoginAt: r.last_login_at ? Number(r.last_login_at) : null,
});

export const toDto = (u: UserRow): UserDTO => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
  disabled: u.disabled,
  createdAt: u.createdAt,
  lastLoginAt: u.lastLoginAt,
});

export async function byEmail(email: string): Promise<UserRow | undefined> {
  const r = await q1<Raw>(
    "SELECT * FROM users WHERE lower(email) = lower($1)",
    [email.trim()]
  );
  return r ? mapRow(r) : undefined;
}

export async function byId(id: number): Promise<UserRow | undefined> {
  const r = await q1<Raw>("SELECT * FROM users WHERE id = $1", [id]);
  return r ? mapRow(r) : undefined;
}

export async function touchLogin(id: number): Promise<void> {
  await q("UPDATE users SET last_login_at = $1 WHERE id = $2", [Date.now(), id]);
}

export async function listUsers(): Promise<UserDTO[]> {
  const rows = await q<Raw>("SELECT * FROM users ORDER BY id ASC");
  return rows.map(mapRow).map(toDto);
}

export async function countActiveAdmins(): Promise<number> {
  const rows = await q<{ count: string | number }>(
    "SELECT count(*)::int as count FROM users WHERE role = 'admin' AND disabled = FALSE"
  );
  return Number(rows[0]?.count ?? 0);
}

export async function createUser(data: {
  email: string;
  name: string;
  role: "viewer" | "operator" | "admin";
  password: string;
  mustChangePassword?: boolean;
}): Promise<UserDTO> {
  assertPasswordPolicy(data.password);

  const existing = await byEmail(data.email);
  if (existing) {
    throw new Error(`User with email "${data.email}" already exists`);
  }

  const now = Date.now();
  const passwordHash = await bcrypt.hash(data.password, 10);

  const rows = await q<{ id: number }>(
    `INSERT INTO users (email, name, password_hash, role, disabled, must_change_password, created_at, last_login_at)
     VALUES ($1, $2, $3, $4, FALSE, $5, $6, NULL)
     RETURNING id`,
    [
      data.email.trim().toLowerCase(),
      data.name.trim(),
      passwordHash,
      data.role,
      Boolean(data.mustChangePassword),
      now,
    ]
  );

  const newId = Number(rows[0].id);
  const created = await byId(newId);
  return toDto(created!);
}

export async function updateUser(
  id: number,
  patch: {
    name?: string;
    role?: "viewer" | "operator" | "admin";
    disabled?: boolean;
    password?: string;
    mustChangePassword?: boolean;
  }
): Promise<UserDTO> {
  const user = await byId(id);
  if (!user) throw new Error("User not found");

  // Last admin guard: cannot disable or demote the only active admin
  if (user.role === "admin" && !user.disabled) {
    const isDemoting = patch.role !== undefined && patch.role !== "admin";
    const isDisabling = patch.disabled === true;
    if (isDemoting || isDisabling) {
      const activeAdmins = await countActiveAdmins();
      if (activeAdmins <= 1) {
        throw new Error("Cannot modify the last remaining active administrator");
      }
    }
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let pIdx = 1;

  if (patch.name !== undefined) {
    updates.push(`name = $${pIdx++}`);
    params.push(patch.name.trim());
  }

  if (patch.role !== undefined) {
    updates.push(`role = $${pIdx++}`);
    params.push(patch.role);
  }

  if (patch.disabled !== undefined) {
    updates.push(`disabled = $${pIdx++}`);
    params.push(Boolean(patch.disabled));
  }

  if (patch.mustChangePassword !== undefined) {
    updates.push(`must_change_password = $${pIdx++}`);
    params.push(Boolean(patch.mustChangePassword));
  }

  if (patch.password !== undefined && patch.password.trim() !== "") {
    assertPasswordPolicy(patch.password);
    updates.push(`password_hash = $${pIdx++}`);
    params.push(await bcrypt.hash(patch.password, 10));
  }

  if (updates.length > 0) {
    params.push(id);
    await q(`UPDATE users SET ${updates.join(", ")} WHERE id = $${pIdx}`, params);
  }

  const updated = await byId(id);
  return toDto(updated!);
}

export async function deleteUser(id: number): Promise<void> {
  const user = await byId(id);
  if (!user) return;

  if (user.role === "admin" && !user.disabled) {
    const activeAdmins = await countActiveAdmins();
    if (activeAdmins <= 1) {
      throw new Error("Cannot delete the last remaining active administrator");
    }
  }

  await q("UPDATE users SET disabled = TRUE WHERE id = $1", [id]);
}

export async function changeUserPassword(
  userId: number,
  current: string,
  next: string
): Promise<void> {
  const user = await byId(userId);
  if (!user) throw new Error("User not found");

  const matches = await bcrypt.compare(current, user.passwordHash);
  if (!matches) {
    throw new Error("Current password is incorrect");
  }

  assertPasswordPolicy(next);
  const newHash = await bcrypt.hash(next, 10);

  await tx(async (client) => {
    await client.query(
      "UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2",
      [newHash, userId]
    );
    await client.query(
      "UPDATE password_resets SET used_at = $1 WHERE user_id = $2 AND used_at IS NULL",
      [Date.now(), userId]
    );
  });
}

/** Hashed single-use 30-minute password reset token */
export async function createPasswordReset(email: string): Promise<string> {
  const user = await byEmail(email);
  if (!user) {
    // Return dummy token to prevent email enumeration timing attacks
    return crypto.randomBytes(32).toString("hex");
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const now = Date.now();
  const expiresAt = now + 30 * 60_000; // 30 minutes expiration per spec

  await tx(async (client) => {
    await client.query(
      "UPDATE password_resets SET used_at = $1 WHERE user_id = $2 AND used_at IS NULL",
      [now, user.id]
    );
    await client.query(
      `INSERT INTO password_resets (token_hash, user_id, created_at, expires_at, used_at)
       VALUES ($1, $2, $3, $4, NULL)`,
      [tokenHash, user.id, now, expiresAt]
    );
  });

  return rawToken;
}

export async function verifyAndConsumePasswordReset(
  rawToken: string,
  newPassword: string
): Promise<void> {
  assertPasswordPolicy(newPassword);

  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const row = await q1<{ user_id: number; expires_at: number; used_at: number | null }>(
    "SELECT user_id, expires_at, used_at FROM password_resets WHERE token_hash = $1",
    [tokenHash]
  );

  if (!row) {
    throw new PasswordResetError("Invalid or expired password reset token");
  }

  if (row.used_at !== null) {
    throw new PasswordResetError("This password reset token has already been used");
  }

  if (Number(row.expires_at) < Date.now()) {
    throw new PasswordResetError("Password reset token has expired");
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  await tx(async (client) => {
    await client.query(
      "UPDATE users SET password_hash = $1, must_change_password = FALSE WHERE id = $2",
      [newHash, row.user_id]
    );
    const consumed = await client.query(
      "UPDATE password_resets SET used_at = $1 WHERE token_hash = $2 AND used_at IS NULL AND expires_at >= $1",
      [Date.now(), tokenHash]
    );
    if ((consumed.rowCount ?? 0) !== 1) {
      throw new PasswordResetError("Invalid or expired password reset token");
    }
  });
}

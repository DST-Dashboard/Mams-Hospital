import crypto from "node:crypto";
import { q, q1 } from "../db";
import type { Role } from "../auth/session";

export interface ApiKeyRow {
  id: number;
  user_id: number | null;
  name: string;
  key_hash: string;
  key_prefix: string;
  role: Role;
  tank_id: number | null;
  created_at: number;
  expires_at: number | null;
  revoked_at: number | null;
  last_used_at: number | null;
}

export interface ApiKeyInfo {
  id: number;
  name: string;
  keyPrefix: string;
  role: Role;
  tankId: number | null;
  userId: number | null;
  createdAt: number;
  expiresAt: number | null;
  revokedAt: number | null;
  lastUsedAt: number | null;
}

export const hashKey = (key: string): string =>
  crypto.createHash("sha256").update(key).digest("hex");

export async function createApiKey(input: {
  name: string;
  role?: Role;
  userId?: number | null;
  tankId?: number | null;
  expiresAt?: number | null;
}): Promise<ApiKeyInfo & { rawKey: string }> {
  const randomBytes = crypto.randomBytes(32).toString("base64url");
  const rawKey = `mams_api_${randomBytes}`;
  const keyPrefix = rawKey.slice(0, 15);
  const keyHash = hashKey(rawKey);
  const now = Date.now();
  const role = input.role ?? "operator";

  const rows = await q<ApiKeyRow>(
    `INSERT INTO api_keys (user_id, name, key_hash, key_prefix, role, tank_id, created_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, user_id, name, key_prefix, role, tank_id, created_at, expires_at, revoked_at, last_used_at`,
    [
      input.userId ?? null,
      input.name.trim(),
      keyHash,
      keyPrefix,
      role,
      input.tankId ?? null,
      now,
      input.expiresAt ?? null,
    ]
  );

  const row = rows[0];
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    role: row.role,
    tankId: row.tank_id,
    userId: row.user_id,
    createdAt: Number(row.created_at),
    expiresAt: row.expires_at ? Number(row.expires_at) : null,
    revokedAt: row.revoked_at ? Number(row.revoked_at) : null,
    lastUsedAt: row.last_used_at ? Number(row.last_used_at) : null,
    rawKey,
  };
}

export async function authenticateApiKey(rawKey: string): Promise<{
  id: number;
  name: string;
  role: Role;
  tankId: number | null;
  userId: number | null;
} | null> {
  if (!rawKey || typeof rawKey !== "string" || !rawKey.startsWith("mams_api_")) {
    return null;
  }

  const keyHash = hashKey(rawKey);
  const row = await q1<ApiKeyRow>(
    `SELECT id, name, role, tank_id, user_id, expires_at, revoked_at
     FROM api_keys
     WHERE key_hash = $1 AND revoked_at IS NULL`,
    [keyHash]
  );

  if (!row) return null;

  if (row.expires_at != null && Number(row.expires_at) <= Date.now()) {
    return null;
  }

  // Record usage non-blockingly
  q("UPDATE api_keys SET last_used_at = $1 WHERE id = $2", [Date.now(), row.id]).catch(() => {});

  return {
    id: row.id,
    name: row.name,
    role: row.role,
    tankId: row.tank_id,
    userId: row.user_id,
  };
}

export async function listApiKeys(userId?: number | null): Promise<ApiKeyInfo[]> {
  const sql = userId != null
    ? "SELECT id, name, key_prefix, role, tank_id, user_id, created_at, expires_at, revoked_at, last_used_at FROM api_keys WHERE user_id = $1 ORDER BY id DESC"
    : "SELECT id, name, key_prefix, role, tank_id, user_id, created_at, expires_at, revoked_at, last_used_at FROM api_keys ORDER BY id DESC";
  const params = userId != null ? [userId] : [];
  const rows = await q<ApiKeyRow>(sql, params);

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    keyPrefix: r.key_prefix,
    role: r.role,
    tankId: r.tank_id,
    userId: r.user_id,
    createdAt: Number(r.created_at),
    expiresAt: r.expires_at ? Number(r.expires_at) : null,
    revokedAt: r.revoked_at ? Number(r.revoked_at) : null,
    lastUsedAt: r.last_used_at ? Number(r.last_used_at) : null,
  }));
}

export async function revokeApiKey(id: number, userId?: number | null): Promise<boolean> {
  const now = Date.now();
  let sql = "UPDATE api_keys SET revoked_at = $1 WHERE id = $2 AND revoked_at IS NULL";
  const params: unknown[] = [now, id];
  if (userId != null) {
    sql += " AND user_id = $3";
    params.push(userId);
  }
  const rows = await q(sql + " RETURNING id", params);
  return rows.length > 0;
}

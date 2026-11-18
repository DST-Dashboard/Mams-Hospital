import crypto from "node:crypto";
import { ApiKeyDTO, type ApiKeyDTO as ApiKey } from "@/contracts/auth";
import type { Role, Session } from "../auth/session";
import { db } from "../db";

interface ApiKeyRow {
  id: number;
  name: string;
  role: Role;
  created_at: number;
  last_used_at: number | null;
  revoked_at: number | null;
  user_id?: number;
  user_name?: string;
  disabled?: number;
}

function toDTO(row: ApiKeyRow): ApiKey {
  return ApiKeyDTO.parse({
    id: row.id,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    revokedAt: row.revoked_at,
  });
}

const hashKey = (key: string) => crypto.createHash("sha256").update(key).digest("hex");

export function createApiKey(input: { userId: number; name: string; role: "viewer" | "operator" }): { key: string } & ApiKey {
  const key = `mams_${crypto.randomBytes(32).toString("base64url")}`;
  const now = Date.now();
  const result = db().prepare(`
    INSERT INTO api_keys (name, key_hash, user_id, role, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(input.name.trim(), hashKey(key), input.userId, input.role, now);
  return {
    ...ApiKeyDTO.parse({
      id: Number(result.lastInsertRowid),
      name: input.name.trim(),
      role: input.role,
      createdAt: now,
      lastUsedAt: null,
      revokedAt: null,
    }),
    key,
  };
}

export function listApiKeys(userId: number): ApiKey[] {
  const rows = db().prepare(`
    SELECT id, name, role, created_at, last_used_at, revoked_at
    FROM api_keys WHERE user_id = ? ORDER BY created_at DESC, id DESC
  `).all(userId) as ApiKeyRow[];
  return rows.map(toDTO);
}

export function revokeApiKey(id: number, userId: number): boolean {
  return db().prepare("UPDATE api_keys SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL")
    .run(Date.now(), id, userId).changes === 1;
}

export function authenticateApiKey(rawKey: string): Session | null {
  if (!/^mams_[A-Za-z0-9_-]{40,60}$/.test(rawKey)) return null;
  const row = db().prepare(`
    SELECT k.id, k.role, k.user_id, u.name AS user_name, u.disabled
    FROM api_keys k JOIN users u ON u.id = k.user_id
    WHERE k.key_hash = ? AND k.revoked_at IS NULL
  `).get(hashKey(rawKey)) as (ApiKeyRow & { user_id: number; user_name: string; disabled: number }) | undefined;
  if (!row || row.disabled) return null;
  db().prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").run(Date.now(), row.id);
  return { uid: row.user_id, role: row.role, name: row.user_name };
}

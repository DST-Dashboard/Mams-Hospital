/**
 * [BE-03] OWNER: backend · Session persistence and revocation repository.
 */
import crypto from "node:crypto";
import { db } from "../db";

export interface SessionRecord {
  id: string;
  userId: number;
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
  userAgent: string | null;
  ip: string | null;
}

export function createSession(
  userId: number,
  hours = 8,
  ip: string | null = null,
  userAgent: string | null = null
): string {
  const id = crypto.randomBytes(32).toString("hex");
  const now = Date.now();
  const expiresAt = now + hours * 3600_000;

  db()
    .prepare(
      `INSERT INTO sessions (id, user_id, created_at, expires_at, revoked_at, user_agent, ip)
       VALUES (?, ?, ?, ?, NULL, ?, ?)`
    )
    .run(id, userId, now, expiresAt, userAgent, ip);

  return id;
}

export function validateSession(id: string): { valid: boolean; userId?: number } {
  const row = db()
    .prepare("SELECT user_id, expires_at, revoked_at FROM sessions WHERE id = ?")
    .get(id) as { user_id: number; expires_at: number; revoked_at: number | null } | undefined;

  if (!row) return { valid: false };
  if (row.revoked_at !== null) return { valid: false };
  if (row.expires_at < Date.now()) return { valid: false };

  return { valid: true, userId: row.user_id };
}

export function revokeSession(id: string): void {
  db().prepare("UPDATE sessions SET revoked_at = ? WHERE id = ?").run(Date.now(), id);
}

export function revokeAllUserSessions(userId: number): void {
  db().prepare("UPDATE sessions SET revoked_at = ? WHERE user_id = ?").run(Date.now(), userId);
}

export function listUserSessions(userId: number): SessionRecord[] {
  const rows = db()
    .prepare("SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC")
    .all(userId) as any[];

  return rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    createdAt: r.created_at,
    expiresAt: r.expires_at,
    revokedAt: r.revoked_at,
    userAgent: r.user_agent,
    ip: r.ip,
  }));
}

export function cleanExpiredSessions(): number {
  const res = db()
    .prepare("DELETE FROM sessions WHERE expires_at < ? OR revoked_at IS NOT NULL")
    .run(Date.now());
  return res.changes;
}

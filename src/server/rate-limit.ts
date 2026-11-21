import { q, q1 } from "./db";

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_LOCK_MS = 15 * 60 * 1000; // 15 minutes lock on breach

export async function checkLoginRateLimit(key: string): Promise<{
  allowed: boolean;
  remaining: number;
  resetMs: number;
}> {
  const now = Date.now();
  const row = await q1<{
    attempts: number;
    first_attempt_at: number;
    locked_until: number | null;
  }>("SELECT attempts, first_attempt_at, locked_until FROM rate_limits WHERE key = $1", [key]);

  if (!row) {
    return { allowed: true, remaining: LOGIN_MAX_ATTEMPTS, resetMs: 0 };
  }

  const lockedUntil = row.locked_until ? Number(row.locked_until) : null;
  if (lockedUntil && now < lockedUntil) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: lockedUntil - now,
    };
  }

  const firstAttemptAt = Number(row.first_attempt_at);
  if (now - firstAttemptAt > LOGIN_WINDOW_MS) {
    // Window expired, reset
    await q("DELETE FROM rate_limits WHERE key = $1", [key]);
    return { allowed: true, remaining: LOGIN_MAX_ATTEMPTS, resetMs: 0 };
  }

  const remaining = Math.max(0, LOGIN_MAX_ATTEMPTS - row.attempts);
  const allowed = row.attempts < LOGIN_MAX_ATTEMPTS;

  return {
    allowed,
    remaining,
    resetMs: Math.max(0, firstAttemptAt + LOGIN_WINDOW_MS - now),
  };
}

export async function recordLoginFailure(key: string): Promise<void> {
  const now = Date.now();
  const row = await q1<{
    attempts: number;
    first_attempt_at: number;
  }>("SELECT attempts, first_attempt_at FROM rate_limits WHERE key = $1", [key]);

  if (!row) {
    await q(
      "INSERT INTO rate_limits (key, attempts, first_attempt_at, locked_until) VALUES ($1, 1, $2, NULL)",
      [key, now]
    );
    return;
  }

  const firstAttemptAt = Number(row.first_attempt_at);
  if (now - firstAttemptAt > LOGIN_WINDOW_MS) {
    await q(
      "UPDATE rate_limits SET attempts = 1, first_attempt_at = $1, locked_until = NULL WHERE key = $2",
      [now, key]
    );
    return;
  }

  const newAttempts = row.attempts + 1;
  const lockedUntil = newAttempts >= LOGIN_MAX_ATTEMPTS ? now + LOGIN_LOCK_MS : null;

  await q(
    "UPDATE rate_limits SET attempts = $1, locked_until = $2 WHERE key = $3",
    [newAttempts, lockedUntil, key]
  );
}

export async function resetLoginRateLimit(key: string): Promise<void> {
  await q("DELETE FROM rate_limits WHERE key = $1", [key]);
}

export async function checkGeneralRateLimit(
  key: string,
  limit = 60,
  windowMs = 60_000
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const now = Date.now();
  const row = await q1<{ attempts: number; first_attempt_at: number }>(
    `INSERT INTO rate_limits (key, attempts, first_attempt_at, locked_until)
     VALUES ($1, 1, $2, NULL)
     ON CONFLICT (key) DO UPDATE SET
       attempts = CASE
         WHEN rate_limits.first_attempt_at <= $2 - $3 THEN 1
         ELSE rate_limits.attempts + 1
       END,
       first_attempt_at = CASE
         WHEN rate_limits.first_attempt_at <= $2 - $3 THEN $2
         ELSE rate_limits.first_attempt_at
       END,
       locked_until = NULL
     RETURNING attempts, first_attempt_at`,
    [key, now, windowMs]
  );
  if (!row) throw new Error("Rate limit counter update returned no row");
  const firstAttemptAt = Number(row.first_attempt_at);
  const allowed = row.attempts <= limit;
  return {
    allowed,
    remaining: Math.max(0, limit - row.attempts),
    resetMs: Math.max(0, firstAttemptAt + windowMs - now),
  };
}

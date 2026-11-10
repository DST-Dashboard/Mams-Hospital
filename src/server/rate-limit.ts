/**
 * [BE-03] OWNER: backend · Rate limiting engine.
 * Protects against brute-force attacks on authentication endpoints.
 * Enforces: 5 login attempts / 15 min per IP/account; 100 req/min per user.
 */
import { db } from "./db";

interface MemoryLimit {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number | null;
}

const memoryStore = new Map<string, MemoryLimit>();

const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOGIN_LOCK_MS = 15 * 60 * 1000; // 15 minutes lock on breach

export function checkLoginRateLimit(key: string): {
  allowed: boolean;
  remaining: number;
  resetMs: number;
} {
  const now = Date.now();
  let entry = memoryStore.get(key);

  // Fallback to SQLite DB if not in memory
  if (!entry) {
    try {
      const row = db()
        .prepare("SELECT attempts, first_attempt_at, locked_until FROM rate_limits WHERE key = ?")
        .get(key) as
        | { attempts: number; first_attempt_at: number; locked_until: number | null }
        | undefined;
      if (row) {
        entry = {
          attempts: row.attempts,
          firstAttemptAt: row.first_attempt_at,
          lockedUntil: row.locked_until,
        };
        memoryStore.set(key, entry);
      }
    } catch {
      // Table might not exist or error, continue with in-memory
    }
  }

  if (!entry) {
    return { allowed: true, remaining: LOGIN_MAX_ATTEMPTS, resetMs: 0 };
  }

  // Check if locked
  if (entry.lockedUntil && entry.lockedUntil > now) {
    return {
      allowed: false,
      remaining: 0,
      resetMs: entry.lockedUntil - now,
    };
  }

  // Check if window expired
  if (now - entry.firstAttemptAt > LOGIN_WINDOW_MS) {
    memoryStore.delete(key);
    try {
      db().prepare("DELETE FROM rate_limits WHERE key = ?").run(key);
    } catch {
      // ignore
    }
    return { allowed: true, remaining: LOGIN_MAX_ATTEMPTS, resetMs: 0 };
  }

  const remaining = Math.max(0, LOGIN_MAX_ATTEMPTS - entry.attempts);
  const allowed = entry.attempts < LOGIN_MAX_ATTEMPTS;

  return {
    allowed,
    remaining,
    resetMs: Math.max(0, entry.firstAttemptAt + LOGIN_WINDOW_MS - now),
  };
}

export function recordLoginFailure(key: string): void {
  const now = Date.now();
  let entry = memoryStore.get(key);

  if (!entry || now - entry.firstAttemptAt > LOGIN_WINDOW_MS) {
    entry = { attempts: 1, firstAttemptAt: now, lockedUntil: null };
  } else {
    entry.attempts++;
    if (entry.attempts >= LOGIN_MAX_ATTEMPTS) {
      entry.lockedUntil = now + LOGIN_LOCK_MS;
    }
  }

  memoryStore.set(key, entry);

  try {
    db()
      .prepare(
        `INSERT INTO rate_limits (key, attempts, first_attempt_at, locked_until)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           attempts = excluded.attempts,
           first_attempt_at = excluded.first_attempt_at,
           locked_until = excluded.locked_until`
      )
      .run(key, entry.attempts, entry.firstAttemptAt, entry.lockedUntil);
  } catch {
    // ignore DB errors for memory rate limiting
  }
}

export function resetLoginRateLimit(key: string): void {
  memoryStore.delete(key);
  try {
    db().prepare("DELETE FROM rate_limits WHERE key = ?").run(key);
  } catch {
    // ignore
  }
}

/**
 * General window-based rate limiter (e.g. 100 requests per minute)
 */
const generalLimits = new Map<string, { count: number; resetAt: number }>();

export function checkGeneralRateLimit(
  key: string,
  maxRequests = 100,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = generalLimits.get(key);

  if (!entry || now > entry.resetAt) {
    generalLimits.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: maxRequests - entry.count };
}

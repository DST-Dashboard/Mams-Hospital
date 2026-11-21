import crypto from "node:crypto";
import { env } from "./env";

/** Keys shorter than this are ignored: a weak key must never silently protect a public endpoint. */
export const MIN_INGEST_KEY_LENGTH = 32;

export type IngestAuthResult = "ok" | "disabled" | "missing" | "invalid";

const digest = (s: string) => crypto.createHash("sha256").update(s, "utf8").digest();

/** `INGEST_API_KEY` may hold several comma-separated keys so a key can be rotated without downtime. */
export function configuredIngestKeys(): string[] {
  const raw = env().INGEST_API_KEY;
  if (!raw) return [];
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length >= MIN_INGEST_KEY_LENGTH);
}

/** `X-API-Key: <key>` or `Authorization: Bearer <key>`. Never read from the URL (URLs end up in logs). */
export function extractApiKey(req: Request): string | null {
  const header = req.headers.get("x-api-key")?.trim();
  if (header) return header;
  const bearer = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
  return bearer?.[1]?.trim() || null;
}

/**
 * Constant-time check. Both sides are hashed to equal length first (no length leak) and every
 * configured key is compared without early exit (no timing signal about which key matched).
 */
export function checkIngestKey(req: Request): IngestAuthResult {
  const keys = configuredIngestKeys();
  if (keys.length === 0) return "disabled";
  const provided = extractApiKey(req);
  if (!provided) return "missing";
  const providedHash = digest(provided);
  let matched = false;
  for (const key of keys) {
    if (crypto.timingSafeEqual(providedHash, digest(key))) matched = true;
  }
  return matched ? "ok" : "invalid";
}

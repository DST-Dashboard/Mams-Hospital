import crypto from "node:crypto";
import { env } from "@/server/env";
import { fail, handle, ok } from "@/server/http";
import { ingestUplink, NormalizeError, UnknownIngestDeviceError } from "@/server/services/ingest";
import { checkGeneralRateLimit } from "@/server/rate-limit";
import { declaredBodyExceedsLimit, readBodyLimited, RequestBodyTooLargeError } from "@/server/read-body";

const MAX_BODY_BYTES = 1_048_576;
/**
 * The Things Stack webhook receiver (Phase 2 "go live"). Disabled until TTS_WEBHOOK_SECRET is set.
 * Configure TTS → Integrations → Webhooks → header `X-Webhook-Secret: <secret>` → POST <host>/api/ingest/tts
 * Idempotent: duplicate (device, time) pairs are ignored, so TTS retries and backfills are safe.
 */
const safeEq = (a: string, b: string) => {
  const actual = Buffer.from(a, "utf8");
  const expected = Buffer.from(b, "utf8");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

export const POST = handle(async (req: Request) => {
  const remote = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (!checkGeneralRateLimit(`tts-ingest:${remote}`, 300).allowed) return fail(429, "Too many ingest requests");
  if (!req.headers.get("content-type")?.toLowerCase().includes("application/json")) return fail(415, "Content-Type must be application/json");
  if (declaredBodyExceedsLimit(req, MAX_BODY_BYTES)) return fail(413, "Ingest payload exceeds 1 MiB");
  const secret = env().TTS_WEBHOOK_SECRET;
  if (!secret) return fail(503, "Live ingest is not enabled (set TTS_WEBHOOK_SECRET)");
  if (!safeEq(req.headers.get("x-webhook-secret") ?? "", secret)) return fail(401, "Bad webhook secret");

  let raw: unknown;
  try {
    raw = JSON.parse(await readBodyLimited(req, MAX_BODY_BYTES)) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) return fail(413, "Ingest payload exceeds 1 MiB");
    throw error;
  }
  try {
    return ok({ inserted: ingestUplink(raw) });
  } catch (error) {
    if (error instanceof NormalizeError) return fail(422, error.message);
    if (error instanceof UnknownIngestDeviceError) return fail(422, error.message);
    throw error;
  }
});

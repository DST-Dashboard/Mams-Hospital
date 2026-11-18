import crypto from "node:crypto";
import { env } from "@/server/env";
import { fail, handle, ok } from "@/server/http";
import {
  ingestUplink,
  logIngestReject,
  NormalizeError,
  UnknownIngestDeviceError,
} from "@/server/services/ingest";
import { readBodyLimited, RequestBodyTooLargeError } from "@/server/read-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

const MAX_BODY_BYTES = 1_048_576;

const safeEq = (a: string, b: string) => {
  const actual = Buffer.from(a, "utf8");
  const expected = Buffer.from(b, "utf8");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
};

export const POST = handle(async (req: Request) => {
  const remote =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";

  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    await logIngestReject("Invalid content type: expected application/json", null, remote);
    return fail(415, "Content-Type must be application/json");
  }

  const secret = env().TTS_WEBHOOK_SECRET;
  if (!secret) return fail(503, "Live ingest is not enabled (set TTS_WEBHOOK_SECRET)");

  const url = new URL(req.url);
  const headerSecret =
    req.headers.get("x-webhook-secret") ??
    req.headers.get("x-downlink-apikey") ??
    req.headers.get("x-tts-secret") ??
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    url.searchParams.get("secret") ??
    url.searchParams.get("key") ??
    "";
  if (!safeEq(headerSecret, secret)) {
    await logIngestReject("Invalid or missing webhook secret", null, remote);
    return fail(401, "Bad webhook secret");
  }

  let raw: unknown;
  try {
    const bodyStr = await readBodyLimited(req, MAX_BODY_BYTES);
    raw = JSON.parse(bodyStr) as unknown;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      await logIngestReject("Payload exceeds 1 MiB", null, remote);
      return fail(413, "Ingest payload exceeds 1 MiB");
    }
    await logIngestReject("Malformed JSON payload", null, remote);
    return fail(400, "Malformed JSON in request body");
  }

  try {
    const inserted = await ingestUplink(raw, remote);
    return ok({ inserted });
  } catch (error) {
    if (error instanceof NormalizeError) return fail(422, error.message);
    if (error instanceof UnknownIngestDeviceError) return fail(422, error.message);
    throw error;
  }
});

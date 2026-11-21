import { checkIngestKey } from "@/server/ingest-auth";
import { fail, handle, ok } from "@/server/http";
import { IngestValidationError, ingestReadings } from "@/server/services/ingest";
import { listTanks } from "@/server/repos/tanks";
import { readBodyLimited, RequestBodyTooLargeError } from "@/server/read-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

const MAX_BODY_BYTES = 256 * 1024;

/** Public route (no login cookie): the API key IS the authentication. Returns a response to stop, or null to continue. */
function denyUnlessAuthorized(req: Request): Response | null {
  const auth = checkIngestKey(req);
  if (auth === "ok") return null;
  if (auth === "disabled") {
    return fail(503, "Data ingest is not enabled on this server (INGEST_API_KEY is not set)");
  }
  const res = fail(
    401,
    auth === "missing"
      ? "API key required: send it in the X-API-Key header"
      : "Invalid API key"
  );
  res.headers.set("WWW-Authenticate", 'ApiKey realm="ohtms-ingest"');
  return res;
}

const clientIp = (req: Request) =>
  req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

/**
 * Connectivity check for whoever is integrating: confirms the key works and lists the
 * `deviceId` values that are accepted. Stores nothing.
 */
export const GET = handle(async (req: Request) => {
  const denied = denyUnlessAuthorized(req);
  if (denied) return denied;

  const tanks = await listTanks();
  return ok({
    ok: true,
    acceptedDevices: tanks
      .filter((t) => t.deviceId && t.status !== "decommissioned")
      .map((t) => ({
        tankId: t.id,
        deviceId: t.deviceId,
        label: t.label,
        status: t.status,
        lastReadingAt: t.lastReadingAt ?? null,
      })),
  });
});

/** Push one reading, an array of readings, or { "readings": [...] } (max 100). */
export const POST = handle(async (req: Request) => {
  const denied = denyUnlessAuthorized(req);
  if (denied) return denied;

  const contentType = req.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return fail(415, "Content-Type must be application/json");
  }

  let body: unknown;
  try {
    body = JSON.parse(await readBodyLimited(req, MAX_BODY_BYTES));
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) return fail(413, "Payload exceeds 256 KiB");
    return fail(400, "Malformed JSON in request body");
  }

  try {
    const result = await ingestReadings(body, clientIp(req));
    return ok({ ok: true, ...result }, { status: result.inserted > 0 ? 201 : 200 });
  } catch (err) {
    if (err instanceof IngestValidationError) {
      return fail(422, "Payload rejected; nothing was stored", err.issues);
    }
    throw err;
  }
});

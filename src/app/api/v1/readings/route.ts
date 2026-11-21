import { z } from "zod";
import { handle, ok, fail } from "@/server/http";
import { authenticateApiKey } from "@/server/repos/api-keys";
import { getTank, getTankByDeviceId } from "@/server/repos/tanks";
import { upsertManyWithResults } from "@/server/repos/readings";
import { evaluateTank } from "@/server/services/alert-engine";
import { checkGeneralRateLimit } from "@/server/rate-limit";
import { derive } from "@/domain";
import { readBodyLimited, RequestBodyTooLargeError } from "@/server/read-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

const MAX_BODY_BYTES = 1_048_576; // 1 MiB

const SingleReadingSchema = z.object({
  tankId: z.coerce.number().int().positive().optional(),
  deviceId: z.string().trim().min(1).optional(),
  distanceCm: z.coerce.number().int().min(0, "distanceCm must be >= 0").max(5000, "distanceCm exceeds maximum"),
  batteryPct: z.coerce.number().int().min(0).max(100).optional().nullable(),
  t: z.coerce.number().int().positive().optional(),
  rssi: z.coerce.number().int().optional().nullable(),
  snr: z.coerce.number().optional().nullable(),
  fCnt: z.coerce.number().int().optional().nullable(),
  gatewayId: z.string().trim().optional().nullable(),
}).refine(
  (data) => data.tankId != null || data.deviceId != null,
  { message: "Either tankId or deviceId is required" }
);

const ReadingPayloadSchema = z.union([
  SingleReadingSchema,
  z.array(SingleReadingSchema).min(1, "Array must not be empty").max(100, "Maximum 100 readings per batch"),
]);

export const POST = handle(async (req: Request) => {
  // 1. API key extraction
  const rawKey =
    req.headers.get("x-api-key") ??
    (req.headers.get("authorization")?.startsWith("Bearer ")
      ? req.headers.get("authorization")?.slice(7).trim()
      : null);

  if (!rawKey) {
    return fail(401, "API key required in X-API-Key or Authorization header");
  }

  // 2. Authenticate API key
  const keyAuth = await authenticateApiKey(rawKey);
  if (!keyAuth) {
    return fail(401, "Invalid, expired, or revoked API key");
  }
  if (keyAuth.role === "viewer") {
    return fail(403, "API key role does not permit data ingestion");
  }

  // 3. Rate limiting (120 req / minute per API key)
  const rateKey = `ratelimit:api-key:${keyAuth.id}`;
  const rate = await checkGeneralRateLimit(rateKey, 120, 60_000);
  if (!rate.allowed) {
    return fail(429, "Rate limit exceeded. Try again in " + Math.ceil(rate.resetMs / 1000) + " seconds");
  }

  // 4. Parse JSON body with size limits
  let bodyJson: unknown;
  try {
    const rawBody = await readBodyLimited(req, MAX_BODY_BYTES);
    bodyJson = JSON.parse(rawBody);
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return fail(413, "Payload exceeds 1 MiB size limit");
    }
    return fail(400, "Malformed JSON request body");
  }

  const parseResult = ReadingPayloadSchema.safeParse(bodyJson);
  if (!parseResult.success) {
    return fail(
      400,
      "Validation failed",
      parseResult.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
    );
  }

  const items = Array.isArray(parseResult.data) ? parseResult.data : [parseResult.data];
  const nowMs = Date.now();
  const maxFutureMs = nowMs + 5 * 60_000;
  const maxPastMs = nowMs - 365 * 24 * 60 * 60_000;

  const results = [];
  type ResolvedTank = NonNullable<Awaited<ReturnType<typeof getTank>>>;
  const tanksToEvaluate = new Map<number, { tank: ResolvedTank; latestT: number }>();
  const insertRows: Parameters<typeof upsertManyWithResults>[0] = [];

  for (const item of items) {
    // Resolve tank
    const tank = item.tankId != null
      ? await getTank(item.tankId)
      : item.deviceId != null
      ? await getTankByDeviceId(item.deviceId)
      : null;

    if (!tank || tank.deletedAt != null || !tank.deviceId) {
      return fail(404, `Tank not found for tankId: ${item.tankId ?? "none"}, deviceId: ${item.deviceId ?? "none"}`);
    }

    // Tank-level permission check on API key
    if (keyAuth.tankId != null && keyAuth.tankId !== tank.id) {
      return fail(403, `API key is not authorized for tank ${tank.id}`);
    }

    const t = item.t ?? nowMs;
    if (t > maxFutureMs) {
      return fail(400, "Timestamp cannot be in the future");
    }
    if (t < maxPastMs) {
      return fail(400, "Timestamp is too far in the past (> 1 year)");
    }

    insertRows.push({
      deviceId: tank.deviceId,
      t,
      distanceCm: item.distanceCm,
      fCnt: item.fCnt ?? null,
      rssi: item.rssi ?? null,
      snr: item.snr ?? null,
      batteryPct: item.batteryPct ?? null,
      gatewayId: item.gatewayId ?? null,
      source: "API",
    });

    const d = derive(item.distanceCm, tank.geometry);

    results.push({
      tankId: tank.id,
      deviceId: tank.deviceId,
      t,
      distanceCm: item.distanceCm,
      levelCm: d.levelCm,
      levelPct: d.levelPct,
      volumeL: d.volumeL,
      quality: d.quality,
      source: "API",
      inserted: true,
    });

    const existing = tanksToEvaluate.get(tank.id);
    if (!existing || existing.latestT < t) {
      tanksToEvaluate.set(tank.id, { tank, latestT: t });
    }
  }

  const insertedRows = await upsertManyWithResults(insertRows);
  results.forEach((result, index) => {
    result.inserted = insertedRows[index] ?? false;
  });

  // Trigger alert evaluations asynchronously
  for (const { tank, latestT } of tanksToEvaluate.values()) {
    evaluateTank(tank, latestT).catch(() => {});
  }

  if (results.length === 1) {
    return ok({
      ok: true,
      ...results[0],
    });
  }

  return ok({
    ok: true,
    count: results.length,
    readings: results,
  });
});

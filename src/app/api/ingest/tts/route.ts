import crypto from "node:crypto";
import { env } from "@/server/env";
import { fail, handle, ok } from "@/server/http";
import { upsertMany } from "@/server/repos/readings";
import { evaluateAll } from "@/server/services/alert-engine";
import { normalizeUplink } from "@/dataset/normalize";
import { listTanks } from "@/server/repos/tanks";

/**
 * The Things Stack webhook receiver (Phase 2 "go live"). Disabled until TTS_WEBHOOK_SECRET is set.
 * Configure TTS → Integrations → Webhooks → header `X-Webhook-Secret: <secret>` → POST <host>/api/ingest/tts
 * Idempotent: duplicate (device, time) pairs are ignored, so TTS retries and backfills are safe.
 */
const safeEq = (a: string, b: string) => a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

export const POST = handle(async (req: Request) => {
  const secret = env().TTS_WEBHOOK_SECRET;
  if (!secret) return fail(503, "Live ingest is not enabled (set TTS_WEBHOOK_SECRET)");
  if (!safeEq(req.headers.get("x-webhook-secret") ?? "", secret)) return fail(401, "Bad webhook secret");

  const { reading: r } = normalizeUplink(await req.json());
  if (!listTanks({ includeDeleted: true }).some((t) => t.deviceId === r.deviceId)) return fail(422, `Unknown device ${r.deviceId} — add it under Admin → Nodes first`);
  const inserted = upsertMany([{ deviceId: r.deviceId, t: r.t, distanceCm: r.distanceCm, fCnt: r.fCnt, rssi: r.rssi, snr: r.snr, batteryPct: r.batteryPct }]);
  if (inserted) evaluateAll();
  return ok({ inserted });
});

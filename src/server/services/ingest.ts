import { z } from "zod";
import { derive } from "@/domain";
import { now } from "../clock";
import { q } from "../db";
import { logger } from "../logger";
import { markReal } from "../repos/devices";
import { upsertManyWithResults, type InsertReading } from "../repos/readings";
import { getTank, getTankByDeviceId, type TankRow } from "../repos/tanks";
import { evaluateTank } from "./alert-engine";

/** Largest batch accepted in one request. Providers pushing live data normally send 1. */
export const MAX_BATCH = 100;
const MAX_FUTURE_MS = 5 * 60_000;
const MAX_AGE_MS = 365 * 24 * 3600_000;
/** Anything below this cannot be a millisecond epoch of a modern date, so it is treated as seconds. */
const SECONDS_CUTOFF = 1e11;

export interface IngestIssue {
  index: number;
  message: string;
}

/** The request was understood but its content is not acceptable. Nothing was stored. */
export class IngestValidationError extends Error {
  constructor(public readonly issues: IngestIssue[]) {
    super("Ingest payload rejected");
    this.name = "IngestValidationError";
  }
}

/** Accept numbers and numeric strings ("231"), since many data platforms template everything as text. */
const num = (min: number, max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : v),
    z.number().min(min).max(max)
  );

const ReadingItem = z
  .object({
    deviceId: z.string().trim().min(1).max(100).optional(),
    tankId: num(1, 2_147_483_647).optional(),
    distanceCm: num(0, 5000).optional(),
    levelCm: num(0, 5000).optional(),
    t: z.union([z.number(), z.string()]).optional(),
    batteryPct: num(0, 100).nullable().optional(),
    rssi: num(-200, 20).nullable().optional(),
    snr: num(-60, 60).nullable().optional(),
    fCnt: num(0, 2_147_483_647).nullable().optional(),
    gatewayId: z.string().trim().max(100).nullable().optional(),
  })
  .refine((v) => v.deviceId !== undefined || v.tankId !== undefined, {
    message: "Provide deviceId (or tankId) to say which tank this reading belongs to",
    path: ["deviceId"],
  })
  .refine((v) => v.distanceCm !== undefined || v.levelCm !== undefined, {
    message: "Provide distanceCm (sensor-to-water distance) or levelCm (water height)",
    path: ["distanceCm"],
  });

type ReadingItemInput = z.infer<typeof ReadingItem>;

/** One reading, a JSON array of readings, or `{ "readings": [...] }`. */
export function extractItems(body: unknown): unknown[] | null {
  if (Array.isArray(body)) return body;
  if (body && typeof body === "object") {
    const wrapped = (body as { readings?: unknown }).readings;
    return Array.isArray(wrapped) ? wrapped : [body];
  }
  return null;
}

/** Epoch milliseconds, epoch seconds, or an ISO-8601 string. Missing = the moment we received it. */
export function resolveTimestamp(value: number | string | undefined, receivedAt: number): number | null {
  if (value === undefined) return receivedAt;
  let ms: number;
  if (typeof value === "number") ms = value;
  else if (value.trim() !== "" && Number.isFinite(Number(value))) ms = Number(value);
  else ms = Date.parse(value);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  if (ms < SECONDS_CUTOFF) ms *= 1000;
  return Math.round(ms);
}

export async function logIngestReject(reason: string, payload: unknown, ip?: string): Promise<void> {
  try {
    let stored: unknown = null;
    if (payload !== undefined && payload !== null) {
      const json = JSON.stringify(payload);
      stored = json.length > 4000 ? { truncated: true, preview: json.slice(0, 4000) } : payload;
    }
    await q("INSERT INTO ingest_rejects (t, reason, payload, source_ip) VALUES ($1, $2, $3, $4)", [
      Date.now(),
      reason.slice(0, 500),
      stored === null ? null : JSON.stringify(stored),
      ip ?? null,
    ]);
  } catch (err) {
    logger.warn("Unable to record rejected ingest payload", {
      reason: err instanceof Error ? err.message : String(err),
    });
  }
}

export interface IngestedReading {
  index: number;
  tankId: number;
  deviceId: string;
  t: number;
  distanceCm: number;
  levelCm: number | null;
  levelPct: number | null;
  volumeL: number | null;
  quality: string;
  status: "inserted" | "duplicate";
}

export interface IngestResult {
  received: number;
  inserted: number;
  duplicates: number;
  results: IngestedReading[];
}

/**
 * Validates EVERY reading first, then stores them in one transaction: a bad item rejects the
 * whole request (nothing half-saved), so the sender can simply fix it and resend. Re-sending
 * readings that were already stored is harmless; they are reported as `duplicate`.
 */
export async function ingestReadings(body: unknown, sourceIp?: string): Promise<IngestResult> {
  const items = extractItems(body);
  if (!items || items.length === 0) {
    const issues = [{ index: 0, message: "Send a reading object, an array of readings, or { \"readings\": [...] }" }];
    await logIngestReject(issues[0]!.message, body, sourceIp);
    throw new IngestValidationError(issues);
  }
  if (items.length > MAX_BATCH) {
    const issues = [{ index: 0, message: `At most ${MAX_BATCH} readings per request (received ${items.length})` }];
    await logIngestReject(issues[0]!.message, { count: items.length }, sourceIp);
    throw new IngestValidationError(issues);
  }

  const receivedAt = now();
  const issues: IngestIssue[] = [];
  const tankCache = new Map<string, TankRow | null>();
  const resolveTank = async (item: ReadingItemInput): Promise<TankRow | null> => {
    const key = item.tankId !== undefined ? `id:${item.tankId}` : `dev:${item.deviceId}`;
    if (!tankCache.has(key)) {
      const found =
        item.tankId !== undefined ? await getTank(item.tankId) : await getTankByDeviceId(item.deviceId!);
      tankCache.set(key, found && found.deletedAt == null && found.deviceId ? found : null);
    }
    return tankCache.get(key) ?? null;
  };

  const rows: InsertReading[] = [];
  const meta: { index: number; tank: TankRow; derivedFrom: number; t: number }[] = [];

  for (let index = 0; index < items.length; index++) {
    const parsed = ReadingItem.safeParse(items[index]);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path.join(".");
        issues.push({ index, message: field ? `${field}: ${issue.message}` : issue.message });
      }
      continue;
    }
    const item = parsed.data;

    const tank = await resolveTank(item);
    if (!tank) {
      issues.push({
        index,
        message:
          item.tankId !== undefined
            ? `Unknown tankId ${item.tankId}`
            : `Unknown deviceId "${item.deviceId}" (it must match a registered tank's device)`,
      });
      continue;
    }
    if (item.deviceId !== undefined && item.tankId !== undefined && item.deviceId !== tank.deviceId) {
      issues.push({ index, message: `deviceId "${item.deviceId}" does not belong to tankId ${tank.id}` });
      continue;
    }

    const t = resolveTimestamp(item.t, receivedAt);
    if (t === null) {
      issues.push({ index, message: "t: use epoch milliseconds, epoch seconds, or an ISO-8601 time like 2026-11-21T10:30:00Z" });
      continue;
    }
    if (t > receivedAt + MAX_FUTURE_MS) {
      issues.push({ index, message: "t: timestamp is in the future" });
      continue;
    }
    if (t < receivedAt - MAX_AGE_MS) {
      issues.push({ index, message: "t: timestamp is more than a year old" });
      continue;
    }

    let distanceCm: number;
    if (item.distanceCm !== undefined) {
      distanceCm = Math.round(item.distanceCm);
    } else {
      if (item.levelCm! > tank.geometry.heightCm) {
        issues.push({
          index,
          message: `levelCm: ${item.levelCm} is higher than the tank (${tank.geometry.heightCm} cm)`,
        });
        continue;
      }
      distanceCm = Math.round(tank.geometry.heightCm - item.levelCm!);
    }

    rows.push({
      deviceId: tank.deviceId!,
      t,
      distanceCm,
      fCnt: item.fCnt != null ? Math.round(item.fCnt) : null,
      rssi: item.rssi != null ? Math.round(item.rssi) : null,
      snr: item.snr ?? null,
      batteryPct: item.batteryPct != null ? Math.round(item.batteryPct) : null,
      gatewayId: item.gatewayId ?? null,
      source: "api",
    });
    meta.push({ index, tank, derivedFrom: distanceCm, t });
  }

  if (issues.length > 0) {
    await logIngestReject(`Validation failed: ${issues.length} problem(s), first: ${issues[0]!.message}`, body, sourceIp);
    throw new IngestValidationError(issues);
  }

  const stored = await upsertManyWithResults(rows);

  // Tanks that received at least one NEW reading
  const touched = new Map<number, TankRow>();
  stored.forEach((isNew, i) => {
    if (isNew) touched.set(meta[i]!.tank.id, meta[i]!.tank);
  });

  for (const tank of touched.values()) {
    try {
      // A real reading arrived: a node that was flagged simulated is now live.
      await markReal(tank.deviceId!);
      const fresh = (await getTank(tank.id)) ?? tank;
      await evaluateTank(fresh, now());
    } catch (err) {
      // The readings are already safely stored; alert evaluation also re-runs on the periodic tick.
      logger.warn("Alert evaluation after ingest failed", {
        tankId: tank.id,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const results: IngestedReading[] = meta.map((m, i) => {
    const d = derive(m.derivedFrom, m.tank.geometry);
    return {
      index: m.index,
      tankId: m.tank.id,
      deviceId: m.tank.deviceId!,
      t: m.t,
      distanceCm: m.derivedFrom,
      levelCm: d.levelCm,
      levelPct: d.levelPct,
      volumeL: d.volumeL,
      quality: d.quality,
      status: stored[i] ? "inserted" : "duplicate",
    };
  });
  const inserted = results.filter((r) => r.status === "inserted").length;

  return { received: results.length, inserted, duplicates: results.length - inserted, results };
}

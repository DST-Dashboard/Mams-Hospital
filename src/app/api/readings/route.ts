import { z } from "zod";
import { derive, DAY, resolutionFor, RES_MS } from "@/domain";
import { rollup } from "@/analytics";
import { requireRole } from "@/server/auth/guard";
import { now } from "@/server/clock";
import { fail, handle, ok } from "@/server/http";
import { q1 } from "@/server/db";
import { audit } from "@/server/repos/audit";
import * as readings from "@/server/repos/readings";
import {
  getTank,
  canUserSubmitManualReading,
  listAuthorizedTanksForUser,
} from "@/server/repos/tanks";
import { evaluateTank } from "@/server/services/alert-engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const Q = z.object({
  tankId: z.coerce.number().int().positive().optional(),
  from: z.coerce.number().optional(),
  to: z.coerce.number().optional(),
  res: z.enum(["auto", "raw", "15m", "1h", "1d"]).default("auto"),
  action: z.string().optional(),
});

/** Points carry BOTH the raw distance and derived values; null = no data (never 0). */
export const GET = handle(async (req: Request) => {
  const url = new URL(req.url);
  const qParams = Q.parse(Object.fromEntries(url.searchParams));

  if (qParams.action === "authorized-tanks") {
    const session = await requireRole("viewer");
    const authorizedTanks = await listAuthorizedTanksForUser(session.uid, session.role);
    return ok({
      tanks: authorizedTanks.map((t) => ({
        id: t.id,
        label: t.label,
        deviceId: t.deviceId,
        location: t.location,
        zone: t.zone,
        status: t.status,
        geometry: t.geometry,
      })),
    });
  }

  if (!qParams.tankId) {
    return fail(400, "Missing required parameter: tankId");
  }

  await requireRole("viewer");
  const tank = await getTank(qParams.tankId);
  if (!tank?.deviceId) return fail(404, "Tank not found or has no device");
  const to = qParams.to ?? now();
  const from = qParams.from ?? to - DAY;
  if (from >= to) return fail(400, "`from` must be before `to`");
  const res = qParams.res === "auto" ? resolutionFor(from, to) : qParams.res;
  const rows = await readings.range(tank.deviceId, from, to);
  const src =
    res === "raw"
      ? rows.map((r) => ({ t: r.t, distanceCm: r.distanceCm, source: r.source ?? "manual", userId: r.userId }))
      : rollup(rows, RES_MS[res]).map((b) => ({ t: b.t, distanceCm: b.distanceCm, source: "rollup" }));
  const points = src.map((p) => {
    const d = derive(p.distanceCm, tank.geometry);
    return {
      t: p.t,
      distanceCm: p.distanceCm,
      levelCm: d.levelCm,
      levelPct: d.levelPct,
      volumeL: d.volumeL,
      quality: d.quality,
      source: (p as { source?: string }).source ?? "manual",
      userId: (p as { userId?: number | null }).userId ?? null,
    };
  });
  return ok({
    tankId: tank.id,
    resolution: res,
    from,
    to,
    simulated: tank.simulated,
    dimsConfirmed: tank.dimsConfirmed,
    count: points.length,
    points,
  });
});

const ManualReadingInput = z
  .object({
    tankId: z.coerce.number().int().positive(),
    t: z.coerce.number().int().positive().optional(),
    distanceCm: z.coerce.number().min(0).max(3000).optional(),
    levelCm: z.coerce.number().min(0).max(3000).optional(),
    batteryPct: z.coerce.number().min(0).max(100).nullable().optional(),
    rssi: z.coerce.number().min(-150).max(0).nullable().optional(),
    snr: z.coerce.number().min(-50).max(50).nullable().optional(),
    notes: z.string().max(500).optional(),
  })
  .refine((data) => data.distanceCm !== undefined || data.levelCm !== undefined, {
    message: "Either distanceCm or levelCm must be provided",
    path: ["distanceCm"],
  });

export const POST = handle(async (req: Request) => {
  const session = await requireRole("operator");
  const body = ManualReadingInput.parse(await req.json());

  // 1. Ownership & Permission check
  const isAuthorized = await canUserSubmitManualReading(session.uid, session.role, body.tankId);
  if (!isAuthorized) {
    return fail(
      403,
      "You are not authorized to enter manual data for this tank. Only administrators and assigned tank owners can submit manual entries."
    );
  }

  // 2. Tank existence
  const tank = await getTank(body.tankId);
  if (!tank || tank.deletedAt != null) {
    return fail(404, "Tank not found");
  }
  if (!tank.deviceId) {
    return fail(400, "Tank has no associated device");
  }

  // 3. Timestamp calculation & validation
  const t = body.t ?? now();
  if (t > now() + 60_000) {
    return fail(400, "Reading timestamp cannot be in the future");
  }

  // 4. Preserve historical data & non-overwriting (Requirement 5)
  const existing = await q1<{ device_id: string }>(
    "SELECT device_id FROM readings WHERE device_id = $1 AND t = $2",
    [tank.deviceId, t]
  );
  if (existing) {
    return fail(
      409,
      "A reading already exists for this tank at the specified timestamp. Existing readings cannot be overwritten."
    );
  }

  // 5. Calculate & validate distanceCm vs levelCm
  let distanceCm: number;
  let levelCm: number;
  if (body.distanceCm !== undefined) {
    distanceCm = body.distanceCm;
    if (distanceCm > tank.geometry.heightCm) {
      return fail(
        400,
        `Distance (${distanceCm} cm) cannot exceed tank height (${tank.geometry.heightCm} cm)`
      );
    }
    levelCm = tank.geometry.heightCm - distanceCm;
  } else {
    levelCm = body.levelCm!;
    if (levelCm > tank.geometry.heightCm) {
      return fail(
        400,
        `Level (${levelCm} cm) cannot exceed tank height (${tank.geometry.heightCm} cm)`
      );
    }
    distanceCm = tank.geometry.heightCm - levelCm;
  }

  const roundedDistance = Math.round(distanceCm);

  // 6. Save reading with source: 'manual' and recorded userId (Requirement 5)
  const inserted = await readings.upsertMany([
    {
      deviceId: tank.deviceId,
      t,
      distanceCm: roundedDistance,
      fCnt: null,
      rssi: body.rssi ?? null,
      snr: body.snr ?? null,
      batteryPct: body.batteryPct ?? null,
      gatewayId: "manual-entry",
      source: "manual",
      userId: session.uid,
    },
  ]);

  if (inserted === 0) {
    return fail(409, "Failed to insert reading: record conflict at this timestamp");
  }

  // 7. Domain derivation & alert evaluation (Requirement 7)
  const d = derive(roundedDistance, tank.geometry);
  await evaluateTank(tank, t);

  // 8. Audit logging (Requirement 8)
  await audit({
    userId: session.uid,
    action: "reading.manual_create",
    entity: "reading",
    entityId: `${tank.id}:${t}`,
    after: {
      tankId: tank.id,
      deviceId: tank.deviceId,
      t,
      distanceCm: roundedDistance,
      levelCm: d.levelCm,
      levelPct: d.levelPct,
      volumeL: d.volumeL,
      batteryPct: body.batteryPct ?? null,
      rssi: body.rssi ?? null,
      snr: body.snr ?? null,
      notes: body.notes ?? null,
      source: "manual",
      userId: session.uid,
    },
  });

  return ok(
    {
      ok: true,
      reading: {
        tankId: tank.id,
        deviceId: tank.deviceId,
        t,
        distanceCm: roundedDistance,
        levelCm: d.levelCm,
        levelPct: d.levelPct,
        volumeL: d.volumeL,
        quality: d.quality,
        source: "manual",
        userId: session.uid,
      },
    },
    { status: 201 }
  );
});

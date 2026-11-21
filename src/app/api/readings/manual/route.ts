import { z } from "zod";
import { handle, ok, fail } from "@/server/http";
import { currentSession } from "@/server/auth/guard";
import { isUserPermittedForTank } from "@/server/repos/tank-assignments";
import { getTank, listTanks } from "@/server/repos/tanks";
import { upsertMany } from "@/server/repos/readings";
import { evaluateTank } from "@/server/services/alert-engine";
import { audit } from "@/server/repos/audit";
import { derive } from "@/domain";
import { readBodyLimited, RequestBodyTooLargeError } from "@/server/read-body";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ManualReadingSchema = z.object({
  tankId: z.coerce.number().int().positive("tankId must be a positive integer"),
  distanceCm: z.coerce.number().int().min(0, "distanceCm must be >= 0").max(5000, "distanceCm exceeds maximum"),
  batteryPct: z.coerce.number().int().min(0).max(100).optional().nullable(),
  t: z.coerce.number().int().positive().optional(), // epoch ms
  notes: z.string().max(255).optional(),
});

export const GET = handle(async () => {
  const session = await currentSession();
  if (!session) {
    return fail(401, "Not signed in");
  }

  if (session.role === "viewer") {
    return ok({
      permittedTanks: [],
      canSubmit: false,
      role: session.role,
    });
  }

  const allTanks = await listTanks();
  const permitted = [];

  for (const tank of allTanks) {
    if (session.role === "admin" || (await isUserPermittedForTank(session.uid, tank.id))) {
      permitted.push({
        id: tank.id,
        label: tank.label,
        deviceId: tank.deviceId,
        heightCm: tank.geometry.heightCm,
        deadZoneCm: tank.geometry.deadZoneCm,
        status: tank.status,
      });
    }
  }

  return ok({
    permittedTanks: permitted,
    canSubmit: permitted.length > 0,
    role: session.role,
  });
});

export const POST = handle(async (req: Request) => {
  const session = await currentSession();
  if (!session) {
    return fail(401, "Not signed in");
  }

  // Parse JSON
  let bodyJson: unknown;
  try {
    const rawBody = await readBodyLimited(req, 65536);
    bodyJson = JSON.parse(rawBody);
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return fail(413, "Payload exceeds size limit");
    }
    return fail(400, "Malformed JSON request body");
  }

  const parseResult = ManualReadingSchema.safeParse(bodyJson);
  if (!parseResult.success) {
    return fail(
      400,
      "Validation failed",
      parseResult.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
    );
  }

  const { tankId, distanceCm, batteryPct, notes } = parseResult.data;

  // 1. Verify tank exists
  const tank = await getTank(tankId);
  if (!tank || tank.deletedAt != null || !tank.deviceId) {
    return fail(404, `Tank ${tankId} not found or has no associated device`);
  }

  // 2. Authorization check: Admin OR assigned Tank Owner
  const permitted = await isUserPermittedForTank(session.uid, tankId);
  if (!permitted) {
    return fail(403, `User ${session.name} is not authorized to submit readings for Tank ${tank.label}`);
  }

  // 3. Timestamp validation
  const nowMs = Date.now();
  const t = parseResult.data.t ?? nowMs;
  if (t > nowMs + 5 * 60_000) {
    return fail(400, "Timestamp cannot be in the future");
  }
  if (t < nowMs - 365 * 24 * 60 * 60_000) {
    return fail(400, "Timestamp is too far in the past (> 1 year)");
  }

  // 4. Save reading to PostgreSQL
  const inserted = await upsertMany([
    {
      deviceId: tank.deviceId,
      t,
      distanceCm,
      batteryPct: batteryPct ?? null,
      source: "MANUAL",
    },
  ]);

  // 5. Evaluate tank alerts
  evaluateTank(tank, t).catch(() => {});

  // 6. Audit log
  await audit({
    userId: session.uid,
    action: "reading.manual_entry",
    entity: "tank",
    entityId: tankId,
    after: { distanceCm, batteryPct, t, notes, source: "MANUAL" },
  });

  const d = derive(distanceCm, tank.geometry);

  return ok({
    ok: true,
    tankId: tank.id,
    tankLabel: tank.label,
    deviceId: tank.deviceId,
    t,
    distanceCm,
    levelCm: d.levelCm,
    levelPct: d.levelPct,
    volumeL: d.volumeL,
    quality: d.quality,
    source: "MANUAL",
    inserted: inserted > 0,
  });
});

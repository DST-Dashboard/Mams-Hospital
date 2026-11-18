import { ok } from "@/server/http";
import { q1 } from "@/server/db";
import { now, clockMode } from "@/server/clock";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const row = await q1<{ n: string | number; last: number | null }>(
      "SELECT COUNT(*)::int AS n, MAX(t) AS last FROM readings"
    );
    return ok({
      status: "ok",
      readings: Number(row?.n ?? 0),
      lastReadingAt: row?.last ? Number(row.last) : null,
      asOf: now(),
      clockMode: clockMode(),
    });
  } catch (e) {
    logger.error("Health check failed", e);
    return ok({ status: "degraded" }, { status: 503 });
  }
}

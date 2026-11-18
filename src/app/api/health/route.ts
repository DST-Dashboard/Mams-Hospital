import { ok } from "@/server/http";
import { db } from "@/server/db";
import { now, clockMode } from "@/server/clock";
import { logger } from "@/server/logger";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const row = db().prepare("SELECT COUNT(*) AS n, MAX(t) AS last FROM readings").get() as { n: number; last: number | null };
    return ok({ status: "ok", readings: row.n, lastReadingAt: row.last, asOf: now(), clockMode: clockMode() });
  } catch (e) {
    logger.error("Health check failed", e);
    return ok({ status: "degraded" }, { status: 503 });
  }
}

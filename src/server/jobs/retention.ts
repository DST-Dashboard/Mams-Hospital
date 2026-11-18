import { DAY } from "@/domain/time";
import { db, tx } from "../db";
import { now } from "../clock";
import { cleanExpiredSessions } from "../repos/sessions";

export function purgeExpiredData(asOf = now()): {
  readings: number;
  rollups: number;
  tanks: number;
  sessions: number;
  passwordResets: number;
  rateLimits: number;
} {
  const cutoff = asOf - 90 * DAY;
  const purged = tx(() => {
    const readingsDeleted = db().prepare("DELETE FROM readings WHERE t < ?").run(cutoff).changes;
    const rollupsDeleted = db().prepare("DELETE FROM reading_rollups WHERE bucket_t < ?").run(cutoff).changes;
    const tanksDeleted = db().prepare(`
      DELETE FROM tanks
      WHERE deleted_at IS NOT NULL AND deleted_at < ?
        AND NOT EXISTS (SELECT 1 FROM alerts WHERE alerts.tank_id = tanks.id)
    `).run(asOf - 90 * DAY).changes;
    const resetTokensDeleted = db().prepare("DELETE FROM password_resets WHERE expires_at < ? OR used_at IS NOT NULL").run(asOf).changes;
    const rateLimitsDeleted = db().prepare(`
      DELETE FROM rate_limits
      WHERE (locked_until IS NULL AND first_attempt_at < ?)
         OR (locked_until IS NOT NULL AND locked_until <= ?)
    `).run(asOf - DAY, asOf).changes;
    const sessionsDeleted = cleanExpiredSessions(asOf);
    return {
      readings: readingsDeleted,
      rollups: rollupsDeleted,
      tanks: tanksDeleted,
      sessions: sessionsDeleted,
      passwordResets: resetTokensDeleted,
      rateLimits: rateLimitsDeleted,
    };
  });
  return purged;
}

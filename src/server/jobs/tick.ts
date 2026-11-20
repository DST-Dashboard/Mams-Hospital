import { q } from "../db";
import { now } from "../clock";
import { evaluateAll, evaluateTank } from "../services/alert-engine";
import { getTank, purgeSoftDeleted } from "../repos/tanks";
import { listPendingRetries, completeDelivery } from "../repos/notifications";
import { sendEmail } from "../notify/email";
import { runSimulatorTick } from "../simulator";
import { runEscalationTick } from "../services/escalation";

/**
 * Atomic slot claim pattern safe for connection poolers.
 * UPDATE job_runs SET last_run_at=$now WHERE name=$n AND last_run_at < $now - $interval RETURNING name
 */
export async function claimJobSlot(name: string, intervalMs: number, nowMs: number): Promise<boolean> {
  // Ensure job row exists
  await q(
    "INSERT INTO job_runs (name, last_run_at, ok) VALUES ($1, 0, TRUE) ON CONFLICT (name) DO NOTHING",
    [name]
  );

  const rows = await q(
    "UPDATE job_runs SET last_run_at = $1 WHERE name = $2 AND last_run_at <= ($1::bigint - $3::bigint) RETURNING name",
    [nowMs, name, intervalMs]
  );

  return rows.length > 0;
}

export async function recordJobResult(name: string, ok: boolean, error?: string): Promise<void> {
  await q(
    "UPDATE job_runs SET ok = $1, error = $2 WHERE name = $3",
    [ok, error ?? null, name]
  );
}

/**
 * Universal periodic worker for Vercel Hobby & opportunistic execution.
 */
export async function runTick(opts: { full?: boolean; tankId?: number } = {}): Promise<Record<string, boolean>> {
  const asOf = now();
  const executed: Record<string, boolean> = {};

  // If specific tank evaluation requested (e.g. after ingest)
  if (opts.tankId) {
    const tank = await getTank(opts.tankId);
    if (tank) {
      await evaluateTank(tank, asOf);
      executed[`tank-${opts.tankId}`] = true;
    }
  }

  // 1. Alert Evaluation (every 60 s)
  if (opts.full || (await claimJobSlot("alerts", 60_000, asOf))) {
    try {
      await evaluateAll(asOf);
      await recordJobResult("alerts", true);
      executed.alerts = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await recordJobResult("alerts", false, msg);
    }
  }

  // 2. Escalation (every 60 s)
  if (opts.full || (await claimJobSlot("escalation", 60_000, asOf))) {
    try {
      await runEscalationTick(asOf);
      await recordJobResult("escalation", true);
      executed.escalation = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await recordJobResult("escalation", false, msg);
    }
  }

  // 3. Notification Retries (every 60 s)
  if (opts.full || (await claimJobSlot("notifications", 60_000, asOf))) {
    try {
      const pending = await listPendingRetries(5);
      for (const d of pending) {
        if (d.channel === "email" && d.recipient) {
          try {
            await sendEmail({
              to: d.recipient,
              subject: "OHTMS Notification",
              text: `Alert notification for ${d.recipient}`,
            });
            await completeDelivery(d.id, true, asOf);
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            await completeDelivery(d.id, false, asOf, msg);
          }
        }
      }
      await recordJobResult("notifications", true);
      executed.notifications = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await recordJobResult("notifications", false, msg);
    }
  }

  // 4. Simulator (every 5 min)
  if (opts.full || (await claimJobSlot("simulator", 5 * 60_000, asOf))) {
    try {
      await runSimulatorTick(asOf);
      await recordJobResult("simulator", true);
      executed.simulator = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await recordJobResult("simulator", false, msg);
    }
  }

  // 5. Retention (every 24 h or full)
  if (opts.full || (await claimJobSlot("retention", 24 * 3600_000, asOf))) {
    try {
      // Purge soft-deleted tanks older than 90 days (readings are never purged)
      const ninetyDaysAgo = asOf - 90 * 86400_000;
      await purgeSoftDeleted(ninetyDaysAgo);
      await recordJobResult("retention", true);
      executed.retention = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await recordJobResult("retention", false, msg);
    }
  }

  return executed;
}

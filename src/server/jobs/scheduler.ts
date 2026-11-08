import { evaluateAll } from "../services/alert-engine";

const g = globalThis as unknown as { __ohtmsJobs?: NodeJS.Timeout[] };

/**
 * In-process scheduler — keeps the app a single deployable (no cron service, no worker).
 * Started once from src/instrumentation.ts. Add rollups/retention/escalation jobs here (Phase 2/3).
 */
export function startJobs() {
  if (g.__ohtmsJobs) return;
  const run = (name: string, fn: () => unknown) => () => { try { fn(); } catch (e) { console.error(`[job:${name}]`, e); } };
  g.__ohtmsJobs = [
    setInterval(run("alerts", evaluateAll), 60_000),
    // setInterval(run("escalation", escalateUnacknowledged), 60_000),   // Phase 2
    // setInterval(run("retention", purgeOldData), 24 * 3600_000),       // Phase 3
  ];
  run("alerts", evaluateAll)();
  console.log("[jobs] scheduler started");
}

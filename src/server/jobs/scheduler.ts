import { evaluateAll } from "../services/alert-engine";
import { runEscalation } from "./escalation";
import { refreshRollups } from "./rollups";
import { purgeExpiredData } from "./retention";
import { checkGatewayHealth } from "./node-health";
import { dispatchPendingNotifications } from "../notify/dispatcher";
import { recordJobRun } from "./run-state";
import { logger } from "../logger";

const g = globalThis as unknown as { __ohtmsJobs?: NodeJS.Timeout[] };

export function startJobs() {
  if (g.__ohtmsJobs) return;
  const timers: NodeJS.Timeout[] = [];
  const schedule = (name: string, task: () => unknown | Promise<unknown>, intervalMs: number, runOnStart = true) => {
    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      const startedAt = Date.now();
      try {
        await task();
        recordJobRun(name, Date.now());
        logger.info("Scheduled job completed", { job: name, durationMs: Date.now() - startedAt });
      } catch (error) {
        logger.error("Scheduled job failed", error, { job: name });
        try {
          recordJobRun(name, Date.now(), error);
        } catch (stateError) {
          logger.error("Unable to persist scheduled job status", stateError, { job: name });
        }
      } finally {
        running = false;
      }
    };
    timers.push(setInterval(() => { void run(); }, intervalMs));
    if (runOnStart) void run();
  };
  schedule("alerts", () => evaluateAll(), 60_000);
  schedule("escalation", () => runEscalation(), 60_000);
  schedule("notifications", () => dispatchPendingNotifications(), 60_000);
  schedule("node-health", () => checkGatewayHealth(), 5 * 60_000);
  schedule("rollups", () => refreshRollups(), 60 * 60_000, false);
  schedule("retention", () => purgeExpiredData(), 24 * 60 * 60_000, false);
  g.__ohtmsJobs = timers;
  logger.info("Backend job scheduler started", { jobs: timers.length });
}

import { runTick } from "./tick";
import { logger } from "../logger";

const g = globalThis as unknown as { __ohtmsJobs?: NodeJS.Timeout[] };

export function startJobs() {
  if (process.env.VERCEL) {
    // Vercel serverless functions cannot keep long-running timers
    return;
  }

  if (g.__ohtmsJobs) return;
  const timers: NodeJS.Timeout[] = [];

  // Run tick every 60 seconds locally
  timers.push(
    setInterval(async () => {
      try {
        await runTick();
      } catch (err) {
        logger.error("Local tick failed", err);
      }
    }, 60_000)
  );

  // Trigger once on start
  void runTick().catch(() => {});

  g.__ohtmsJobs = timers;
  logger.info("Local job runner started");
}

export function stopJobs() {
  if (g.__ohtmsJobs) {
    for (const t of g.__ohtmsJobs) clearInterval(t);
    g.__ohtmsJobs = undefined;
  }
}

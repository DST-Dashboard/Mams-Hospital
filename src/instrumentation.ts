export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startJobs } = await import("./server/jobs/scheduler");
    try { startJobs(); } catch (e) { console.warn("[jobs] not started:", (e as Error).message); }
  }
}

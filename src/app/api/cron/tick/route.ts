import { env } from "@/server/env";
import { fail, handle, ok } from "@/server/http";
import { runTick } from "@/server/jobs/tick";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 10;

export const GET = handle(async (req: Request) => {
  const authHeader = req.headers.get("authorization");
  const cronSecret = env().CRON_SECRET;

  if (authHeader !== `Bearer ${cronSecret}`) {
    return fail(401, "Unauthorized");
  }

  const url = new URL(req.url);
  const full = url.searchParams.get("full") === "1";

  const executed = await runTick({ full });
  return ok({ ok: true, executed, asOf: Date.now() });
});

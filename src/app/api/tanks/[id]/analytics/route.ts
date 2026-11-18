import { requireRole } from "@/server/auth/guard";
import { now } from "@/server/clock";
import { fail, handle, intParam, ok } from "@/server/http";
import { getTank } from "@/server/repos/tanks";
import { tankAnalytics } from "@/server/services/analytics";
import { DAY } from "@/domain";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("viewer");
  const t = await getTank(intParam((await params).id));
  if (!t) return fail(404, "Tank not found");
  const q = new URL(req.url).searchParams;
  const toValue = q.get("to");
  const fromValue = q.get("from");
  const to = toValue == null ? now() : Number(toValue);
  const from = fromValue == null ? to - DAY : Number(fromValue);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from >= to) return fail(400, "Invalid analytics time range");
  return ok(await tankAnalytics(t, from, to));
});

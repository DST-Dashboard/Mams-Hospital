import { requireRole } from "@/server/auth/guard";
import { now } from "@/server/clock";
import { fail, handle, intParam, ok } from "@/server/http";
import { getTank } from "@/server/repos/tanks";
import { tankAnalytics } from "@/server/services/analytics";
import { DAY } from "@/domain";
export const dynamic = "force-dynamic";

export const GET = handle(async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  await requireRole("viewer");
  const t = getTank(intParam((await params).id));
  if (!t) return fail(404, "Tank not found");
  const q = new URL(req.url).searchParams;
  const to = Number(q.get("to")) || now();
  const from = Number(q.get("from")) || to - DAY;
  return ok(tankAnalytics(t, from, to));
});

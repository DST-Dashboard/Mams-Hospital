// [BE-05] OWNER: backend · CONTRACT: CompareDTO (src/contracts)
import { requireRole } from "@/server/auth/guard";
import { now } from "@/server/clock";
import { DAY } from "@/domain";
import { CompareQuery } from "@/contracts/analytics";
import { fail, handle, ok } from "@/server/http";
import { tankComparison } from "@/server/services/compare";
export const dynamic = "force-dynamic";
export const GET = handle(async (req: Request) => {
  await requireRole("viewer");
  const query = CompareQuery.parse(Object.fromEntries(new URL(req.url).searchParams));
  const to = query.to ?? now();
  const from = query.from ?? to - 7 * DAY;
  if (from >= to) return fail(400, "`from` must be earlier than `to`");
  return ok(tankComparison(from, to, query.res));
});

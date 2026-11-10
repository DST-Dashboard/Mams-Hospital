import { currentSession } from "@/server/auth/guard";
import { fail, ok } from "@/server/http";
export async function GET() { const s = await currentSession(); return s ? ok(s) : fail(401, "Not signed in"); }

import { cookies } from "next/headers";
import { COOKIE } from "@/server/auth/session";
import { ok } from "@/server/http";
export async function POST() { (await cookies()).delete(COOKIE); return ok({ ok: true }); }

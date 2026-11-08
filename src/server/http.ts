import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth/guard";

export const ok = <T,>(data: T, init?: ResponseInit) => NextResponse.json(data, init);
export const fail = (status: number, message: string, details?: unknown) => NextResponse.json({ error: message, details }, { status });

/** Uniform error contract for every route: { error, details? } with the right status. */
export function handle<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A): Promise<Response> => {
    try { return await fn(...a); }
    catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      if (e instanceof ZodError) return fail(400, "Invalid input", e.issues.map((i) => ({ path: i.path.join("."), message: i.message })));
      console.error("[api]", e);
      return fail(500, "Internal error");
    }
  };
}
export const intParam = (v: string | null | undefined, name = "id") => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `Invalid ${name}`);
  return n;
};

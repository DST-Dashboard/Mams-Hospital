import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "./auth/guard";

const DEFAULT_CACHE_CONTROL = "private, no-store, max-age=0, must-revalidate";

export const ok = <T,>(data: T, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", DEFAULT_CACHE_CONTROL);
  }
  return NextResponse.json(data, { ...init, headers });
};

export const fail = (status: number, message: string, details?: unknown, init?: ResponseInit) => {
  const headers = new Headers(init?.headers);
  if (!headers.has("Cache-Control")) {
    headers.set("Cache-Control", DEFAULT_CACHE_CONTROL);
  }
  return NextResponse.json({ error: message, details }, { status, ...init, headers });
};

/** Uniform error contract for every route: { error, details? } with the right status. */
export function handle<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A): Promise<Response> => {
    try {
      return await fn(...a);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message);
      if (e instanceof ZodError) {
        return fail(
          400,
          "Invalid input",
          e.issues.map((i) => ({ path: i.path.join("."), message: i.message }))
        );
      }
      if (e instanceof SyntaxError) return fail(400, "Invalid JSON");
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

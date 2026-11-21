import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, verify } from "@/server/auth/session";

// Public: login page, recovery pages, kiosk, auth endpoints, health, cron, and machine ingest
// (/api/ingest has no login cookie by design; the route itself enforces the INGEST_API_KEY)
const PUBLIC = [
  /^\/login$/,
  /^\/forgot-password$/,
  /^\/reset-password$/,
  /^\/kiosk$/,
  /^\/api\/auth\//,
  /^\/api\/health$/,
  /^\/api\/cron\//,
  /^\/api\/ingest$/,
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((r) => r.test(pathname))) return NextResponse.next();

  const secret =
    process.env.SESSION_SECRET ??
    (process.env.NODE_ENV === "production" ? "" : "dev-only-secret-dev-only-secret-dev-only-secret-must-be-32-chars");

  const session = await verify(req.cookies.get(COOKIE)?.value, secret);
  if (session) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"] };

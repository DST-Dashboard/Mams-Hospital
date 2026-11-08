import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.string().default("development"),
  CLOCK_MODE: z.enum(["anchored", "live"]).default("anchored"),
  DB_PATH: z.string().default("./var/ohtms.db"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be ≥ 32 chars"),
  SESSION_HOURS: z.coerce.number().default(8),
  ADMIN_EMAIL: z.string().default("admin@mams.local"),
  ADMIN_PASSWORD: z.string().default("ChangeMe!2026"),
  TTS_WEBHOOK_SECRET: z.string().optional().default(""),
});

let cached: z.infer<typeof Env> | undefined;
/** Validated lazily so `next build` doesn't need secrets; fails fast on first real use. */
export function env() {
  if (cached) return cached;
  const e = Env.parse({ ...process.env, SESSION_SECRET: process.env.SESSION_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : "dev-only-secret-dev-only-secret-dev-only-secret") });
  if (e.NODE_ENV === "production" && (e.ADMIN_PASSWORD === "ChangeMe!2026" || e.SESSION_SECRET.startsWith("change-me")))
    throw new Error("Refusing to start in production with default ADMIN_PASSWORD / SESSION_SECRET");
  return (cached = e);
}

import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.string().default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DATABASE_URL_UNPOOLED: z.string().optional(),
  TEST_DATABASE_URL: z.string().optional(),

  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be >= 32 chars"),
  SESSION_HOURS: z.coerce.number().default(8),
  CRON_SECRET: z.string().min(16, "CRON_SECRET is required"),

  TTS_USER_NAME: z.string().optional(),
  TTS_APPLICATION_ID: z.string().optional(),
  TTS_MQTT_HOSTNAME: z.string().optional(),
  TTS_MQTT_PORT: z.coerce.number().optional().default(8883),
  TTS_API_KEY: z.string().optional(),
  TTS_WEBHOOK_SECRET: z.string().min(16, "TTS_WEBHOOK_SECRET is required"),

  ADMIN_EMAIL: z.string().email("ADMIN_EMAIL must be valid email").default("admin@mams.local"),
  ADMIN_PASSWORD: z.string().min(8, "ADMIN_PASSWORD must be >= 8 chars").default("ChangeMe!2026"),

  SMTP_URL: z.preprocess((val) => (val === "" ? undefined : val), z.string().url("SMTP_URL must be valid URL").optional()),
  EMAIL_FROM: z.string().default("alerts@mams.local"),
  APP_BASE_URL: z.preprocess((val) => (val === "" ? undefined : val), z.string().url("APP_BASE_URL must be valid URL").optional()),
});

export type EnvConfig = z.infer<typeof Env>;

let cached: EnvConfig | undefined;

export function env(): EnvConfig {
  if (cached) return cached;

  const defaultSessionSecret =
    process.env.NODE_ENV === "production" ? undefined : "dev-only-secret-dev-only-secret-dev-only-secret-must-be-32-chars";

  const defaultCronSecret =
    process.env.NODE_ENV === "production" ? undefined : "dev-cron-secret-dev-cron-secret-32ch";

  const defaultWebhookSecret =
    process.env.NODE_ENV === "production" ? undefined : "dev-webhook-secret-dev-webhook-secret-32ch";

  const parsed = Env.safeParse({
    ...process.env,
    SESSION_SECRET: process.env.SESSION_SECRET ?? defaultSessionSecret,
    CRON_SECRET: process.env.CRON_SECRET ?? defaultCronSecret,
    TTS_WEBHOOK_SECRET: process.env.TTS_WEBHOOK_SECRET ?? defaultWebhookSecret,
  });

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join(", ");
    throw new Error(`Environment validation failed: ${issues}`);
  }

  const e = parsed.data;

  if (e.NODE_ENV === "production" && process.env.APP_ENV === "production") {
    if (e.ADMIN_PASSWORD === "ChangeMe!2026") {
      throw new Error("Refusing to start in production with default ADMIN_PASSWORD");
    }
    if (e.SESSION_SECRET.startsWith("dev-only-secret") || e.SESSION_SECRET.startsWith("change-me")) {
      throw new Error("Refusing to start in production with insecure SESSION_SECRET");
    }
  }

  return (cached = e);
}

export function resetEnvCache(): void {
  cached = undefined;
}

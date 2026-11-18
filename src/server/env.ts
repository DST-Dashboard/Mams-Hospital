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
  MQTT_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  MQTT_TOPIC: z.string().min(1).default("v3/+/devices/+/up"),
  MQTT_CLIENT_ID: z.string().min(1).default("mams-ohtms-ingest"),
  MQTT_USERNAME: z.string().optional(),
  MQTT_PASSWORD: z.string().optional(),
  APP_BASE_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  WATER_COST_PER_LITRE: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().nonnegative().optional()),
  SMTP_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  SMTP_FROM: z.preprocess((value) => value === "" ? undefined : value, z.string().email().optional()),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_SMS: z.string().optional(),
  TWILIO_FROM_WHATSAPP: z.string().optional(),
  NOTIFY_WEBHOOK_URL: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional()),
  NOTIFY_WEBHOOK_SECRET: z.string().optional(),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.preprocess((value) => value === "" ? undefined : value, z.string().regex(/^(mailto:|https:\/\/)/).optional()),
});

let cached: z.infer<typeof Env> | undefined;
/** Validated lazily so `next build` doesn't need secrets; fails fast on first real use. */
export function env() {
  if (cached) return cached;
  const e = Env.parse({ ...process.env, SESSION_SECRET: process.env.SESSION_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : "dev-only-secret-dev-only-secret-dev-only-secret") });
  if (e.NODE_ENV === "production" && process.env.APP_ENV === "production" && (e.ADMIN_PASSWORD === "ChangeMe!2026" || e.SESSION_SECRET.startsWith("change-me")))
    throw new Error("Refusing to start in production with default ADMIN_PASSWORD / SESSION_SECRET");
  if (e.NODE_ENV === "production" && e.APP_BASE_URL && new URL(e.APP_BASE_URL).protocol !== "https:")
    throw new Error("APP_BASE_URL must use HTTPS in production");
  if (e.MQTT_URL) {
    const mqttUrl = new URL(e.MQTT_URL);
    if (mqttUrl.protocol !== "mqtt:" && mqttUrl.protocol !== "mqtts:")
      throw new Error("MQTT_URL must use mqtt:// or mqtts://");
    if (e.NODE_ENV === "production" && mqttUrl.protocol !== "mqtts:")
      throw new Error("MQTT_URL must use mqtts:// in production");
  }
  return (cached = e);
}

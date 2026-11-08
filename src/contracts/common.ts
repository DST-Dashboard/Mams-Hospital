import { z } from "zod";

export const SeveritySchema = z.enum(["info", "warning", "critical", "emergency"]);
export const AlertStateSchema = z.enum(["active", "acknowledged", "snoozed", "resolved", "suppressed", "escalated"]);
export const AlertTypeSchema = z.enum([
  "LOW_LEVEL", "CRITICAL_LOW", "EMPTY", "OVERFLOW_RISK", "SENSOR_FAULT", "NO_DATA",
  "RAPID_DRAIN", "BATTERY_LOW", "PREDICTED_EMPTY", "FLATLINE", "PUMP_STUCK", "DATA_GAP", "GATEWAY_OFFLINE", "FLAPPING",
]);
export const RoleSchema = z.enum(["viewer", "operator", "admin"]);
export const TankStatusSchema = z.enum(["draft", "active", "maintenance", "offline", "decommissioned"]);
export const ChannelSchema = z.enum(["in_app", "email", "sms", "whatsapp", "webhook", "push"]);

/** Every error response from every endpoint. */
export const ApiErrorSchema = z.object({ error: z.string(), details: z.unknown().optional() });
export type ApiError = z.infer<typeof ApiErrorSchema>;

/** Standard list wrapper for paged endpoints (audit, users, alerts history). */
export const PageSchema = <T extends z.ZodTypeAny>(item: T) => z.object({ items: z.array(item), total: z.number().int(), page: z.number().int(), pageSize: z.number().int() });
export const PageQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(200).default(50) });

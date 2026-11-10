import { z } from "zod";
import { PageQuerySchema } from "./common";

export const AuditEntryDTO = z.object({
  id: z.number().int(), t: z.number(), user: z.object({ id: z.number(), name: z.string() }).nullable(),
  action: z.string(), entity: z.string(), entityId: z.string().nullable(),
  before: z.unknown().nullable(), after: z.unknown().nullable(), ip: z.string().nullable(),
});
export type AuditEntryDTO = z.infer<typeof AuditEntryDTO>;
export const AuditQuery = PageQuerySchema.extend({ entity: z.string().optional(), userId: z.coerce.number().int().optional(), action: z.string().optional(), from: z.coerce.number().optional(), to: z.coerce.number().optional() });

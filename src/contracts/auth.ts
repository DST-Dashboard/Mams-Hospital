import { z } from "zod";
import { RoleSchema } from "./common";

const publicPushHosts = [
  "fcm.googleapis.com",
  "web.push.apple.com",
  "push.services.mozilla.com",
  "notify.windows.com",
];

export function isAllowedPushEndpointUrl(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
    return url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.hash &&
      (url.port === "" || url.port === "443") &&
      publicPushHosts.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

export const TotpTokenBody = z.object({ token: z.string().regex(/^\d{6}$/) });
export const TotpDisableBody = TotpTokenBody.extend({ currentPassword: z.string().min(1) });
export const TotpSetupBody = z.object({ currentToken: z.string().regex(/^\d{6}$/).optional() });
export const ApiKeyDTO = z.object({
  id: z.number().int(),
  name: z.string(),
  role: RoleSchema,
  createdAt: z.number(),
  lastUsedAt: z.number().nullable(),
  revokedAt: z.number().nullable(),
});
export const ApiKeyCreateBody = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.enum(["viewer", "operator"]).default("viewer"),
});
export const PushSubscriptionBody = z.object({
  endpoint: z.string().url().refine(isAllowedPushEndpointUrl, "Push endpoint must use an allowed public HTTPS push service"),
  keys: z.object({
    p256dh: z.string().min(20).max(256),
    auth: z.string().min(8).max(128),
  }),
});
export type ApiKeyDTO = z.infer<typeof ApiKeyDTO>;

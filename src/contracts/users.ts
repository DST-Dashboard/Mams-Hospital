import { z } from "zod";
import { RoleSchema } from "./common";

export const UserDTO = z.object({ id: z.number().int(), email: z.string().email(), name: z.string(), role: RoleSchema, disabled: z.boolean(), createdAt: z.number(), lastLoginAt: z.number().nullable() });
export type UserDTO = z.infer<typeof UserDTO>;
/** POST /api/users (admin) */
export const UserCreateBody = z.object({ email: z.string().trim().email(), name: z.string().min(1).max(80), role: RoleSchema, password: z.string().min(8).max(128) });
/** PATCH /api/users/:id (admin) */
export const UserUpdateBody = z.object({ name: z.string().min(1).max(80).optional(), role: RoleSchema.optional(), disabled: z.boolean().optional(), password: z.string().min(8).max(128).optional() });
/** POST /api/auth/password (any signed-in user) */
export const ChangePasswordBody = z.object({ current: z.string().min(1), next: z.string().min(8).max(128) });
/** POST /api/auth/forgot  ·  POST /api/auth/reset */
export const ForgotBody = z.object({ email: z.string().trim().email() });
export const ResetBody = z.object({ token: z.string().min(20), password: z.string().min(8).max(128) });

import { jwtVerify, SignJWT } from "jose";
import { RoleSchema } from "@/contracts/common";

export const COOKIE = "ohtms_session";
export type Role = "viewer" | "operator" | "admin";
export interface Session { uid: number; role: Role; name: string; sessionId?: string }
const rank: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 };
export const atLeast = (have: Role, need: Role) => rank[have] >= rank[need];

const key = (secret: string) => new TextEncoder().encode(secret);

/** Edge-safe (jose only) so middleware can verify without touching Node-only modules. */
export async function sign(s: Session, secret: string, hours: number) {
  const token = new SignJWT({ role: s.role, name: s.name }).setProtectedHeader({ alg: "HS256" })
    .setSubject(String(s.uid)).setIssuedAt().setExpirationTime(`${hours}h`);
  if (s.sessionId) token.setJti(s.sessionId);
  return token.sign(key(secret));
}
export async function verify(token: string | undefined, secret: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    const uid = Number(payload.sub);
    const role = RoleSchema.safeParse(payload.role);
    if (!Number.isSafeInteger(uid) || uid <= 0 || !role.success) return null;
    const sessionId = typeof payload.jti === "string" && /^[a-f0-9]{64}$/.test(payload.jti) ? payload.jti : undefined;
    return { uid, role: role.data, name: String(payload.name ?? ""), ...(sessionId ? { sessionId } : {}) };
  } catch { return null; }
}

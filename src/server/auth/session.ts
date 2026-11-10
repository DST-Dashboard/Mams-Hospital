import { jwtVerify, SignJWT } from "jose";

export const COOKIE = "ohtms_session";
export type Role = "viewer" | "operator" | "admin";
export interface Session { uid: number; role: Role; name: string }
const rank: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 };
export const atLeast = (have: Role, need: Role) => rank[have] >= rank[need];

const key = (secret: string) => new TextEncoder().encode(secret);

/** Edge-safe (jose only) so middleware can verify without touching Node-only modules. */
export async function sign(s: Session, secret: string, hours: number) {
  return new SignJWT({ role: s.role, name: s.name }).setProtectedHeader({ alg: "HS256" })
    .setSubject(String(s.uid)).setIssuedAt().setExpirationTime(`${hours}h`).sign(key(secret));
}
export async function verify(token: string | undefined, secret: string): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: ["HS256"] });
    return { uid: Number(payload.sub), role: payload.role as Role, name: String(payload.name ?? "") };
  } catch { return null; }
}

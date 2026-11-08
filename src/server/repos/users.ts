import { db } from "../db";
export interface UserRow { id: number; email: string; name: string; role: "viewer" | "operator" | "admin"; passwordHash: string; disabled: boolean }
type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const map = (r: Raw): UserRow => ({ id: r.id, email: r.email, name: r.name, role: r.role, passwordHash: r.password_hash, disabled: !!r.disabled });
export const byEmail = (email: string) => { const r = db().prepare("SELECT * FROM users WHERE email=? COLLATE NOCASE").get(email) as Raw | undefined; return r && map(r); };
export const byId = (id: number) => { const r = db().prepare("SELECT * FROM users WHERE id=?").get(id) as Raw | undefined; return r && map(r); };
export const touchLogin = (id: number) => void db().prepare("UPDATE users SET last_login_at=? WHERE id=?").run(Date.now(), id);

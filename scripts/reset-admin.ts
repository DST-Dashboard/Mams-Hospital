/**
 * Re-sets the admin account from .env WITHOUT touching readings, tanks, alerts or audit history.
 *   npm run auth:reset
 * Use when: you changed ADMIN_PASSWORD after seeding, forgot the password, or the account got disabled.
 */
import bcrypt from "bcryptjs";
import fs from "node:fs";
import { openDb } from "../src/server/db";
import { env } from "../src/server/env";

try { process.loadEnvFile(".env"); } catch { console.warn("No .env found — using defaults from .env.example"); }
const e = env();
if (!fs.existsSync(e.DB_PATH)) { console.error(`No database at ${e.DB_PATH}. Run: npm run setup`); process.exit(1); }

const db = openDb(e.DB_PATH);
const hash = bcrypt.hashSync(e.ADMIN_PASSWORD, 10);
const existing = db.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE").get(e.ADMIN_EMAIL);
if (existing) db.prepare("UPDATE users SET password_hash=?, role='admin', disabled=0 WHERE email=? COLLATE NOCASE").run(hash, e.ADMIN_EMAIL);
else db.prepare("INSERT INTO users (email,name,password_hash,role,created_at) VALUES (?,?,?,'admin',?)").run(e.ADMIN_EMAIL, "Administrator", hash, Date.now());
console.log(`Admin ready → email: ${e.ADMIN_EMAIL}  (password = ADMIN_PASSWORD from .env, ${e.ADMIN_PASSWORD.length} characters)`);
db.close();

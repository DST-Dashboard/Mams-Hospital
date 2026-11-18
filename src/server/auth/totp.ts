import crypto from "node:crypto";
import { env } from "../env";
import { db } from "../db";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD_SECONDS = 30;
const DIGITS = 6;

function encodeBase32(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits) output += BASE32[(value << (5 - bits)) & 31];
  return output;
}

function decodeBase32(value: string): Buffer {
  let bits = 0;
  let buffer = 0;
  const output: number[] = [];
  for (const char of value.toUpperCase().replace(/=+$/g, "")) {
    const digit = BASE32.indexOf(char);
    if (digit < 0) throw new Error("Invalid TOTP secret");
    buffer = (buffer << 5) | digit;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(output);
}

function codeAt(secret: string, counter: number): string {
  const key = decodeBase32(secret);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", key).update(message).digest();
  const offset = digest[digest.length - 1]! & 15;
  const binary = ((digest[offset]! & 127) << 24) |
    ((digest[offset + 1]! & 255) << 16) |
    ((digest[offset + 2]! & 255) << 8) |
    (digest[offset + 3]! & 255);
  return String(binary % (10 ** DIGITS)).padStart(DIGITS, "0");
}

export function generateTotpSecret(): string {
  return encodeBase32(crypto.randomBytes(20));
}

export function provisioningUri(secret: string, account: string, issuer = "MAMS Hospital"): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const query = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(DIGITS), period: String(PERIOD_SECONDS) });
  return `otpauth://totp/${label}?${query.toString()}`;
}

function matchTotpCounter(secret: string, token: string, at: number): number | null {
  if (!/^\d{6}$/.test(token)) return null;
  const current = Math.floor(at / 1000 / PERIOD_SECONDS);
  const candidate = Buffer.from(token);
  for (const offset of [-1, 0, 1]) {
    const counter = current + offset;
    if (counter < 0) continue;
    const expected = Buffer.from(codeAt(secret, counter));
    if (candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected)) return counter;
  }
  return null;
}

export function totpCode(secret: string, at: number): string {
  return codeAt(secret, Math.floor(at / 1000 / PERIOD_SECONDS));
}

export function verifyTotp(secret: string, token: string, at = Date.now()): boolean {
  return matchTotpCounter(secret, token, at) != null;
}

function encryptionKey(): Buffer {
  return crypto.scryptSync(env().SESSION_SECRET, "mams-totp-v1", 32);
}

function encryptSecret(secret: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
}

function decryptSecret(value: string): string {
  const [ivValue, tagValue, ciphertextValue] = value.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Stored TOTP secret is malformed");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
}

function storedSecret(userId: number): { secret: string; enabled: boolean; lastCounter: number | null } | undefined {
  const row = db().prepare("SELECT totp_secret, totp_enabled, totp_last_used_counter FROM users WHERE id = ?").get(userId) as
    | { totp_secret: string | null; totp_enabled: number; totp_last_used_counter: number | null }
    | undefined;
  return row?.totp_secret
    ? { secret: decryptSecret(row.totp_secret), enabled: row.totp_enabled === 1, lastCounter: row.totp_last_used_counter }
    : undefined;
}

export function beginTotpSetup(userId: number): string {
  const secret = generateTotpSecret();
  db().prepare("UPDATE users SET totp_pending_secret = ? WHERE id = ?")
    .run(encryptSecret(secret), userId);
  return secret;
}

function consumeCounter(userId: number, counter: number): boolean {
  return db().prepare(`
    UPDATE users SET totp_last_used_counter = ?
    WHERE id = ? AND (totp_last_used_counter IS NULL OR totp_last_used_counter < ?)
  `).run(counter, userId, counter).changes === 1;
}

export function confirmTotpSetup(userId: number, token: string, at = Date.now()): boolean {
  const row = db().prepare("SELECT totp_pending_secret FROM users WHERE id = ?").get(userId) as
    | { totp_pending_secret: string | null }
    | undefined;
  if (!row?.totp_pending_secret) return false;
  const secret = decryptSecret(row.totp_pending_secret);
  const counter = matchTotpCounter(secret, token, at);
  if (counter == null) return false;
  return db().prepare(`
    UPDATE users SET totp_secret = totp_pending_secret, totp_pending_secret = NULL,
      totp_enabled = 1, totp_last_used_counter = ?
    WHERE id = ? AND totp_pending_secret = ?
  `).run(counter, userId, row.totp_pending_secret).changes === 1;
}

export function verifyUserTotp(userId: number, token: string, at = Date.now()): boolean {
  const record = storedSecret(userId);
  if (!record?.enabled) return false;
  const counter = matchTotpCounter(record.secret, token, at);
  return counter != null && consumeCounter(userId, counter);
}

export function disableTotp(userId: number, token: string, at = Date.now()): boolean {
  if (!verifyUserTotp(userId, token, at)) return false;
  return db().prepare("UPDATE users SET totp_secret = NULL, totp_enabled = 0, totp_last_used_counter = NULL WHERE id = ?")
    .run(userId).changes === 1;
}

export function hasTotpEnabled(userId: number): boolean {
  return storedSecret(userId)?.enabled ?? false;
}

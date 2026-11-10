export type Tz = "IST" | "UTC";

export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Shifts an epoch ms timestamp so that UTC getters on the resulting Date
 * reflect local wall-clock time in the given timezone.
 */
export function toZonedDate(t: number, tz: Tz = "IST"): Date {
  return new Date(t + (tz === "IST" ? IST_OFFSET_MS : 0));
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Fill percentage with 1 decimal place (e.g. "32.7 %") */
export function fmtFill(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)} %`;
}

/** Litres formatted as kL with 1 dp from 1,000 L, or whole L under 1,000 */
export function fmtLitres(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  if (Math.abs(v) >= 1000) {
    return `${(v / 1000).toFixed(1)} kL`;
  }
  return `${Math.round(v).toLocaleString("en-US")} L`;
}

/** Distance or level in whole centimetres */
export function fmtCm(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Math.round(v)} cm`;
}

/** Signal RSSI in whole dBm */
export function fmtDbm(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Math.round(v)} dBm`;
}

/** Signal-to-noise ratio with 1 decimal place */
export function fmtSnr(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return `${v.toFixed(1)} dB`;
}

/** Generic single-decimal numeric formatter */
export function fmt1(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return "—";
  return v.toFixed(1);
}

/**
 * Relative age calculation relative to the dashboard clock (`asOf`),
 * not the browser clock, keeping static demo snapshots honest.
 */
export function ago(t: number | null | undefined, asOf: number): string {
  if (t == null || Number.isNaN(t)) return "no data";
  const m = Math.round((asOf - t) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}

/**
 * Formats a timestamp as "26 Oct, 14:05 IST" (or "14:05 IST" if withDate=false).
 */
export function stamp(t: number | null | undefined, tz: Tz = "IST", withDate = true): string {
  if (t == null || Number.isNaN(t)) return "—";
  const d = toZonedDate(t, tz);
  const time = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}`;
  if (!withDate) return `${time} ${tz}`;
  return `${pad2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]}, ${time} ${tz}`;
}

/**
 * High-precision timestamp including seconds: "26 Oct 14:05:48".
 */
export function stampSeconds(t: number | null | undefined, tz: Tz = "IST"): string {
  if (t == null || Number.isNaN(t)) return "—";
  const d = toZonedDate(t, tz);
  const time = `${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`;
  return `${pad2(d.getUTCDate())} ${MONTHS[d.getUTCMonth()]} ${time}`;
}

/**
 * Returns a stable day key YYYY-MM-DD for grouping in the specified timezone.
 */
export function dayKey(t: number, tz: Tz = "IST"): string {
  const d = toZonedDate(t, tz);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/**
 * Converts a YYYY-MM-DD key into a human label, e.g. "Mon 26 Oct".
 */
export function dayLabel(key: string): string {
  const parts = key.split("-").map(Number);
  if (parts.length !== 3 || parts.some((p) => p == null || Number.isNaN(p))) return key;
  const [year, month, day] = parts as [number, number, number];
  const d = new Date(Date.UTC(year, month - 1, day));
  return `${DAYS[d.getUTCDay()]} ${pad2(day)} ${MONTHS[month - 1]}`;
}

// Legacy formatters preserved for backwards compatibility with un-migrated components:
export const pct = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? "—" : `${Math.round(v)}%`);
export const litres = (v: number | null | undefined) => fmtLitres(v);
export const cm = (v: number | null | undefined) => fmtCm(v);

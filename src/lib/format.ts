import type { Tz } from "@/domain/time";
import { toZoned } from "@/domain/time";

export const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)}%`);
export const litres = (v: number | null | undefined) => (v == null ? "—" : v >= 1000 ? `${(v / 1000).toFixed(1)} kL` : `${Math.round(v)} L`);
export const cm = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v)} cm`);

/** Relative to the dashboard clock (`asOf`), not the browser clock — keeps a static snapshot honest. */
export function ago(t: number | null | undefined, asOf: number): string {
  if (t == null) return "no data";
  const m = Math.round((asOf - t) / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}
export function stamp(t: number, tz: Tz, withDate = true): string {
  const d = toZoned(t, tz);
  const p = (n: number) => String(n).padStart(2, "0");
  const time = `${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
  return withDate ? `${p(d.getUTCDate())} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()]} ${time} ${tz}` : `${time} ${tz}`;
}

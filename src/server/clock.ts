import { db } from "./db";
import { env } from "./env";

/**
 * Single source of "now". Rules/analytics never call Date.now().
 *  anchored → the newest reading in the store (the dataset is a static snapshot, so freshness stays honest)
 *  live     → wall clock (use once the TTS webhook is feeding data)
 */
let memo: { at: number; value: number } | undefined;
export function now(): number {
  if (env().CLOCK_MODE === "live") return Date.now();
  if (memo && Date.now() - memo.at < 5_000) return memo.value;
  const row = db().prepare("SELECT MAX(t) AS t FROM readings").get() as { t: number | null };
  memo = { at: Date.now(), value: row.t ?? Date.now() };
  return memo.value;
}
export const clockMode = () => env().CLOCK_MODE;

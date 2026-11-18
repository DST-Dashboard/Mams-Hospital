import { dayKey, dayLabel, IST_OFFSET_MS, type Tz } from "./format";

export const HOUR = 3600_000;
export const DAY = 24 * HOUR;

export interface Win {
  from: number;
  to: number;
}

export interface CalendarDayItem {
  key: string;       // "YYYY-MM-DD"
  label: string;     // e.g. "Mon 26 Oct"
  from: number;      // Epoch ms (inclusive start)
  to: number;        // Epoch ms (exclusive end of full day or clamped to dataset end)
  partial: boolean;  // True if dataset begins or ends within this day
}

export interface Scope {
  tank?: number | null;
  day?: string; // "last24h" or "YYYY-MM-DD"
  from?: number; // epoch ms
  to?: number;   // epoch ms
}

/**
 * Default Day scope: rolling 24 h [asOf − 24 h, asOf]
 */
export function dayWindow(asOf: number): Win {
  return {
    from: asOf - DAY,
    to: asOf,
  };
}

/**
 * Week scope: rolling 7 days [asOf − 7 d, asOf]
 */
export function weekWindow(asOf: number): Win {
  return {
    from: asOf - 7 * DAY,
    to: asOf,
  };
}

/**
 * Computes calendar day bounds in a specific timezone.
 */
export function windowForCalendarDay(key: string, tz: Tz = "IST"): Win {
  const parts = key.split("-").map(Number);
  const offset = tz === "IST" ? IST_OFFSET_MS : 0;

  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    const [y, m, d] = parts as [number, number, number];
    // Start of day in local time is midnight UTC minus offset
    const localMidnightUtc = Date.UTC(y, m - 1, d) - offset;
    return {
      from: localMidnightUtc,
      to: localMidnightUtc + DAY,
    };
  }

  // Fallback to today
  const now = Date.now();
  return dayWindow(now);
}

/**
 * Generates the list of calendar days that cover the [startT, endT] range in the given timezone.
 * Detects whether the day at the boundaries is partial.
 */
export function calendarDays(startT: number, endT: number, tz: Tz = "IST"): CalendarDayItem[] {
  if (startT > endT) return [];

  const items: CalendarDayItem[] = [];
  const offset = tz === "IST" ? IST_OFFSET_MS : 0;

  // Find start of the first calendar day
  const startZoned = new Date(startT + offset);
  const startDayUtc = Date.UTC(startZoned.getUTCFullYear(), startZoned.getUTCMonth(), startZoned.getUTCDate()) - offset;

  let currentStart = startDayUtc;
  while (currentStart < endT) {
    const currentEnd = currentStart + DAY;
    const key = dayKey(currentStart + offset + 1, "UTC"); // +1 ms to guarantee inside day
    const label = dayLabel(key);

    const isPartial = currentStart < startT || currentEnd > endT;

    items.push({
      key,
      label,
      from: currentStart,
      to: currentEnd,
      partial: isPartial,
    });

    currentStart += DAY;
  }

  return items;
}

/**
 * Resolution rule per O2:
 * span <= 36 h -> "raw"
 * span <= 30 d -> "1h"
 * else -> "1d"
 */
export function resolutionFor(win: Win): "raw" | "1h" | "1d" {
  const span = win.to - win.from;
  if (span <= 36 * HOUR) return "raw";
  if (span <= 30 * DAY) return "1h";
  return "1d";
}

/**
 * Parses URL search params or plain query object into Scope
 */
export function parseScope(searchParams: URLSearchParams | Record<string, string | string[] | undefined>): Scope {
  const getParam = (k: string): string | null => {
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(k);
    }
    const val = searchParams[k];
    if (Array.isArray(val)) return val[0] ?? null;
    return val ?? null;
  };

  const rawTank = getParam("tank") ?? getParam("node");
  const tank = rawTank ? Number(rawTank) : null;
  const day = getParam("day") || undefined;
  const rawFrom = getParam("from");
  const rawTo = getParam("to");

  let from: number | undefined;
  let to: number | undefined;

  if (rawFrom) {
    const parsed = Date.parse(rawFrom);
    if (!Number.isNaN(parsed)) from = parsed;
  }
  if (rawTo) {
    const parsed = Date.parse(rawTo);
    if (!Number.isNaN(parsed)) to = parsed;
  }

  return {
    tank: tank && !Number.isNaN(tank) ? tank : null,
    day,
    from,
    to,
  };
}

/**
 * Serializes scope parameters into a query string suitable for URL updates.
 */
export function serializeScope(scope: Scope): string {
  const params = new URLSearchParams();
  if (scope.tank != null) params.set("tank", String(scope.tank));
  if (scope.day) params.set("day", scope.day);
  if (scope.from) params.set("from", new Date(scope.from).toISOString());
  if (scope.to) params.set("to", new Date(scope.to).toISOString());
  const str = params.toString();
  return str ? `?${str}` : "";
}


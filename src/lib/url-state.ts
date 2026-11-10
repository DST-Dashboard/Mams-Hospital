import type { Scope } from "./windows";

/**
 * Parses time and tank scope from URLSearchParams or search string.
 * Invalid values fall back cleanly to safe defaults.
 */
export function readScope(
  searchParams: URLSearchParams | string | Record<string, string | string[] | undefined>
): Scope {
  let params: URLSearchParams;
  if (typeof searchParams === "string") {
    params = new URLSearchParams(searchParams.startsWith("?") ? searchParams.slice(1) : searchParams);
  } else if (searchParams instanceof URLSearchParams) {
    params = searchParams;
  } else {
    params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) {
      if (typeof v === "string") params.set(k, v);
      else if (Array.isArray(v) && v[0]) params.set(k, v[0]);
    }
  }

  const result: Scope = {};

  // Tank parameter
  const rawTank = params.get("tank");
  if (rawTank) {
    const parsedTank = Number.parseInt(rawTank, 10);
    if (!Number.isNaN(parsedTank) && parsedTank > 0) {
      result.tank = parsedTank;
    }
  }

  // Day parameter: "last24h" or "YYYY-MM-DD" or presets "1h", "6h", "24h", "custom"
  const rawDay = params.get("day");
  if (rawDay) {
    if (rawDay === "last24h" || /^\d{4}-\d{2}-\d{2}$/.test(rawDay) || ["1h", "6h", "24h", "custom"].includes(rawDay)) {
      result.day = rawDay;
    }
  }

  // From parameter: UTC ISO or Epoch ms
  const rawFrom = params.get("from");
  if (rawFrom) {
    const epoch = parseTimeParam(rawFrom);
    if (epoch !== null) {
      result.from = epoch;
    }
  }

  // To parameter: UTC ISO or Epoch ms
  const rawTo = params.get("to");
  if (rawTo) {
    const epoch = parseTimeParam(rawTo);
    if (epoch !== null) {
      result.to = epoch;
    }
  }

  // Ensure from <= to if both exist
  if (result.from && result.to && result.from > result.to) {
    // Swap if reversed
    const tmp = result.from;
    result.from = result.to;
    result.to = tmp;
  }

  return result;
}

function parseTimeParam(raw: string): number | null {
  // If pure numeric string, treat as epoch ms
  if (/^\d{10,14}$/.test(raw)) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }

  // Try parsing ISO string
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Serializes scope object into URL query string.
 * Uses ISO UTC strings for from/to for clear readability in bookmarks/share links.
 */
export function writeScope(scope: Scope): string {
  const params = new URLSearchParams();

  if (scope.tank !== undefined && scope.tank !== null) {
    params.set("tank", String(scope.tank));
  }

  if (scope.day) {
    params.set("day", scope.day);
  }

  if (scope.from !== undefined && scope.from !== null) {
    params.set("from", new Date(scope.from).toISOString());
  }

  if (scope.to !== undefined && scope.to !== null) {
    params.set("to", new Date(scope.to).toISOString());
  }

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Merges partial scope updates into an existing query string.
 */
export function updateScopeUrl(currentSearch: string, updates: Partial<Scope>): string {
  const current = readScope(currentSearch);
  const next = { ...current, ...updates };
  // If tank is explicitly set to null, remove it
  if (updates.tank === null) {
    delete next.tank;
  }
  return writeScope(next);
}

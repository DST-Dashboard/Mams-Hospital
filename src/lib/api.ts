import type { TankInput, TankRow } from "./types";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }

  fieldErrors(): Record<string, string> {
    if (!this.details || typeof this.details !== "object") return {};
    const map: Record<string, string> = {};
    if (Array.isArray(this.details)) {
      for (const item of this.details) {
        if (item && typeof item === "object") {
          const path = Array.isArray(item.path) ? item.path.join(".") : String(item.path ?? "");
          const msg = String(item.message ?? "");
          if (path && msg) map[path] = msg;
        }
      }
    }
    return map;
  }
}

function handle401(r: Response) {
  if (r.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("ohtms:session-expired"));
  }
}

function attachMockMeta<T>(data: T, res: Response): T {
  const isMock = res.headers.get("x-mock") === "1";
  if (data && (typeof data === "object" || typeof data === "function")) {
    Object.defineProperty(data, "__mock", {
      value: isMock,
      enumerable: false,
      configurable: true,
      writable: true,
    });
  }
  return data;
}

export async function fetcher<T>(url: string): Promise<T> {
  const r = await fetch(url, { credentials: "same-origin" });
  handle401(r);
  if (!r.ok) {
    const json = (await r.json().catch(() => null)) as { error?: string; details?: unknown } | null;
    throw new ApiError(r.status, json?.error ?? r.statusText, json?.details);
  }
  const data = (await r.json()) as T;
  return attachMockMeta(data, r);
}

async function mutate<T>(url: string, method: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const r = await fetch(url, {
    method,
    headers,
    credentials: "same-origin",
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  handle401(r);
  if (!r.ok) {
    const json = (await r.json().catch(() => null)) as { error?: string; details?: unknown } | null;
    throw new ApiError(r.status, json?.error ?? r.statusText, json?.details);
  }
  const data = (await r.json().catch(() => ({}))) as T;
  return attachMockMeta(data, r);
}

export const post = <T = unknown>(url: string, body?: unknown) => mutate<T>(url, "POST", body);
export const put = <T = unknown>(url: string, body?: unknown) => mutate<T>(url, "PUT", body);
export const patch = <T = unknown>(url: string, body?: unknown) => mutate<T>(url, "PATCH", body);
export const del = <T = unknown>(url: string) => mutate<T>(url, "DELETE");

/**
 * Transforms a TankRow into a complete TankInput payload so PATCH /api/tanks/:id
 * does not accidentally reset omitted fields to null or defaults.
 */
export function tankToInput(row: TankRow, overrides?: Partial<TankInput>): TankInput {
  const isCylinder = row.geometry.shape.kind === "cylinder";
  const base: TankInput = {
    label: row.label,
    deviceId: row.deviceId,
    zone: row.zone,
    location: row.location,
    status: row.status,
    shape: row.geometry.shape.kind,
    heightCm: row.geometry.heightCm,
    deadZoneCm: row.geometry.deadZoneCm,
    dimsConfirmed: row.dimsConfirmed,
    warnPct: row.thresholds.warnPct,
    critPct: row.thresholds.critPct,
    emptyPct: row.thresholds.emptyPct,
    ...(isCylinder
      ? { radiusCm: (row.geometry.shape as { kind: "cylinder"; radiusCm: number }).radiusCm }
      : {
          widthCm: (row.geometry.shape as { kind: "rectangle"; widthCm: number; lengthCm: number }).widthCm,
          lengthCm: (row.geometry.shape as { kind: "rectangle"; widthCm: number; lengthCm: number }).lengthCm,
        }),
  };
  return { ...base, ...overrides };
}

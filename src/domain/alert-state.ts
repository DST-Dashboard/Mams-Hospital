/**
 * [BE-02] OWNER: backend · State machine: active → acknowledged → snoozed → resolved / escalated / suppressed.
 */
import type { Severity } from "./types";

export type AlertState = "active" | "acknowledged" | "snoozed" | "resolved" | "suppressed" | "escalated";

export type AlertAction =
  | { type: "ACKNOWLEDGE"; userId: number; note?: string; at: number }
  | { type: "SNOOZE"; minutes: number; at: number }
  | { type: "RESOLVE"; note?: string; at: number }
  | { type: "EXPIRE_SNOOZE"; at: number }
  | { type: "ESCALATE"; at: number }
  | { type: "SUPPRESS"; reason?: string; at: number }
  | { type: "UNSUPPRESS"; at: number };

const VALID_TRANSITIONS: Record<AlertState, AlertState[]> = {
  active: ["acknowledged", "snoozed", "resolved", "escalated", "suppressed"],
  acknowledged: ["snoozed", "resolved", "escalated"],
  snoozed: ["active", "acknowledged", "resolved"],
  escalated: ["acknowledged", "resolved"],
  suppressed: ["active", "resolved"],
  resolved: [], // Terminal state
};

export function canTransition(from: AlertState, to: AlertState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isSnoozeExpired(snoozedUntil: number | null | undefined, nowMs: number): boolean {
  if (!snoozedUntil) return false;
  return nowMs >= snoozedUntil;
}

/**
 * Checks whether `nowMs` falls within quiet hours defined as "HH:MM" (e.g., "22:00" to "06:00").
 */
export function isInQuietHours(nowMs: number, quietStart: string | null | undefined, quietEnd: string | null | undefined): boolean {
  if (!quietStart || !quietEnd) return false;
  const d = new Date(nowMs);
  const curMinutes = d.getHours() * 60 + d.getMinutes();

  const [startH, startM] = quietStart.split(":").map(Number);
  const [endH, endM] = quietEnd.split(":").map(Number);
  if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) return false;

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes < endMinutes) {
    return curMinutes >= startMinutes && curMinutes < endMinutes;
  } else {
    // Overnight quiet hours, e.g. 22:00 to 06:00
    return curMinutes >= startMinutes || curMinutes < endMinutes;
  }
}

/**
 * Evaluates whether an alert should be suppressed due to quiet hours.
 * Only non-critical alerts (info, warning) are deferred/suppressed during quiet hours.
 * Critical and emergency alerts are NEVER deferred.
 */
export function shouldDeferForQuietHours(severity: Severity, nowMs: number, quietStart?: string | null, quietEnd?: string | null): boolean {
  if (severity === "critical" || severity === "emergency") {
    return false;
  }
  return isInQuietHours(nowMs, quietStart, quietEnd);
}

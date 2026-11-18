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
  if ([startH, startM, endH, endM].some((part) => part === undefined || Number.isNaN(part))) return false;

  const startMinutes = startH! * 60 + startM!;
  const endMinutes = endH! * 60 + endM!;

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

export interface AlertStateContext {
  state: AlertState;
  openedAt: number;
  acknowledgedAt?: number | null;
  acknowledgedBy?: number | null;
  snoozedUntil?: number | null;
  resolvedAt?: number | null;
}

/** Pure state transition machine for alert lifecycles */
export function transitionAlert(
  alert: AlertStateContext,
  action: AlertAction
): AlertStateContext {
  switch (action.type) {
    case "ACKNOWLEDGE":
      return {
        ...alert,
        acknowledgedAt: action.at,
        acknowledgedBy: action.userId,
      };
    case "SNOOZE":
      return {
        ...alert,
        state: "snoozed",
        snoozedUntil: action.at + action.minutes * 60_000,
      };
    case "EXPIRE_SNOOZE":
      return {
        ...alert,
        state: "active",
        snoozedUntil: null,
      };
    case "ESCALATE":
      if (!alert.acknowledgedAt && action.at - alert.openedAt >= 30 * 60_000) {
        return {
          ...alert,
          state: "escalated",
        };
      }
      return alert;
    case "RESOLVE":
      return {
        ...alert,
        state: "resolved",
        resolvedAt: action.at,
        snoozedUntil: null,
      };
    case "SUPPRESS":
      return { ...alert, state: "suppressed" };
    case "UNSUPPRESS":
      return { ...alert, state: "active" };
  }
}

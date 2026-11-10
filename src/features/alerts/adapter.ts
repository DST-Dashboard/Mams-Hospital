import type { AlertRow } from "@/lib/types";
import type { AlertDTO } from "@/contracts/alerts";
import type { Severity } from "./registry";

export interface NormalizedAlert {
  id: number;
  tankId: number;
  tankLabel: string;
  type: string;
  severity: Severity;
  state: "active" | "acknowledged" | "snoozed" | "resolved" | "suppressed" | "escalated";
  message: string;
  value: number | null;
  openedAt: number;
  acknowledgedAt: number | null;
  ackNote: string | null;
  resolvedAt: number | null;
  snoozedUntil: number | null;
  acknowledgedByName: string | null;
  triggerT: number | null;
  triggerDistanceCm: number | null;
  simulated: boolean;
}

/**
 * Normalizes either an AlertRow (live API) or AlertDTO (future/mock API)
 * into a single unified client shape.
 */
export function normalizeAlert(
  alert: AlertRow | AlertDTO | Record<string, unknown>,
  tankLabelMap?: Record<number, string>
): NormalizedAlert {
  const anyA = alert as Record<string, unknown>;
  const id = Number(anyA.id ?? 0);
  const tankId = Number(anyA.tankId ?? anyA.tank_id ?? 0);
  const tankLabel =
    (typeof anyA.tankLabel === "string" ? anyA.tankLabel : null) ??
    (tankLabelMap ? tankLabelMap[tankId] : null) ??
    `Tank ${tankId}`;

  const type = String(anyA.type ?? "LOW_LEVEL");
  const severity = (anyA.severity ?? "warning") as Severity;
  const state = (anyA.state ?? "active") as NormalizedAlert["state"];
  const message = String(anyA.message ?? "");
  const value = anyA.value != null ? Number(anyA.value) : null;
  const openedAt = Number(anyA.openedAt ?? anyA.opened_at ?? 0);
  const acknowledgedAt = anyA.acknowledgedAt != null ? Number(anyA.acknowledgedAt) : null;
  const ackNote = typeof anyA.ackNote === "string" ? anyA.ackNote : null;
  const resolvedAt = anyA.resolvedAt != null ? Number(anyA.resolvedAt) : null;
  const snoozedUntil = anyA.snoozedUntil != null ? Number(anyA.snoozedUntil) : null;

  const ackByName =
    typeof anyA.acknowledgedByName === "string"
      ? anyA.acknowledgedByName
      : anyA.acknowledgedBy && typeof anyA.acknowledgedBy === "object"
        ? (anyA.acknowledgedBy as { name?: string }).name ?? null
        : null;

  const triggerT = anyA.triggerT != null ? Number(anyA.triggerT) : null;
  const triggerDistanceCm = anyA.triggerDistanceCm != null ? Number(anyA.triggerDistanceCm) : null;
  const simulated = Boolean(anyA.simulated);

  return {
    id,
    tankId,
    tankLabel,
    type,
    severity,
    state,
    message,
    value,
    openedAt,
    acknowledgedAt,
    ackNote,
    resolvedAt,
    snoozedUntil,
    acknowledgedByName: ackByName,
    triggerT,
    triggerDistanceCm,
    simulated,
  };
}

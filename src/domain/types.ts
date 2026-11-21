/**
 * Core vocabulary. Pure types — no I/O, no React.
 *
 * GOLDEN RULE (docs/ARCHITECTURE.md §4): the sensor reports DISTANCE (sensor → water surface).
 * Everything users care about is LEVEL (floor → water surface) = height − distance.
 * Distance is stored; level/volume/% are always derived. All deltas are computed in LEVEL space,
 * where Δlevel > 0 means the tank is filling.
 */
export type TankShape =
  | { kind: "cylinder"; radiusCm: number }
  | { kind: "rectangle"; widthCm: number; lengthCm: number };

export interface TankGeometry {
  heightCm: number; // sensor face → tank floor
  deadZoneCm: number; // minimum distance the sensor can read reliably
  shape: TankShape;
}

export type Quality = "ok" | "dead_zone" | "out_of_range" | "invalid";

export interface Reading {
  t: number; // epoch ms (UTC)
  distanceCm: number | null; // null = no usable value (never 0!)
  fCnt?: number | null;
  rssi?: number | null;
  snr?: number | null;
  batteryPct?: number | null;
  source?: string | null;
}

export interface Derived {
  distanceCm: number | null;
  levelCm: number | null;
  levelPct: number | null;
  volumeL: number | null;
  quality: Quality;
}

export type Severity = "info" | "warning" | "critical" | "emergency";

/**
 * Types of alerts emitted by the system.
 */
export type AlertType =
  | "LOW_LEVEL"
  | "CRITICAL_LOW"
  | "EMPTY"
  | "OVERFLOW_RISK"
  | "SENSOR_FAULT"
  | "NO_DATA"
  | "RAPID_DRAIN"
  | "BATTERY_LOW"
  | "PREDICTED_EMPTY"
  | "FLATLINE"
  | "PUMP_STUCK"
  | "DATA_GAP"
  | "GATEWAY_OFFLINE"
  | "FLAPPING";



export interface Thresholds {
  warnPct: number; // default 40
  critPct: number; // default 20
  emptyPct: number; // default 5
  overflowMarginCm?: number; // alert when distance <= deadZone + margin (default 10)
  persistence?: number; // consecutive readings required to raise (default 3 ≈ 15 min)
  cooldownMin?: number; // minimum minutes between repeat raises of the same rule (default 30)
  hysteresisPct?: number; // must recover this far above a threshold to clear (default 5)
  noDataMin?: number; // silence before NO_DATA (default 15)
  spikeCm?: number; // |jump| vs. recent median that counts as a sensor spike
  quietStart?: string | null; // e.g. "22:00"
  quietEnd?: string | null; // e.g. "06:00"


}

export const DEFAULT_THRESHOLDS: Required<Thresholds> = {
  warnPct: 40,
  critPct: 20,
  emptyPct: 5,
  overflowMarginCm: 10,
  persistence: 3,
  cooldownMin: 30,
  hysteresisPct: 5,
  noDataMin: 15,
  spikeCm: 80,
  quietStart: null,
  quietEnd: null,
};

export function resolveThresholds(thresholds: Thresholds): Required<Thresholds> {
  return {
    warnPct: thresholds.warnPct,
    critPct: thresholds.critPct,
    emptyPct: thresholds.emptyPct,
    overflowMarginCm: thresholds.overflowMarginCm ?? DEFAULT_THRESHOLDS.overflowMarginCm,
    persistence: thresholds.persistence ?? DEFAULT_THRESHOLDS.persistence,
    cooldownMin: thresholds.cooldownMin ?? DEFAULT_THRESHOLDS.cooldownMin,
    hysteresisPct: thresholds.hysteresisPct ?? DEFAULT_THRESHOLDS.hysteresisPct,
    noDataMin: thresholds.noDataMin ?? DEFAULT_THRESHOLDS.noDataMin,
    spikeCm: thresholds.spikeCm ?? DEFAULT_THRESHOLDS.spikeCm,
    quietStart: thresholds.quietStart ?? null,
    quietEnd: thresholds.quietEnd ?? null,
  };
}

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
}

export interface Derived {
  distanceCm: number | null;
  levelCm: number | null;
  levelPct: number | null;
  volumeL: number | null;
  quality: Quality;
}

export type Severity = "info" | "warning" | "critical" | "emergency";

export interface Thresholds {
  warnPct: number; // default 40
  critPct: number; // default 20
  emptyPct: number; // default 5
  overflowMarginCm: number; // alert when distance <= deadZone + margin (default 10)
  persistence: number; // consecutive readings required to raise (default 3 ≈ 15 min)
  cooldownMin: number; // minimum minutes between repeat raises of the same rule (default 30)
  hysteresisPct: number; // must recover this far above a threshold to clear (default 5)
  noDataMin: number; // silence before NO_DATA (default 15)
  spikeCm: number; // |jump| vs. recent median that counts as a sensor spike
}

export const DEFAULT_THRESHOLDS: Thresholds = {
  warnPct: 40,
  critPct: 20,
  emptyPct: 5,
  overflowMarginCm: 10,
  persistence: 3,
  cooldownMin: 30,
  hysteresisPct: 5,
  noDataMin: 15,
  spikeCm: 80,
};

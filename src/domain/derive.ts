import { volumeLitres } from "./geometry";
import type { Derived, TankGeometry } from "./types";

const round = (n: number, dp = 1) => Math.round(n * 10 ** dp) / 10 ** dp;

/** distance → level → % → litres. The ONLY place this conversion exists. */
export function derive(distanceCm: number | null | undefined, g: TankGeometry): Derived {
  if (distanceCm == null || !Number.isFinite(distanceCm) || distanceCm < 0) {
    return { distanceCm: null, levelCm: null, levelPct: null, volumeL: null, quality: "invalid" };
  }
  if (distanceCm > g.heightCm) {
    // Reads beyond the tank floor: cannot be water. Keep the raw distance, refuse to invent a level.
    return { distanceCm, levelCm: null, levelPct: null, volumeL: null, quality: "out_of_range" };
  }
  const levelCm = g.heightCm - distanceCm;
  return {
    distanceCm,
    levelCm: round(levelCm),
    levelPct: round((levelCm / g.heightCm) * 100),
    volumeL: Math.round(volumeLitres(g.shape, levelCm)),
    quality: distanceCm < g.deadZoneCm ? "dead_zone" : "ok",
  };
}

/** Inverse helper (simulation, tests, "what distance means 40 %?" threshold lines). */
export function distanceForPct(pct: number, g: TankGeometry): number {
  return g.heightCm - (pct / 100) * g.heightCm;
}

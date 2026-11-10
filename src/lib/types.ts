import type { buildDashboard } from "@/server/services/dashboard";
import type { TankRow, TankInput } from "@/server/repos/tanks";
import type { AlertRow } from "@/server/repos/alerts";
import type { Session as MeResponse, Role } from "@/server/auth/session";

// Type-only imports preserve strict server isolation while guaranteeing zero contract drift.
export type { TankRow, TankInput, AlertRow, MeResponse, Role };

export type DashboardData = ReturnType<typeof buildDashboard>;
export type TankCardData = DashboardData["tanks"][number];

export interface ReadingsResponse {
  tankId: number;
  resolution: string;
  from: number;
  to: number;
  simulated: boolean;
  dimsConfirmed: boolean;
  count: number;
  points: {
    t: number;
    distanceCm: number | null;
    levelCm: number | null;
    levelPct: number | null;
    volumeL: number | null;
    quality: string;
  }[];
}

export interface AnalyticsResponse {
  samples: number;
  validSamples: number;
  completenessPct: number;
  consumedL: number;
  pumpedInL: number;
  minutesToEmpty: number | null;
  levelPct: {
    mean: number;
    min: number;
    max: number;
    std: number;
    p10: number;
    p50: number;
    p90: number;
  } | null;
  events: {
    kind: "fill" | "drain";
    startT: number;
    endT: number;
    startLevelCm: number;
    endLevelCm: number;
    deltaCm: number;
  }[];
}

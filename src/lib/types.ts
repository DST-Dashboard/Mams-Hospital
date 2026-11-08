import type { buildDashboard } from "@/server/services/dashboard";
// Type-only import: the browser bundle never pulls server code, but API/UI contracts can't drift.
export type DashboardData = ReturnType<typeof buildDashboard>;
export type TankCardData = DashboardData["tanks"][number];
export interface ReadingsResponse { tankId: number; resolution: string; from: number; to: number; simulated: boolean; dimsConfirmed: boolean; count: number;
  points: { t: number; distanceCm: number | null; levelCm: number | null; levelPct: number | null; volumeL: number | null; quality: string }[] }
export interface AnalyticsResponse { samples: number; validSamples: number; completenessPct: number; consumedL: number; pumpedInL: number; minutesToEmpty: number | null;
  levelPct: { mean: number; min: number; max: number; std: number; p10: number; p50: number; p90: number } | null;
  events: { kind: "fill" | "drain"; startT: number; endT: number; startLevelCm: number; endLevelCm: number; deltaCm: number }[] }

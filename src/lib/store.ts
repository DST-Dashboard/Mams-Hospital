"use client";
import { create } from "zustand";
import type { Tz } from "@/domain/time";

export type RangeKey = "6h" | "24h" | "7d";
interface UiState { tz: Tz; setTz: (t: Tz) => void; range: RangeKey; setRange: (r: RangeKey) => void }
/** Client-only UI state. Server data lives in SWR; this holds only choices the user makes. */
export const useUi = create<UiState>((set) => ({ tz: "IST", setTz: (tz) => set({ tz }), range: "24h", setRange: (range) => set({ range }) }));
export const RANGE_MS: Record<RangeKey, number> = { "6h": 6 * 3600_000, "24h": 24 * 3600_000, "7d": 7 * 24 * 3600_000 };

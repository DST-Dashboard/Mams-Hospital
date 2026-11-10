"use client";

import { create } from "zustand";
import type { Tz } from "./format";

export type RangeKey = "6h" | "24h" | "7d";
export const RANGE_MS: Record<RangeKey, number> = {
  "6h": 6 * 3600_000,
  "24h": 24 * 3600_000,
  "7d": 7 * 24 * 3600_000,
};

export type Theme = "light" | "dark";
export type TextSize = 15 | 16 | 18;

export interface UiStore {
  tz: Tz;
  setTz: (tz: Tz) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  textSize: TextSize;
  setTextSize: (size: TextSize) => void;
  lastTankId: number | null;
  setLastTankId: (id: number) => void;

  // Legacy fields preserved for existing components
  range: RangeKey;
  setRange: (range: RangeKey) => void;

  initFromStorage: () => void;
}

export const useUi = create<UiStore>((set, get) => ({
  tz: "IST",
  theme: "light",
  textSize: 16,
  lastTankId: null,
  range: "24h",

  setTz: (tz: Tz) => {
    set({ tz });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ohtms:tz", tz);
      } catch {}
    }
  },

  setTheme: (theme: Theme) => {
    set({ theme });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("theme", theme);
        localStorage.setItem("ohtms:theme", theme);
        document.documentElement.dataset.theme = theme;
      } catch {}
    }
  },

  toggleTheme: () => {
    const next = get().theme === "dark" ? "light" : "dark";
    get().setTheme(next);
  },

  setTextSize: (textSize: TextSize) => {
    set({ textSize });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ohtms:text-size", String(textSize));
        document.documentElement.dataset.textSize = String(textSize);
      } catch {}
    }
  },

  setLastTankId: (lastTankId: number) => {
    set({ lastTankId });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("ohtms:last-tank-id", String(lastTankId));
      } catch {}
    }
  },

  setRange: (range: RangeKey) => set({ range }),

  initFromStorage: () => {
    if (typeof window === "undefined") return;
    try {
      const savedTheme = (localStorage.getItem("theme") || localStorage.getItem("ohtms:theme")) as Theme | null;
      if (savedTheme === "light" || savedTheme === "dark") {
        set({ theme: savedTheme });
        document.documentElement.dataset.theme = savedTheme;
      }

      const savedTz = localStorage.getItem("ohtms:tz") as Tz | null;
      if (savedTz === "IST" || savedTz === "UTC") {
        set({ tz: savedTz });
      }

      const savedSize = Number(localStorage.getItem("ohtms:text-size"));
      if (savedSize === 15 || savedSize === 16 || savedSize === 18) {
        set({ textSize: savedSize as TextSize });
        document.documentElement.dataset.textSize = String(savedSize);
      }

      const savedTankId = Number(localStorage.getItem("ohtms:last-tank-id"));
      if (savedTankId && !Number.isNaN(savedTankId)) {
        set({ lastTankId: savedTankId });
      }
    } catch {}
  },
}));

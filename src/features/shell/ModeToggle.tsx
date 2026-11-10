"use client";

import React from "react";
import { Moon, Sun, FlaskConical, Radio } from "lucide-react";
import { useUi } from "@/lib/store";
import { Tooltip } from "@/components/ui/Tooltip";

export function TimezoneToggle() {
  const { tz, setTz } = useUi();

  return (
    <div
      role="radiogroup"
      aria-label="Timezone display toggle"
      className="segmented py-0.5 px-1 bg-[var(--bg-card)] border-[var(--bd)]"
    >
      <button
        type="button"
        role="radio"
        aria-checked={tz === "IST"}
        onClick={() => setTz("IST")}
        className={`segmented-item py-0.5 px-1.5 text-[11px] ${
          tz === "IST" ? "active bg-[var(--brand-800)] text-white" : ""
        }`}
      >
        IST
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={tz === "UTC"}
        onClick={() => setTz("UTC")}
        className={`segmented-item py-0.5 px-1.5 text-[11px] ${
          tz === "UTC" ? "active bg-[var(--brand-800)] text-white" : ""
        }`}
      >
        UTC
      </button>
    </div>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useUi();

  return (
    <Tooltip text={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Current theme is ${theme}. Switch to ${theme === "dark" ? "light" : "dark"} theme`}
        className="btn btn-outline btn-icon w-7 h-7 p-0 rounded-full border-[var(--bd)] text-[var(--tx-strip)] hover:text-[var(--brand-800)]"
      >
        {theme === "dark" ? <Sun size={13} aria-hidden /> : <Moon size={13} aria-hidden />}
      </button>
    </Tooltip>
  );
}

export function TextSizeControls() {
  const { textSize, setTextSize } = useUi();

  return (
    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--tx-strip)]">
      <button
        type="button"
        onClick={() => setTextSize(15)}
        aria-label="Set small text size (15px)"
        className={`px-1 hover:text-[var(--brand-800)] ${textSize === 15 ? "text-[var(--accent-500)] font-bold" : ""}`}
      >
        A-
      </button>
      <button
        type="button"
        onClick={() => setTextSize(16)}
        aria-label="Set default text size (16px)"
        className={`px-1 hover:text-[var(--brand-800)] ${textSize === 16 ? "text-[var(--accent-500)] font-bold" : ""}`}
      >
        A
      </button>
      <button
        type="button"
        onClick={() => setTextSize(18)}
        aria-label="Set large text size (18px)"
        className={`px-1 hover:text-[var(--brand-800)] ${textSize === 18 ? "text-[var(--accent-500)] font-bold" : ""}`}
      >
        A+
      </button>
    </div>
  );
}

export function ModeToggle({ clockMode = "anchored" }: { clockMode?: "anchored" | "live" }) {
  const isDemo = clockMode === "anchored";

  return (
    <div
      role="radiogroup"
      aria-label="Data mode setting"
      className="segmented py-0.5 px-1 bg-[var(--bg-card)] border-[var(--bd)] select-none"
    >
      <Tooltip text={isDemo ? "Active demonstration mode (anchored clock)" : "Server setting (CLOCK_MODE)"}>
        <button
          type="button"
          role="radio"
          aria-checked={isDemo}
          disabled={!isDemo}
          className={`segmented-item py-0.5 px-2 text-[11px] gap-1 ${
            isDemo ? "active font-bold text-[var(--accent-500)] bg-[var(--bg-subtle)]" : "opacity-40"
          }`}
        >
          <FlaskConical size={11} aria-hidden />
          <span>Demo</span>
        </button>
      </Tooltip>

      <Tooltip text={!isDemo ? "Active live hardware streaming" : "Server setting (CLOCK_MODE=live)"}>
        <button
          type="button"
          role="radio"
          aria-checked={!isDemo}
          disabled={isDemo}
          className={`segmented-item py-0.5 px-2 text-[11px] gap-1 ${
            !isDemo ? "active font-bold text-[var(--live)] bg-[var(--bg-subtle)]" : "opacity-40"
          }`}
        >
          <Radio size={11} aria-hidden />
          <span>Live</span>
        </button>
      </Tooltip>
    </div>
  );
}

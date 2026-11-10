"use client";

import React from "react";
import { Router } from "lucide-react";
import { FreshnessPill } from "@/components/status/badges";
import { ModeToggle, TextSizeControls, ThemeToggle, TimezoneToggle } from "./ModeToggle";
import { useDashboard } from "@/lib/hooks";
import { stamp } from "@/lib/format";

export function UtilityStrip() {
  const { data: dashboard } = useDashboard();
  const clockMode = dashboard?.clockMode ?? "anchored";
  const asOf = dashboard?.asOf;

  // Derive oldest tank age or min age
  const tanks = dashboard?.tanks || [];
  const minAge = tanks.length > 0 ? Math.min(...tanks.map((t) => t.current?.ageMin ?? 999)) : null;

  const isSnapshot = clockMode === "anchored";
  const snapshotText = asOf ? `Snapshot · last reading ${stamp(asOf, "IST", true)}` : undefined;

  return (
    <div className="utility-strip bg-[var(--bg-strip)] border-b border-[var(--bd-strip)] text-[var(--tx-strip)] text-[12px] font-semibold py-1.5 select-none">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 flex items-center justify-between flex-wrap gap-4">
        {/* Left cluster */}
        <div className="flex items-center gap-4 flex-wrap">
          <FreshnessPill
            ageMin={minAge}
            snapshot={isSnapshot}
            label={snapshotText}
          />
          <span className="text-[var(--bd-strong)]" aria-hidden>|</span>
          <div className="inline-flex items-center gap-1.5 text-[var(--tx-strip)]">
            <Router size={13} className="text-[var(--live)]" aria-hidden />
            <span>SenseCap gateway online</span>
          </div>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-3.5 flex-wrap">
          <a
            href="#workspace"
            className="text-[var(--tx-strip)] hover:text-[var(--brand-800)] underline-offset-2 hover:underline text-[11px]"
          >
            Skip to main content
          </a>

          <TextSizeControls />

          <TimezoneToggle />

          <ThemeToggle />

          <ModeToggle clockMode={clockMode} />
        </div>
      </div>
    </div>
  );
}


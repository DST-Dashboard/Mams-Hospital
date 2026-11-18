"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AlertCircle, Ruler, Wrench } from "lucide-react";
import type { TankCardData } from "@/lib/types";
import { TankSvg, tankStateOf, type TankState } from "@/components/tank/TankSvg";
import { Sparkline } from "@/components/charts/Sparkline";
import {
  FreshnessPill,
  SourceChip,
  SeverityIcon,
} from "@/components/status/badges";
import { fmtCm, fmtFill, fmtLitres, stamp } from "@/lib/format";
import { useUi } from "@/lib/store";
import { useAnalytics } from "@/lib/hooks";
import { isUnstable } from "@/lib/series";
import "@/styles/views-monitoring.css";

export interface TankTileProps {
  tank: TankCardData;
  asOf: number;
  className?: string;
}

export function TankTile({ tank, asOf, className }: TankTileProps) {
  const setLastTankId = useUi((s) => s.setLastTankId);

  // Fetch 7-day analytics for range, flapping detection, and predictive exhaustion
  const { data: analytics } = useAnalytics(tank.id, asOf - 7 * 86400_000, asOf);

  const state: TankState = tankStateOf(tank);
  const cur = tank.current;
  const levelPct = cur?.levelPct ?? null;
  const distanceCm = cur?.distanceCm ?? null;
  const volumeL = cur?.volumeL ?? null;
  const capacityL = tank.capacityL ?? null;

  // Flash value when levelPct changes across refreshes (§16)
  const [flashing, setFlashing] = useState(false);
  const prevPctRef = useRef(levelPct);

  useEffect(() => {
    if (prevPctRef.current !== null && levelPct !== null && prevPctRef.current !== levelPct) {
      setFlashing(true);
      const timer = setTimeout(() => setFlashing(false), 600);
      return () => clearTimeout(timer);
    }
    prevPctRef.current = levelPct;
  }, [levelPct]);

  // Derived 7-day stats
  const isFlapping = isUnstable(analytics?.events);
  const minWeekPct = analytics?.levelPct?.min != null ? Math.round(analytics.levelPct.min) : null;
  const maxWeekPct = analytics?.levelPct?.max != null ? Math.round(analytics.levelPct.max) : null;
  const hasWeekRange = minWeekPct !== null && maxWeekPct !== null;

  // Predictive exhaustion (Empty in ~X h)
  const minutesToEmpty = analytics?.minutesToEmpty;
  const showExhaustion =
    minutesToEmpty !== null &&
    minutesToEmpty !== undefined &&
    minutesToEmpty > 0 &&
    levelPct !== null &&
    levelPct < tank.thresholds.warnPct;

  const hoursToEmpty = minutesToEmpty ? Math.round(minutesToEmpty / 60) : 0;
  const exhaustionText =
    minutesToEmpty && minutesToEmpty < 60
      ? `Empty in ~${minutesToEmpty} min`
      : `Empty in ~${hoursToEmpty} h`;

  // Status bar tone
  const barToneClass =
    state === "emergency"
      ? "mon-status-bar--emg"
      : state === "critical"
      ? "mon-status-bar--crit"
      : state === "warning"
      ? "mon-status-bar--warn"
      : state === "ok"
      ? "mon-status-bar--ok"
      : "mon-status-bar--neutral";

  // State-colored fill percentage text
  const pctColorClass =
    state === "warning"
      ? "text-[var(--warn-tx)]"
      : state === "critical" || state === "emergency"
      ? "text-[var(--err-tx)]"
      : state === "fault" || state === "nodata"
      ? "text-[var(--tx-soft)]"
      : "text-[var(--tx-head)]";

  // Full spoken accessibility label
  const spokenAria = `${tank.label}: ${
    levelPct !== null ? `${Math.round(levelPct)} percent full` : "no reading"
  }, ${fmtLitres(volumeL)} of ${fmtLitres(capacityL)}, distance ${fmtCm(distanceCm)}, status ${state}.`;

  const absStampIST = cur?.t ? stamp(cur.t, "IST") : "—";
  const absStampUTC = cur?.t ? stamp(cur.t, "UTC") : "—";
  const freshnessTitle = `Last reading: ${absStampIST} IST (${absStampUTC} UTC)`;

  return (
    <Link
      href={`/tanks/${tank.id}`}
      onClick={() => setLastTankId(tank.id)}
      className={clsx("mon-tile mon-tile--responsive group", className)}
      aria-label={spokenAria}
    >
      {/* 4px Top Status Bar */}
      <div className={clsx("mon-status-bar", barToneClass)} />

      {/* Visual Vessel representation */}
      <div className="mon-tile-visual flex items-center justify-center py-2">
        <TankSvg
          shape="cylinder"
          levelPct={levelPct}
          distanceCm={distanceCm}
          heightCm={300}
          deadZoneCm={25}
          thresholds={tank.thresholds}
          state={state}
          size="tile"
          label={tank.label}
          litres={volumeL}
        />
      </div>

      {/* Details & Metrics */}
      <div className="mon-tile-details flex flex-col w-full">
        {/* Header: Label + Open Alerts / Status */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <h3 className="card-title text-[17px] font-bold text-[var(--tx-head)] group-hover:text-[var(--brand-800)] transition-colors line-clamp-1">
            {tank.label}
          </h3>

          {tank.openAlerts > 0 && tank.worstSeverity ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--err-tx)]">
              <SeverityIcon severity={tank.worstSeverity} size={14} />
              <span>{tank.openAlerts}</span>
            </span>
          ) : state === "maintenance" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--info-tx)]">
              <Wrench size={12} aria-hidden />
              <span>Maint.</span>
            </span>
          ) : null}
        </div>

        {/* Chips Row: SourceChip, Provisional, Unstable Signal */}
        <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
          <SourceChip simulated={tank.simulated} />

          {!tank.dimsConfirmed && (
            <span
              className="chip chip--neutral text-[10px] py-0 px-1.5 font-bold"
              title="Dimensions not confirmed: volume and alarms are provisional"
            >
              PROVISIONAL
            </span>
          )}

          {isFlapping && (
            <span
              className="chip chip--warn text-[10px] py-0 px-1.5 font-bold inline-flex items-center gap-1"
              title="Flapping signal detected (>40 events): consumption unreliable"
            >
              <AlertCircle size={10} aria-hidden />
              <span>UNSTABLE SIGNAL</span>
            </span>
          )}
        </div>

        {/* Percent Full (32px / 900) */}
        <div className="flex items-baseline gap-2">
          <div
            className={clsx(
              "num text-[32px] font-black leading-none tracking-tight rounded px-1 -mx-1 transition-colors",
              pctColorClass,
              flashing && "mon-tile-flash"
            )}
          >
            {fmtFill(levelPct)}
          </div>
        </div>

        {/* Volume: 3.0 kL of 9.4 kL */}
        <div className="text-[13px] font-semibold text-[var(--tx-main)] mt-1">
          <span>{fmtLitres(volumeL)}</span>{" "}
          <span className="text-[var(--tx-quiet)] font-normal">
            of {fmtLitres(capacityL)}
          </span>
        </div>

        {/* Sensor Distance Row */}
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--tx-body)] mt-1">
          <Ruler size={13} className="text-[var(--tx-quiet)] flex-shrink-0" aria-hidden />
          <span>Sensor to water: {fmtCm(distanceCm)}</span>
        </div>

        {/* Freshness Row with IST/UTC title */}
        <div className="flex items-center justify-between text-[11.5px] mt-2.5 pt-2 border-t border-[var(--bd-soft)]" title={freshnessTitle}>
          <FreshnessPill ageMin={cur?.ageMin ?? null} snapshot={true} />
          {hasWeekRange && (
            <span className="text-[11px] text-[var(--tx-quiet)] font-medium">
              7d: {minWeekPct}–{maxWeekPct}%
            </span>
          )}
        </div>

        {/* Predictive Exhaustion Line */}
        {showExhaustion && (
          <div className="text-[11px] font-bold text-[var(--warn-tx)] mt-1.5 flex items-center gap-1">
            <span>⚠️</span>
            <span>{exhaustionText}</span>
          </div>
        )}

        {/* 24-Hour Sparkline */}
        <div className="mon-sparkline-wrap">
          <Sparkline
            points={tank.spark}
            height={28}
            color={
              state === "emergency" || state === "critical"
                ? "var(--err-tx)"
                : state === "warning"
                ? "var(--warn-tx)"
                : "var(--data-600)"
            }
          />
        </div>
      </div>
    </Link>
  );
}

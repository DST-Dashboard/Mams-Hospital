"use client";

import React from "react";
import clsx from "clsx";
import { Activity, Droplet, Ruler, Database } from "lucide-react";
import type { TankRow, TankCardData } from "@/lib/types";
import { tankStateOf, type TankState } from "@/components/tank/TankSvg";
import { fmtCm, fmtFill, fmtLitres, stamp } from "@/lib/format";
import { useUi } from "@/lib/store";

export interface ReadingCardProps {
  tank: TankRow;
  cardData?: TankCardData;
  className?: string;
}

export function ReadingCard({ tank, cardData, className }: ReadingCardProps) {
  const tz = useUi((s) => s.tz);
  const state: TankState = tankStateOf(cardData || { status: tank.status });

  const cur = cardData?.current;
  const levelPct = cur?.levelPct ?? null;
  const distanceCm = cur?.distanceCm ?? null;
  const levelCm = cur?.levelCm ?? null;
  const volumeL = cur?.volumeL ?? null;
  const capacityL = cardData?.capacityL ?? 8639;

  const pctColor =
    state === "warning"
      ? "text-[var(--warn-tx)]"
      : state === "critical" || state === "emergency"
      ? "text-[var(--err-tx)]"
      : state === "fault" || state === "nodata"
      ? "text-[var(--tx-soft)]"
      : "text-[var(--tx-head)]";

  return (
    <div className={className}>
      <div className="card p-6 flex flex-col justify-between h-full gap-4">
        <div>
          <div className="eyebrow flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent-500)] uppercase">
            <Activity size={13} aria-hidden />
            <span>REAL-TIME TELEMETRY</span>
          </div>
          <h3 className="card-title text-[20px] font-bold text-[var(--tx-head)] font-['Merriweather',serif]">
            Current reading
          </h3>
        </div>

        {/* Fill Percentage: 40px / 900 */}
        <div className="flex items-baseline gap-3">
          <div className={clsx("num text-[40px] font-black leading-none tracking-tight", pctColor)}>
            {fmtFill(levelPct)}
          </div>
          <span className="text-[13px] font-semibold text-[var(--tx-quiet)]">
            usable volume
          </span>
        </div>

        {/* Derived 4-up metrics grid */}
        <div className="grid grid-cols-2 gap-3 p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--bd-soft)]">
          {/* Sensor Distance */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[11px] text-[var(--tx-quiet)] font-medium">
              <Ruler size={12} />
              <span>Distance to water</span>
            </div>
            <span className="num text-[17px] font-bold text-[var(--tx-head)] mt-0.5">
              {fmtCm(distanceCm)}
            </span>
          </div>

          {/* Liquid Depth */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[11px] text-[var(--tx-quiet)] font-medium">
              <Droplet size={12} />
              <span>Water depth (Level)</span>
            </div>
            <span className="num text-[17px] font-bold text-[var(--tx-head)] mt-0.5">
              {fmtCm(levelCm)}
            </span>
          </div>

          {/* Current Volume */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[11px] text-[var(--tx-quiet)] font-medium">
              <Database size={12} />
              <span>Current volume</span>
            </div>
            <span className="num text-[17px] font-bold text-[var(--brand-800)] mt-0.5">
              {fmtLitres(volumeL)}
            </span>
          </div>

          {/* Tank Capacity */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-[11px] text-[var(--tx-quiet)] font-medium">
              <Database size={12} />
              <span>Total capacity</span>
            </div>
            <span className="num text-[17px] font-bold text-[var(--tx-head)] mt-0.5">
              {fmtLitres(capacityL)}
            </span>
          </div>
        </div>

        {/* Formula footnote */}
        <div className="text-[11.5px] text-[var(--tx-quiet)] pt-2 border-t border-[var(--bd-soft)] flex items-center justify-between">
          <span>Level = Height ({tank.geometry.heightCm} cm) − Distance</span>
          <span>{cur?.t ? stamp(cur.t, tz) : "—"}</span>
        </div>
      </div>
    </div>
  );
}


"use client";

import React from "react";
import { MapPin, Layers } from "lucide-react";
import type { TankRow, TankCardData } from "@/lib/types";
import { TankSvg, tankStateOf } from "@/components/tank/TankSvg";
import { NodeStatusChip, SourceChip } from "@/components/status/badges";

export interface TankHeroCardProps {
  tank: TankRow;
  cardData?: TankCardData;
  className?: string;
}

export function TankHeroCard({ tank, cardData, className }: TankHeroCardProps) {
  const state = tankStateOf(
    cardData || {
      status: tank.status,
      current: {
        distanceCm: null,
        levelCm: null,
        levelPct: null,
        volumeL: null,
        quality: "ok",
        t: 0,
        ageMin: null,
        rssi: null,
        snr: null,
        batteryPct: null,
      },
    }
  );

  const levelPct = cardData?.current?.levelPct ?? null;
  const distanceCm = cardData?.current?.distanceCm ?? null;
  const volumeL = cardData?.current?.volumeL ?? null;

  const isCylinder = tank.geometry.shape.kind === "cylinder";
  const cyl = isCylinder ? (tank.geometry.shape as { kind: "cylinder"; radiusCm: number }) : null;
  const rect = !isCylinder
    ? (tank.geometry.shape as { kind: "rectangle"; widthCm: number; lengthCm: number })
    : null;

  const dimensionsText = isCylinder
    ? `Cylinder · Height ${tank.geometry.heightCm} cm · Radius ${cyl?.radiusCm ?? 100} cm`
    : `Rectangle · ${tank.geometry.heightCm} × ${rect?.widthCm ?? 100} × ${rect?.lengthCm ?? 100} cm`;

  return (
    <div className={className}>
      <div className="card p-6 flex flex-col items-center justify-between h-full">
        {/* Top Info */}
        <div className="w-full flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent-500)] uppercase tracking-wider">
              <Layers size={13} aria-hidden />
              <span>ROOFTOP VESSEL</span>
            </div>
            <h2 className="text-[22px] font-bold text-[var(--tx-head)] font-['Merriweather',serif]">
              {tank.label}
            </h2>
            <div className="flex items-center gap-1.5 text-[12px] text-[var(--tx-body)] mt-1">
              <MapPin size={13} className="text-[var(--tx-quiet)] flex-shrink-0" />
              <span>{tank.location || "Rooftop Storage Deck"}</span>
              {tank.zone && <span className="text-[var(--tx-quiet)]">({tank.zone})</span>}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <SourceChip simulated={tank.simulated} />
            <NodeStatusChip status={tank.status} />
          </div>
        </div>

        {/* 280px Hero TankSvg */}
        <div className="py-4 flex justify-center w-full max-w-[280px]">
          <TankSvg
            shape={tank.geometry.shape.kind}
            levelPct={levelPct}
            distanceCm={distanceCm}
            heightCm={tank.geometry.heightCm}
            deadZoneCm={tank.geometry.deadZoneCm}
            thresholds={tank.thresholds}
            state={state}
            size="hero"
            label={tank.label}
            litres={volumeL}
          />
        </div>

        {/* Geometry specs footnote */}
        <div className="w-full text-center text-[11.5px] text-[var(--tx-quiet)] pt-3 border-t border-[var(--bd-soft)]">
          {dimensionsText} · Dead Zone {tank.geometry.deadZoneCm} cm
        </div>
      </div>
    </div>
  );
}

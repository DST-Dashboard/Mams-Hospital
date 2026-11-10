"use client";

import React, { useId } from "react";
import clsx from "clsx";
import { Wrench, Hourglass } from "lucide-react";
import type { TankCardData } from "@/lib/types";
import { usePrefersReducedMotion } from "@/lib/a11y";

export type TankState =
  | "ok"
  | "warning"
  | "critical"
  | "emergency"
  | "fault"
  | "nodata"
  | "maintenance"
  | "draft"
  | "loading";

export interface TankSvgProps {
  shape?: "cylinder" | "rectangle";
  levelPct: number | null;
  distanceCm: number | null;
  heightCm: number;
  deadZoneCm: number;
  thresholds?: {
    warnPct: number;
    critPct: number;
    emptyPct: number;
  };
  state?: TankState;
  size?: "tile" | "hero" | "mini";
  label: string;
  litres?: number | null;
  simulated?: boolean;
  className?: string;
}

/**
 * Derives visual state of the tank from API tank card data.
 */
export function tankStateOf(card: Partial<TankCardData> | undefined): TankState {
  if (!card) return "loading";
  if (card.status === "maintenance") return "maintenance";
  if (card.status === "draft") return "draft";
  if (card.status === "offline" || card.status === "decommissioned") return "nodata";

  const cur = card.current;
  if (!cur || cur.levelPct === null || cur.levelPct === undefined) {
    return cur?.ageMin && cur.ageMin > 30 ? "nodata" : "fault";
  }

  const isBadQuality =
    cur.quality === "invalid" ||
    cur.quality === "out_of_range";

  if (isBadQuality || cur.distanceCm === null) {
    return "fault";
  }

  const worst = card.worstSeverity;
  if (worst === "emergency") return "emergency";
  if (worst === "critical") return "critical";
  if (worst === "warning") return "warning";

  const th = card.thresholds;
  if (th) {
    if (cur.levelPct <= th.emptyPct) return "emergency";
    if (cur.levelPct <= th.critPct) return "critical";
    if (cur.levelPct <= th.warnPct) return "warning";
  }

  return "ok";
}

export function TankSvg({
  shape = "cylinder",
  levelPct,
  distanceCm,
  heightCm = 300,
  deadZoneCm = 25,
  thresholds = { warnPct: 40, critPct: 20, emptyPct: 5 },
  state = "ok",
  size = "tile",
  label,
  litres,
  className,
}: TankSvgProps) {
  const uid = useId().replace(/:/g, "_");
  const prefersReducedMotion = usePrefersReducedMotion();

  // Tank inner geometry constants
  // Vessel spans x: 40..160 (width 120), y: 48..228 (height 180)
  const TANK_X = 40;
  const TANK_Y = 48;
  const TANK_W = 120;
  const TANK_H = 180;
  const TANK_BOT = TANK_Y + TANK_H; // 228

  const isMini = size === "mini";
  const isHero = size === "hero";

  // Clamped level percentage
  const effectivePct =
    levelPct === null || Number.isNaN(levelPct)
      ? state === "nodata"
        ? 35 // Ghosted last level
        : 0
      : Math.max(0, Math.min(100, levelPct));

  // Surface Y coordinate
  const surfaceY = TANK_BOT - (effectivePct / 100) * TANK_H;

  // Dead zone pixel height
  const deadZoneRatio = Math.max(0, Math.min(1, heightCm > 0 ? deadZoneCm / heightCm : 0.08));
  const deadZonePx = deadZoneRatio * TANK_H;

  // Overflow risk condition (distance < deadZone + 10 cm)
  const isOverflowRisk =
    distanceCm !== null && deadZoneCm !== null && distanceCm < deadZoneCm + 10;

  // Determine currently crossed threshold
  const isEmergency = effectivePct <= thresholds.emptyPct || state === "emergency";
  const isCritical = !isEmergency && (effectivePct <= thresholds.critPct || state === "critical");
  const isWarning =
    !isEmergency && !isCritical && (effectivePct <= thresholds.warnPct || state === "warning");

  // Y positions for thresholds
  const warnY = TANK_BOT - (thresholds.warnPct / 100) * TANK_H;
  const critY = TANK_BOT - (thresholds.critPct / 100) * TANK_H;
  const emptyY = TANK_BOT - (thresholds.emptyPct / 100) * TANK_H;

  // Spoken accessible description
  const spokenLabel = `${label}: ${
    levelPct !== null ? `${Math.round(levelPct)} percent full` : "no reading"
  }${litres ? `, ${litres} litres` : ""}${
    distanceCm !== null ? `, sensor distance ${Math.round(distanceCm)} centimetres` : ""
  }, status ${state}.`;

  const clipId = `tank_clip_${uid}`;
  const hatchId = `deadzone_hatch_${uid}`;

  return (
    <svg
      viewBox="0 0 200 260"
      role="img"
      aria-label={spokenLabel}
      className={clsx(
        "tank-svg select-none transition-transform duration-300",
        isMini ? "w-16 h-20" : isHero ? "w-full max-w-[280px]" : "w-full max-w-[180px]",
        className
      )}
      style={{
        "--level-y": `${surfaceY}px`,
      } as React.CSSProperties}
    >
      <defs>
        {/* Diagonal hatch pattern for Dead Zone */}
        <pattern
          id={hatchId}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(45)"
        >
          <line
            x1="0"
            y1="0"
            x2="0"
            y2="8"
            stroke="var(--tank-dead)"
            strokeWidth="2"
          />
        </pattern>

        {/* Clip Path to contain water within tank shape */}
        <clipPath id={clipId}>
          {shape === "cylinder" ? (
            <path
              d={`
                M ${TANK_X} ${TANK_Y + 10}
                A 60 10 0 0 1 ${TANK_X + TANK_W} ${TANK_Y + 10}
                L ${TANK_X + TANK_W} ${TANK_BOT}
                A 60 10 0 0 1 ${TANK_X} ${TANK_BOT}
                Z
              `}
            />
          ) : (
            <rect
              x={TANK_X}
              y={TANK_Y}
              width={TANK_W}
              height={TANK_H}
              rx="8"
              ry="8"
            />
          )}
        </clipPath>
      </defs>

      {/* Sensor Housing on Lid */}
      <g className="sensor-lid">
        <rect
          x="88"
          y="26"
          width="24"
          height="14"
          rx="3"
          fill="var(--brand-800)"
          stroke="var(--bd-strong)"
          strokeWidth="1"
        />
        {/* Optical/Ultrasonic Emitter Dot */}
        <circle cx="100" cy="40" r="2.5" fill="var(--accent-500)" />
      </g>

      {/* Tank Vessel Body Background & Left-Edge Soft Gloss */}
      {shape === "cylinder" ? (
        <g className="tank-body-cylinder">
          {/* Main Cylinder Body */}
          <path
            d={`
              M ${TANK_X} ${TANK_Y + 10}
              A 60 10 0 0 1 ${TANK_X + TANK_W} ${TANK_Y + 10}
              L ${TANK_X + TANK_W} ${TANK_BOT}
              A 60 10 0 0 1 ${TANK_X} ${TANK_BOT}
              Z
            `}
            fill="var(--tank-body)"
            fillOpacity={state === "fault" || state === "draft" ? "0.15" : "0.6"}
            stroke="var(--tank-edge)"
            strokeWidth="2"
            strokeDasharray={state === "fault" || state === "draft" ? "5 4" : undefined}
          />
          {/* Top Ellipse Rim */}
          <ellipse
            cx="100"
            cy={TANK_Y + 10}
            rx="60"
            ry="10"
            fill="none"
            stroke="var(--tank-edge)"
            strokeWidth="1.5"
            strokeDasharray={state === "fault" || state === "draft" ? "4 4" : undefined}
          />
          {/* Left Edge Highlight Gloss */}
          <line
            x1={TANK_X + 4}
            y1={TANK_Y + 14}
            x2={TANK_X + 4}
            y2={TANK_BOT - 6}
            stroke="#ffffff"
            strokeOpacity="0.25"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      ) : (
        <g className="tank-body-rectangle">
          <rect
            x={TANK_X}
            y={TANK_Y}
            width={TANK_W}
            height={TANK_H}
            rx="8"
            ry="8"
            fill="var(--tank-body)"
            fillOpacity={state === "fault" || state === "draft" ? "0.15" : "0.6"}
            stroke="var(--tank-edge)"
            strokeWidth="2"
            strokeDasharray={state === "fault" || state === "draft" ? "5 4" : undefined}
          />
          {/* Left Edge Highlight Gloss */}
          <line
            x1={TANK_X + 4}
            y1={TANK_Y + 6}
            x2={TANK_X + 4}
            y2={TANK_BOT - 6}
            stroke="#ffffff"
            strokeOpacity="0.25"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* Clipped Dynamic Content (Water + Dead Zone Band) */}
      <g clipPath={`url(#${clipId})`}>
        {/* Dead Zone Hatched Band */}
        {deadZonePx > 0 && (
          <g className="deadzone-layer">
            <rect
              x={TANK_X}
              y={TANK_Y}
              width={TANK_W}
              height={deadZonePx}
              fill={`url(#${hatchId})`}
            />
            {isHero && deadZonePx >= 14 && (
              <text
                x="100"
                y={TANK_Y + deadZonePx / 2 + 3}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="var(--tx-muted)"
              >
                dead zone
              </text>
            )}
          </g>
        )}

        {/* Dynamic Water Volume */}
        {levelPct !== null && state !== "fault" && state !== "draft" && (
          <g
            className="water-group"
            opacity={state === "nodata" ? "0.35" : "1"}
            style={{
              transition: prefersReducedMotion ? "none" : "transform 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
              transform: `translateY(${surfaceY - TANK_BOT}px)`,
            }}
          >
            {/* Water Column Body */}
            <rect
              x={TANK_X - 10}
              y={TANK_BOT}
              width={TANK_W + 20}
              height={TANK_H + 20}
              fill="url(#water_gradient)"
              opacity="0.9"
            />

            {/* Dual Drifting Surface Waves */}
            {!prefersReducedMotion ? (
              <g className="waves">
                {/* Wave Layer 1: Leftward drift 6s */}
                <path
                  className="wave wave-primary"
                  d={`
                    M ${TANK_X - 60} ${TANK_BOT}
                    q 15 -3, 30 0
                    t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0
                    v 10 h -240 Z
                  `}
                  fill="var(--water-a)"
                  opacity="0.8"
                />
                {/* Wave Layer 2: Rightward drift 9s */}
                <path
                  className="wave wave-secondary"
                  d={`
                    M ${TANK_X - 60} ${TANK_BOT}
                    q 15 3, 30 0
                    t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0 t 30 0
                    v 10 h -240 Z
                  `}
                  fill="var(--water-b)"
                  opacity="0.6"
                />
              </g>
            ) : (
              /* Flat Static Water Line for Reduced Motion */
              <rect
                x={TANK_X}
                y={TANK_BOT}
                width={TANK_W}
                height="4"
                fill="var(--water-b)"
              />
            )}
          </g>
        )}

        {/* Overflow Risk Glow Band */}
        {isOverflowRisk && (
          <rect
            x={TANK_X}
            y={TANK_Y}
            width={TANK_W}
            height={TANK_H * 0.1}
            fill="var(--err-bg)"
            stroke="var(--err-tx)"
            strokeWidth="2"
            opacity="0.75"
          />
        )}
      </g>

      {/* Linear Gradient for Liquid Volume */}
      <linearGradient id="water_gradient" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="var(--water-a)" />
        <stop offset="100%" stopColor="var(--water-b)" />
      </linearGradient>

      {/* Sensor Beam Down to Water Surface */}
      {distanceCm !== null && state !== "fault" && state !== "draft" && (
        <g className="sensor-beam">
          {/* Dashed Emitter Beam */}
          <line
            x1="100"
            y1="40"
            x2="100"
            y2={Math.max(44, surfaceY)}
            stroke="var(--accent-500)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          {/* Chevron marker at surface contact point */}
          <path
            d={`M 96 ${Math.max(44, surfaceY) - 4} L 100 ${Math.max(44, surfaceY)} L 104 ${Math.max(44, surfaceY) - 4}`}
            fill="none"
            stroke="var(--accent-500)"
            strokeWidth="1.5"
          />
          {/* Distance Indicator Chip Beside Midpoint */}
          {!isMini && (
            <g
              transform={`translate(108, ${Math.min(
                TANK_BOT - 16,
                Math.max(TANK_Y + 12, (40 + surfaceY) / 2 - 8)
              )})`}
            >
              <rect
                x="0"
                y="0"
                width="42"
                height="16"
                rx="4"
                fill="var(--bg-card)"
                stroke="var(--bd-soft)"
                strokeWidth="1"
                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.1))"
              />
              <text
                x="21"
                y="11.5"
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill="var(--tx-head)"
                className="num"
              >
                {Math.round(distanceCm)} cm
              </text>
            </g>
          )}
        </g>
      )}

      {/* Right-Hand Percentage Scale (0%, 25%, 50%, 75%, 100%) */}
      {!isMini && (
        <g className="scale-right">
          {[0, 25, 50, 75, 100].map((pct) => {
            const yPos = TANK_BOT - (pct / 100) * TANK_H;
            return (
              <g key={pct}>
                <line
                  x1={TANK_X + TANK_W}
                  x2={TANK_X + TANK_W + 6}
                  y1={yPos}
                  y2={yPos}
                  stroke="var(--bd-strong)"
                  strokeWidth="1"
                />
                <text
                  x={TANK_X + TANK_W + 10}
                  y={yPos + 3.5}
                  fontSize="10"
                  fill="var(--tx-quiet)"
                  className="num"
                >
                  {pct}%
                </text>
              </g>
            );
          })}
        </g>
      )}

      {/* Left-Hand Threshold Ticks (Warning, Critical, Emergency) */}
      {!isMini && thresholds && (
        <g className="thresholds-left">
          {/* Warning Tick */}
          <line
            x1={TANK_X - (isWarning ? 10 : 6)}
            x2={TANK_X}
            y1={warnY}
            y2={warnY}
            stroke="var(--warn-tx)"
            strokeWidth={isWarning ? 3 : 1.5}
          />
          <text
            x={TANK_X - (isWarning ? 13 : 9)}
            y={warnY + 3.5}
            textAnchor="end"
            fontSize="10"
            fontWeight={isWarning ? "800" : "600"}
            fill="var(--warn-tx)"
            className="num"
          >
            {thresholds.warnPct}
          </text>

          {/* Critical Tick */}
          <line
            x1={TANK_X - (isCritical ? 10 : 6)}
            x2={TANK_X}
            y1={critY}
            y2={critY}
            stroke="var(--err-tx)"
            strokeWidth={isCritical ? 3 : 1.5}
          />
          <text
            x={TANK_X - (isCritical ? 13 : 9)}
            y={critY + 3.5}
            textAnchor="end"
            fontSize="10"
            fontWeight={isCritical ? "800" : "600"}
            fill="var(--err-tx)"
            className="num"
          >
            {thresholds.critPct}
          </text>

          {/* Emergency Tick */}
          <line
            x1={TANK_X - (isEmergency ? 10 : 6)}
            x2={TANK_X}
            y1={emptyY}
            y2={emptyY}
            stroke="var(--emg-bg)"
            strokeWidth={isEmergency ? 3 : 1.5}
          />
          <text
            x={TANK_X - (isEmergency ? 13 : 9)}
            y={emptyY + 3.5}
            textAnchor="end"
            fontSize="10"
            fontWeight={isEmergency ? "800" : "600"}
            fill="var(--emg-bg)"
            className="num"
          >
            {thresholds.emptyPct}
          </text>
        </g>
      )}

      {/* State-Specific Overlays (Centered in Vessel) */}
      {state === "fault" && (
        <g className="state-overlay-fault" transform="translate(100, 138)">
          <circle cx="0" cy="0" r="22" fill="var(--bg-card)" stroke="var(--bd)" strokeWidth="1" />
          <text
            x="0"
            y="9"
            textAnchor="middle"
            fontSize="26"
            fontWeight="700"
            fill="var(--tx-soft)"
          >
            ?
          </text>
        </g>
      )}

      {state === "maintenance" && (
        <g className="state-overlay-maintenance" transform="translate(100, 138)">
          <circle
            cx="0"
            cy="0"
            r="20"
            fill="var(--info-bg)"
            stroke="var(--info-bd)"
            strokeWidth="1.5"
          />
          <foreignObject x="-12" y="-12" width="24" height="24">
            <div className="flex items-center justify-center w-full h-full text-[var(--info-tx)]">
              <Wrench size={16} aria-hidden />
            </div>
          </foreignObject>
        </g>
      )}

      {state === "draft" && (
        <g className="state-overlay-draft" transform="translate(100, 138)">
          <circle
            cx="0"
            cy="0"
            r="20"
            fill="var(--neutral-bg)"
            stroke="var(--neutral-bd)"
            strokeWidth="1.5"
          />
          <foreignObject x="-12" y="-12" width="24" height="24">
            <div className="flex items-center justify-center w-full h-full text-[var(--tx-muted)]">
              <Hourglass size={16} aria-hidden />
            </div>
          </foreignObject>
        </g>
      )}

      {/* Emergency Pulsing Ring */}
      {isEmergency && (
        <rect
          x={TANK_X - 4}
          y={TANK_Y - 4}
          width={TANK_W + 8}
          height={TANK_H + 8}
          rx="12"
          fill="none"
          stroke="var(--emg-bg)"
          strokeWidth="2.5"
          className={clsx(!prefersReducedMotion && "animate-pulse")}
        />
      )}
    </svg>
  );
}

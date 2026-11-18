"use client";

import React from "react";
import { Radio } from "lucide-react";
import { SignalBars } from "@/components/status/SignalBars";
import { BatteryIcon } from "@/components/status/BatteryIcon";
import { QualityChip } from "@/components/status/badges";
import { CompletenessMeter } from "@/components/status/CompletenessMeter";
import type { TankCardData } from "@/lib/types";

export interface SignalPanelProps {
  cardData?: TankCardData;
  completenessPct?: number | null;
  className?: string;
}

export function SignalPanel({
  cardData,
  completenessPct,
  className,
}: SignalPanelProps) {
  const cur = cardData?.current;

  return (
    <div className={className}>
      <div className="card p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent-500)] uppercase">
              <Radio size={13} aria-hidden />
              <span>RF LORAWAN TELEMETRY</span>
            </div>
            <h3 className="card-title text-[20px] font-bold text-[var(--tx-head)] font-['Merriweather',serif]">
              Signal and transmitter
            </h3>
          </div>
          <span className="text-[12px] font-semibold text-[var(--tx-quiet)]">
            SenseCap gateway
          </span>
        </div>

        {/* Completeness Bar */}
        <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--bd-soft)] flex flex-col gap-2">
          <div className="flex justify-between items-center text-[12px]">
            <span className="font-semibold text-[var(--tx-head)]">Telemetry completeness</span>
            <span className="font-mono font-bold text-[var(--brand-800)]">
              {completenessPct !== null && completenessPct !== undefined
                ? `${Math.round(completenessPct)}%`
                : "—"}
            </span>
          </div>
          <CompletenessMeter pct={completenessPct ?? null} />
        </div>

        {/* 4-up radio stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--bd-soft)] flex flex-col">
            <span className="text-[11px] text-[var(--tx-quiet)] font-medium">RSSI Signal</span>
            <div className="flex items-center gap-2 mt-1">
              <SignalBars rssi={cur?.rssi ?? null} snr={cur?.snr ?? null} />
              <span className="font-mono font-bold text-[14px] text-[var(--tx-head)]">
                {cur?.rssi != null ? `${cur.rssi} dBm` : "—"}
              </span>
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--bd-soft)] flex flex-col">
            <span className="text-[11px] text-[var(--tx-quiet)] font-medium">Signal-to-Noise</span>
            <span className="font-mono font-bold text-[14px] text-[var(--tx-head)] mt-1">
              {cur?.snr != null ? `${cur.snr} dB` : "—"}
            </span>
          </div>

          <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--bd-soft)] flex flex-col">
            <span className="text-[11px] text-[var(--tx-quiet)] font-medium">Link Quality</span>
            <div className="mt-1">
              <QualityChip quality={cur?.quality === "ok" ? "good" : cur?.quality === "dead_zone" ? "fair" : "weak"} />
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--bd-soft)] flex flex-col">
            <span className="text-[11px] text-[var(--tx-quiet)] font-medium">Battery Level</span>
            <div className="flex items-center gap-2 mt-1">
              <BatteryIcon pct={cur?.batteryPct ?? null} />
              <span className="font-mono font-bold text-[14px] text-[var(--tx-head)]">
                {cur?.batteryPct != null ? `${cur.batteryPct}%` : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

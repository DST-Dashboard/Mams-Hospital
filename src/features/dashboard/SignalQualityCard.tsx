"use client";

import React from "react";
import { Wifi } from "lucide-react";
import type { TankCardData } from "@/lib/types";
import { SignalBars } from "@/components/status/SignalBars";
import { CompletenessMeter } from "@/components/status/CompletenessMeter";
import { QualityChip } from "@/components/status/badges";

export interface SignalQualityCardProps {
  tanks: TankCardData[];
  completenessPct?: number | null;
  className?: string;
}

/**
 * Derives signal quality category ('good' | 'fair' | 'weak')
 * from worse of RSSI and SNR per Spec §14 V1.
 */
function deriveQuality(rssi: number | null, snr: number | null): "good" | "fair" | "weak" {
  if (rssi === null && snr === null) return "weak";
  if ((rssi !== null && rssi < -115) || (snr !== null && snr < -5)) return "weak";
  if ((rssi !== null && rssi < -100) || (snr !== null && snr < 5)) return "fair";
  return "good";
}

export function SignalQualityCard({
  tanks,
  completenessPct = null,
  className,
}: SignalQualityCardProps) {
  // Constant gateway label per project document (SenseCap gateway)
  const gatewayName = "SenseCap gateway";

  return (
    <div className={className}>
      <div className="card p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent-500)] uppercase">
              <Wifi size={13} aria-hidden />
              <span>RF LORAWAN UPLINK</span>
            </div>
            <h2 className="card-title text-[20px] font-bold text-[var(--tx-head)] font-['Merriweather',serif]">
              Signal quality
            </h2>
          </div>
          <span className="text-[12px] font-semibold text-[var(--ok-tx)] bg-[var(--ok-bg)] border border-[var(--ok-bd)] px-2.5 py-0.5 rounded-full">
            {gatewayName} online
          </span>
        </div>

        {/* Global Completeness Bar */}
        <div className="p-3 bg-[var(--bg-subtle)] rounded-lg border border-[var(--bd-soft)] flex flex-col gap-2">
          <div className="flex justify-between items-center text-[12px]">
            <span className="font-semibold text-[var(--tx-head)]">Fleet packet completeness</span>
            <span className="font-mono font-bold text-[var(--brand-800)]">
              {completenessPct !== null ? `${Math.round(completenessPct)}%` : "—"}
            </span>
          </div>
          <CompletenessMeter pct={completenessPct} />
        </div>

        {/* Per-Tank RF Telemetry */}
        <div className="divide-y divide-[var(--bd-soft)]">
          {tanks.map((t) => {
            const cur = t.current;
            const quality = deriveQuality(cur?.rssi ?? null, cur?.snr ?? null);

            return (
              <div
                key={t.id}
                className="flex items-center justify-between py-2.5 px-2"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-[13px] text-[var(--tx-head)]">
                    {t.label}
                  </span>
                  <span className="text-[11px] text-[var(--tx-quiet)] font-mono">
                    RSSI: {cur?.rssi != null ? `${cur.rssi} dBm` : "—"} · SNR: {cur?.snr != null ? `${cur.snr} dB` : "—"}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <QualityChip quality={quality} />
                  <SignalBars rssi={cur?.rssi ?? null} snr={cur?.snr ?? null} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

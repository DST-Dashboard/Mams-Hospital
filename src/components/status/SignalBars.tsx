"use client";

import React from "react";
import clsx from "clsx";

export interface SignalBarsProps {
  rssi: number | null;
  snr: number | null;
  className?: string;
  showText?: boolean;
}

export function SignalBars({ rssi, snr, className, showText = false }: SignalBarsProps) {
  if (rssi == null || Number.isNaN(rssi)) {
    return (
      <span className={clsx("inline-flex items-center gap-1.5 text-[var(--tx-muted)] text-[12px]", className)}>
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
          <rect x="1" y="10" width="2.5" height="4" rx="0.5" fill="var(--bd-strong)" />
          <rect x="5" y="7" width="2.5" height="7" rx="0.5" fill="var(--bd-strong)" />
          <rect x="9" y="4" width="2.5" height="10" rx="0.5" fill="var(--bd-strong)" />
          <rect x="13" y="1" width="2.5" height="13" rx="0.5" fill="var(--bd-strong)" />
        </svg>
        {showText && <span>—</span>}
      </span>
    );
  }

  // 4-bar LoRa evaluation
  let activeBars = 1;
  let toneClass = "text-[var(--err-tx)]";

  if (rssi > -90) {
    activeBars = 4;
    toneClass = "text-[var(--ok-tx)]";
  } else if (rssi > -105) {
    activeBars = 3;
    toneClass = "text-[var(--ok-tx)]";
  } else if (rssi > -115) {
    activeBars = 2;
    toneClass = "text-[var(--warn-tx)]";
  } else {
    activeBars = 1;
    toneClass = "text-[var(--err-tx)]";
  }

  const tooltip = `RSSI: ${Math.round(rssi)} dBm${snr != null ? ` · SNR: ${snr.toFixed(1)} dB` : ""}`;

  return (
    <span
      className={clsx("inline-flex items-center gap-1.5 select-none", toneClass, className)}
      title={tooltip}
      aria-label={tooltip}
    >
      <svg width="18" height="14" viewBox="0 0 18 14" fill="none" className="flex-shrink-0" aria-hidden>
        <rect
          x="1"
          y="10"
          width="2.5"
          height="4"
          rx="0.5"
          fill={activeBars >= 1 ? "currentColor" : "var(--bd-strong)"}
        />
        <rect
          x="5"
          y="7"
          width="2.5"
          height="7"
          rx="0.5"
          fill={activeBars >= 2 ? "currentColor" : "var(--bd-strong)"}
        />
        <rect
          x="9"
          y="4"
          width="2.5"
          height="10"
          rx="0.5"
          fill={activeBars >= 3 ? "currentColor" : "var(--bd-strong)"}
        />
        <rect
          x="13"
          y="1"
          width="2.5"
          height="13"
          rx="0.5"
          fill={activeBars >= 4 ? "currentColor" : "var(--bd-strong)"}
        />
      </svg>
      {showText && <span className="text-[12px] font-medium num">{Math.round(rssi)} dBm</span>}
    </span>
  );
}

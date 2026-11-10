"use client";

import clsx from "clsx";
import React from "react";

export function SignalBars({
  rssi,
  snr,
  showValues = true,
  className,
}: {
  rssi: number | null | undefined;
  snr?: number | null | undefined;
  showValues?: boolean;
  className?: string;
}) {
  if (rssi == null) {
    return <span className="text-xs text-muted">—</span>;
  }

  // 1 to 4 bars
  let bars = 1;
  let color = "bg-crit";

  if (rssi >= -70) {
    bars = 4;
    color = "bg-ok";
  } else if (rssi >= -85) {
    bars = 3;
    color = "bg-tide";
  } else if (rssi >= -100) {
    bars = 2;
    color = "bg-warn";
  } else {
    bars = 1;
    color = "bg-crit";
  }

  return (
    <div className={clsx("inline-flex items-center gap-1.5", className)}>
      <div className="flex items-end gap-0.5 h-3.5 w-4" title={`RSSI: ${rssi} dBm${snr != null ? `, SNR: ${snr} dB` : ""}`}>
        <div className={clsx("w-0.5 rounded-xs h-1", bars >= 1 ? color : "bg-line/40")} />
        <div className={clsx("w-0.5 rounded-xs h-1.5", bars >= 2 ? color : "bg-line/40")} />
        <div className={clsx("w-0.5 rounded-xs h-2.5", bars >= 3 ? color : "bg-line/40")} />
        <div className={clsx("w-0.5 rounded-xs h-3.5", bars >= 4 ? color : "bg-line/40")} />
      </div>

      {showValues ? (
        <span className="text-xs font-mono text-muted">
          {rssi} dBm{snr != null ? ` / ${snr > 0 ? `+${snr}` : snr} dB` : ""}
        </span>
      ) : null}
    </div>
  );
}

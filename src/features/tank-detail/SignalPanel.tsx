"use client";

import { Battery, Radio, Wifi, Zap } from "lucide-react";
import React from "react";
import { BatteryIcon } from "@/components/status/BatteryIcon";
import { SignalBars } from "@/components/status/SignalBars";

export interface SignalPanelProps {
  rssi?: number | null;
  snr?: number | null;
  batteryPct?: number | null;
  gatewayId?: string | null;
  deviceId?: string | null;
}

export function SignalPanel({
  rssi,
  snr,
  batteryPct,
  gatewayId = "mams-rooftop-gw-01",
  deviceId,
}: SignalPanelProps) {
  let signalQuality = "Fair";
  if (rssi != null) {
    if (rssi >= -70) signalQuality = "Excellent";
    else if (rssi >= -85) signalQuality = "Good";
    else if (rssi >= -100) signalQuality = "Fair";
    else signalQuality = "Poor / Marginal";
  }

  return (
    <div className="rounded-xl border hairline bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between border-b hairline pb-3">
        <div className="flex items-center gap-2">
          <Wifi size={18} className="text-tide" />
          <h3 className="text-base font-semibold text-ink">LoRaWAN RF & Hardware Diagnostics</h3>
        </div>
        <span className="text-xs font-semibold text-tide bg-tide/10 px-2.5 py-0.5 rounded">
          {signalQuality}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Signal RSSI & Bars */}
        <div className="rounded-lg border hairline bg-raised/30 p-3 space-y-1">
          <span className="text-[11px] text-muted block uppercase tracking-wider font-semibold">
            Signal (RSSI)
          </span>
          <SignalBars rssi={rssi} snr={snr} showValues={true} />
        </div>

        {/* SNR */}
        <div className="rounded-lg border hairline bg-raised/30 p-3 space-y-1">
          <span className="text-[11px] text-muted block uppercase tracking-wider font-semibold">
            SNR Margin
          </span>
          <span className="font-mono text-sm font-semibold text-ink">
            {snr != null ? `${snr > 0 ? `+${snr}` : snr} dB` : "—"}
          </span>
        </div>

        {/* Battery */}
        <div className="rounded-lg border hairline bg-raised/30 p-3 space-y-1">
          <span className="text-[11px] text-muted block uppercase tracking-wider font-semibold">
            Sensor Battery
          </span>
          <BatteryIcon pct={batteryPct} />
        </div>

        {/* Gateway */}
        <div className="rounded-lg border hairline bg-raised/30 p-3 space-y-1">
          <span className="text-[11px] text-muted block uppercase tracking-wider font-semibold">
            Serving Gateway
          </span>
          <span className="font-mono text-xs text-ink truncate block" title={gatewayId ?? ""}>
            {gatewayId ?? "mams-rooftop-gw-01"}
          </span>
        </div>
      </div>
    </div>
  );
}

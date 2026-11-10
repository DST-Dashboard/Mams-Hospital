"use client";

import { Activity, Radio, ShieldCheck } from "lucide-react";
import React from "react";
import { BatteryIcon } from "@/components/status/BatteryIcon";
import { SignalBars } from "@/components/status/SignalBars";
import { FreshnessPill } from "@/components/status/badges";
import { useSystemStatus } from "@/lib/hooks";
import { ago } from "@/lib/format";

export function NodeHealthGrid() {
  const { data: status, error, isLoading } = useSystemStatus();

  const devices = status?.devices ?? [];

  return (
    <div className="rounded-xl border hairline bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between border-b hairline pb-3">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-tide" />
          <h3 className="text-base font-semibold text-ink">LoRaWAN Node Telemetry & Hardware Health</h3>
        </div>
        <span className="text-xs text-muted font-medium">
          {devices.length} hardware nodes monitored
        </span>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-xs text-muted">
          Loading hardware sensor health...
        </div>
      ) : error ? (
        <div role="alert" className="p-3 text-xs text-crit">
          Failed to load node status: {error.message}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {devices.map((d) => (
            <div
              key={d.deviceId}
              className="rounded-lg border hairline bg-raised/30 p-3.5 space-y-2.5 hover:bg-raised/60 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-ink">{d.deviceId}</span>
                <FreshnessPill state={d.status} />
              </div>

              <div className="text-xs text-muted">
                Bound to: <span className="font-medium text-ink">{d.tankId ? `Tank ${d.tankId}` : "Unbound"}</span>
              </div>

              <div className="pt-1 border-t hairline/60 flex items-center justify-between text-xs">
                <BatteryIcon pct={d.batteryPct} />
                <SignalBars rssi={d.rssi} showValues={false} />
              </div>

              <div className="text-[11px] text-muted text-right">
                {d.lastReadingAt ? `Uplink ${ago(d.lastReadingAt, Date.now())}` : "No uplinks"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

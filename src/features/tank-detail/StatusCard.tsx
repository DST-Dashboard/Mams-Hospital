"use client";

import React, { useState } from "react";
import { Sliders, Wrench, Zap } from "lucide-react";
import type { TankRow, TankCardData } from "@/lib/types";
import { BatteryIcon } from "@/components/status/BatteryIcon";
import { SignalBars } from "@/components/status/SignalBars";
import { QualityChip } from "@/components/status/badges";
import { Switch } from "@/components/ui/primitives";
import { useMe } from "@/lib/hooks";
import { patch, tankToInput } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import type { InferredPump } from "@/lib/series";

export interface StatusCardProps {
  tank: TankRow;
  cardData?: TankCardData;
  pump: InferredPump;
  onRefresh?: () => void;
  className?: string;
}

export function StatusCard({
  tank,
  cardData,
  pump,
  onRefresh,
  className,
}: StatusCardProps) {
  const { data: me } = useMe();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const isAdmin = me?.role === "admin";
  const isMaintenance = tank.status === "maintenance";

  const handleMaintenanceToggle = async (checked: boolean) => {
    if (!isAdmin) {
      toast.error("Needs Admin permission (backend)");
      return;
    }

    setBusy(true);
    try {
      const nextStatus = checked ? "maintenance" : "active";
      const payload = tankToInput(tank, { status: nextStatus });
      await patch(`/api/tanks/${tank.id}`, payload);
      toast.success(
        checked
          ? "Tank set to maintenance mode. Level alerts paused."
          : "Tank restored to active monitoring."
      );
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update tank maintenance mode.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const cur = cardData?.current;

  return (
    <div className={className}>
      <div className="card p-6 flex flex-col justify-between h-full gap-4">
        <div>
          <div className="eyebrow flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent-500)] uppercase">
            <Sliders size={13} aria-hidden />
            <span>OPERATIONAL STATUS</span>
          </div>
          <h3 className="card-title text-[20px] font-bold text-[var(--tx-head)] font-['Merriweather',serif]">
            Equipment & Link
          </h3>
        </div>

        {/* Pump Status Indicator */}
        <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--bd-soft)] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center ${
                pump.state === "filling"
                  ? "bg-[var(--data-600)] text-white animate-pulse"
                  : "bg-[var(--bd)] text-[var(--tx-quiet)]"
              }`}
            >
              <Zap size={16} />
            </div>
            <div>
              <div className="text-[14px] font-bold text-[var(--tx-head)]">
                {pump.state === "filling" ? "Pump Filling" : "Pumps Idle"}
              </div>
              <div className="text-[11px] text-[var(--tx-quiet)]">
                {pump.label}
              </div>
            </div>
          </div>
          <span
            className={`chip text-[11px] font-bold ${
              pump.state === "filling" ? "chip--ok" : "chip--neutral"
            }`}
          >
            {pump.state.toUpperCase()}
          </span>
        </div>

        {/* Node Telemetry (Battery + Cellular Link) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--bd-soft)] flex flex-col gap-1">
            <span className="text-[11px] text-[var(--tx-quiet)] font-medium">Transmitter Battery</span>
            <div className="flex items-center gap-2 mt-0.5">
              <BatteryIcon pct={cur?.batteryPct ?? null} />
              <span className="num font-bold text-[15px] text-[var(--tx-head)]">
                {cur?.batteryPct != null ? `${cur.batteryPct}%` : "—"}
              </span>
            </div>
          </div>

          <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--bd-soft)] flex flex-col gap-1">
            <span className="text-[11px] text-[var(--tx-quiet)] font-medium">Radio Link</span>
            <div className="flex items-center justify-between mt-0.5">
              <SignalBars rssi={cur?.rssi ?? null} snr={cur?.snr ?? null} />
              <QualityChip quality={cur?.quality === "ok" ? "good" : cur?.quality === "dead_zone" ? "fair" : "weak"} />
            </div>
          </div>
        </div>

        {/* Maintenance Switch */}
        <div className="pt-3 border-t border-[var(--bd-soft)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench size={15} className="text-[var(--tx-quiet)]" />
            <div>
              <span className="text-[13px] font-bold text-[var(--tx-head)] block">
                Maintenance mode
              </span>
              <span className="text-[11px] text-[var(--tx-quiet)]">
                {isAdmin
                  ? "Pause alarms during tank inspection or servicing"
                  : "Requires Administrator role to toggle"}
              </span>
            </div>
          </div>

          <Switch
            checked={isMaintenance}
            onChange={handleMaintenanceToggle}
            label="Maintenance mode"
            disabled={!isAdmin || busy}
          />
        </div>
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Bell, Radio, Activity } from "lucide-react";
import { KpiRow, KpiBox } from "@/components/ui/primitives";
import type { TankCardData } from "@/lib/types";

export interface FleetHealthProps {
  tanks: TankCardData[];
  openAlertsCount: number;
  dayCompleteness: number | null;
  weekCompleteness: number | null;
  className?: string;
}

export function FleetHealth({
  tanks,
  openAlertsCount,
  dayCompleteness,
  weekCompleteness,
  className,
}: FleetHealthProps) {
  // Count nodes reporting within 15 minutes (ageMin <= 15)
  const reportingNodes = tanks.filter(
    (t) => t.current?.ageMin !== null && t.current?.ageMin !== undefined && t.current.ageMin <= 15
  ).length;
  const totalNodes = tanks.length || 5;

  const alertsTone = openAlertsCount === 0 ? "ok" : openAlertsCount > 2 ? "err" : "warn";
  const nodesTone = reportingNodes === totalNodes ? "ok" : reportingNodes > 0 ? "warn" : "err";
  const compTone =
    dayCompleteness !== null && dayCompleteness >= 95
      ? "ok"
      : dayCompleteness !== null && dayCompleteness >= 80
      ? "warn"
      : "default";

  return (
    <div className={className}>
      <KpiRow>
        <KpiBox
          icon={Bell}
          value={openAlertsCount}
          caption="Active alerts"
          definition="Unresolved threshold, rapid drain or telemetry alerts across all hospital rooftop tanks"
          tone={alertsTone}
        />

        <KpiBox
          icon={Radio}
          value={`${reportingNodes} of ${totalNodes}`}
          caption="Nodes reporting"
          definition="Tanks transmitting telemetry uplink packets within the last 15 minutes"
          tone={nodesTone}
        />

        <KpiBox
          icon={Activity}
          value={
            <span className="flex items-baseline gap-2">
              <span>{dayCompleteness !== null ? `${Math.round(dayCompleteness)}%` : "—"}</span>
              <span className="text-[14px] text-[var(--tx-quiet)] font-semibold">
                Day | Week: {weekCompleteness !== null ? `${Math.round(weekCompleteness)}%` : "—"}
              </span>
            </span>
          }
          caption="Data completeness"
          definition="Percentage of scheduled 5-minute telemetry intervals successfully received and recorded"
          tone={compTone}
        />
      </KpiRow>
    </div>
  );
}


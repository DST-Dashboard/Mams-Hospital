"use client";

import React from "react";
import Link from "next/link";
import { Bell, ShieldCheck } from "lucide-react";
import { useAlerts } from "@/lib/hooks";
import { SeverityChip, AlertStateChip } from "@/components/status/badges";
import { stamp } from "@/lib/format";
import { useUi } from "@/lib/store";

export interface AlertHistoryProps {
  tankId: number;
  tankLabel: string;
  className?: string;
}

export function AlertHistory({ tankId, tankLabel, className }: AlertHistoryProps) {
  const tz = useUi((s) => s.tz);
  const { data: alerts = [], isLoading } = useAlerts({ state: "all" });

  const tankAlerts = alerts.filter((a) => a.tankId === tankId);

  return (
    <div className={className}>
      <div className="card p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent-500)] uppercase">
              <Bell size={13} aria-hidden />
              <span>NOTIFICATION LOG</span>
            </div>
            <h3 className="card-title text-[20px] font-bold text-[var(--tx-head)] font-['Merriweather',serif]">
              Alert history
            </h3>
          </div>
          <Link
            href="/alerts"
            className="text-[12px] font-bold text-[var(--brand-800)] hover:underline"
          >
            All hospital alerts →
          </Link>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-[13px] text-[var(--tx-quiet)] py-4 text-center">
            Loading notification history...
          </div>
        ) : tankAlerts.length === 0 ? (
          <div className="flex items-center gap-3 p-4 bg-[var(--ok-bg)] text-[var(--ok-tx)] border border-[var(--ok-bd)] rounded-xl text-[13px]">
            <ShieldCheck size={20} className="flex-shrink-0" />
            <span>
              <strong>All clear:</strong> No active or historical alerts recorded for {tankLabel}.
            </span>
          </div>
        ) : (
          <div className="divide-y divide-[var(--bd-soft)]">
            {tankAlerts.slice(0, 8).map((alert) => (
              <div
                key={alert.id}
                className="py-3 flex items-center justify-between gap-3 text-[13px]"
              >
                <div className="flex items-center gap-2.5">
                  <SeverityChip severity={alert.severity} />
                  <span className="font-semibold text-[var(--tx-head)]">
                    {alert.message}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-[var(--tx-quiet)] font-mono">
                    {stamp(alert.openedAt, tz)}
                  </span>
                  <AlertStateChip state={alert.state} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

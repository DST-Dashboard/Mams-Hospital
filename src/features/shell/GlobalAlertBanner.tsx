"use client";

import React from "react";
import Link from "next/link";
import clsx from "clsx";
import { CheckCircle2, Info, AlertTriangle, AlertOctagon } from "lucide-react";
import { useAlerts, useDashboard } from "@/lib/hooks";
import { SeverityChip, type Severity } from "@/components/status/badges";

const SEVERITY_WEIGHT: Record<string, number> = {
  emergency: 4,
  critical: 3,
  warning: 2,
  info: 1,
};

export function GlobalAlertBanner({ className }: { className?: string }) {
  const { data: dashboard } = useDashboard();
  const { data: alerts = [] } = useAlerts({ state: "open" });

  const unconfirmedCount = dashboard?.summary?.unconfirmed ?? 0;
  const totalTanks = dashboard?.tanks?.length ?? 5;

  // Sort alerts: Emergency -> Critical -> Warning -> Info, then newest
  const sortedAlerts = [...alerts].sort((a, b) => {
    const wA = SEVERITY_WEIGHT[a.severity] ?? 0;
    const wB = SEVERITY_WEIGHT[b.severity] ?? 0;
    if (wA !== wB) return wB - wA;
    return b.openedAt - a.openedAt;
  });

  const hasAlerts = sortedAlerts.length > 0;
  const highestSeverity = hasAlerts ? sortedAlerts[0]?.severity : null;
  const isEmergency = highestSeverity === "emergency";

  // Check maintenance tanks
  const maintenanceTanks = dashboard?.tanks?.filter((t) => t.status === "maintenance") || [];

  // Determine row style
  let rowBg = "bg-[var(--ok-bg)] text-[var(--ok-tx)] border-[var(--ok-bd)]";
  if (isEmergency) {
    rowBg = "bg-[var(--emg-bg)] text-[var(--emg-tx)] border-transparent";
  } else if (highestSeverity === "critical") {
    rowBg = "bg-[var(--err-bg)] text-[var(--err-tx)] border-[var(--err-bd)]";
  } else if (highestSeverity === "warning") {
    rowBg = "bg-[var(--warn-bg)] text-[var(--warn-tx)] border-[var(--warn-bd)]";
  } else if (highestSeverity === "info" || unconfirmedCount > 0) {
    rowBg = "bg-[var(--info-bg)] text-[var(--info-tx)] border-[var(--info-bd)]";
  }

  const visibleAlerts = sortedAlerts.slice(0, 4);
  const remainingCount = sortedAlerts.length - 4;

  return (
    <aside
      role="status"
      aria-live={isEmergency ? "assertive" : "polite"}
      className={clsx(
        "alert-banner sticky top-[var(--chrome-h)] z-[var(--z-banner)] border-b text-[13.6px] font-semibold min-h-[44px] flex items-center transition-colors duration-300",
        rowBg,
        className
      )}
    >
      <div className="flex items-center flex-wrap w-full">
        {/* Left Badge */}
        <div className="bg-[var(--accent-500)] text-white font-bold py-2.5 px-5 whitespace-nowrap z-10 flex items-center gap-2">
          {isEmergency ? (
            <AlertOctagon size={16} className="animate-spin" aria-hidden />
          ) : hasAlerts ? (
            <AlertTriangle size={15} aria-hidden />
          ) : (
            <CheckCircle2 size={15} aria-hidden />
          )}
          <span>{hasAlerts ? `Live alerts · ${sortedAlerts.length}` : "System status"}</span>
        </div>

        {/* Middle Track */}
        <div className="flex-1 flex items-center flex-wrap gap-2 px-4 py-1.5 min-w-0">
          {/* Unconfirmed Dimensions Notice (O4-3: suppresses green all-clear) */}
          {unconfirmedCount > 0 && (
            <span className="chip chip--info">
              <Info size={12} aria-hidden />
              <span>Dimensions not confirmed: alerts paused</span>
            </span>
          )}

          {/* Maintenance tanks notice */}
          {maintenanceTanks.map((tank) => (
            <span key={tank.id} className="chip chip--neutral">
              <span>{tank.label} in maintenance — alerts suppressed</span>
            </span>
          ))}

          {/* Active alert chips */}
          {visibleAlerts.map((alert) => {
            const sev = (alert.severity as Severity) || "info";
            return (
              <Link
                key={alert.id}
                href={`/alerts/${alert.id}`}
                className="hover:opacity-90 transition-opacity"
              >
                <span className="chip shadow-sm">
                  <SeverityChip severity={sev} />
                  <span className="ml-1 font-semibold">{alert.message}</span>
                </span>
              </Link>
            );
          })}

          {/* More chips indicator */}
          {remainingCount > 0 && (
            <Link href="/alerts" className="chip chip--neutral hover:bg-white/40">
              +{remainingCount} more
            </Link>
          )}

          {/* All clear state - only when 0 alerts AND 0 unconfirmed */}
          {!hasAlerts && unconfirmedCount === 0 && (
            <div className="flex items-center gap-2 text-[var(--ok-tx)] font-semibold">
              <CheckCircle2 size={16} aria-hidden />
              <span>All {totalTanks} tanks within thresholds. No active alerts.</span>
            </div>
          )}
        </div>

        {/* Right Action */}
        <div className="px-5 py-1 ml-auto whitespace-nowrap">
          <Link
            href="/alerts"
            className="text-[var(--brand-500)] font-bold text-[13px] hover:underline"
          >
            View all alerts →
          </Link>
        </div>
      </div>
    </aside>
  );
}

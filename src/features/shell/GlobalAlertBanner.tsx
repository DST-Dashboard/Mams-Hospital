"use client";

import clsx from "clsx";
import { AlertTriangle, ArrowRight, ShieldAlert, X } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { useAlerts } from "@/lib/hooks";

export function GlobalAlertBanner() {
  const { data: alerts } = useAlerts({ state: "open" });
  const [dismissed, setDismissed] = useState(false);

  const activeAlerts = alerts ?? [];
  if (activeAlerts.length === 0 || dismissed) return null;

  // Prioritize critical and emergency
  const topAlert =
    activeAlerts.find((a) => a.severity === "emergency") ??
    activeAlerts.find((a) => a.severity === "critical") ??
    activeAlerts.find((a) => a.severity === "warning") ??
    activeAlerts[0];

  if (!topAlert) return null;

  const isCritical = topAlert.severity === "critical" || topAlert.severity === "emergency";

  return (
    <div
      role="alert"
      className={clsx(
        "mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 shadow-sm transition-all",
        isCritical
          ? "border-crit/40 bg-crit/10 text-ink"
          : "border-warn/40 bg-warn/10 text-ink"
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className={clsx("shrink-0", isCritical ? "text-crit" : "text-warn")}>
          {isCritical ? <ShieldAlert className="h-5 w-5 animate-pulse" /> : <AlertTriangle className="h-5 w-5" />}
        </span>
        <div className="text-sm">
          <span className="font-semibold">{topAlert.tankLabel}: </span>
          <span className="text-muted text-ink/90">{topAlert.message}</span>
          {activeAlerts.length > 1 ? (
            <span className="ml-2 inline-flex items-center rounded bg-raised/80 px-2 py-0.5 text-xs font-medium text-muted">
              +{activeAlerts.length - 1} more
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link
          href={`/alerts/${topAlert.id}`}
          className={clsx(
            "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors",
            isCritical
              ? "bg-crit text-white hover:bg-crit/85"
              : "bg-warn text-bg hover:bg-warn/85"
          )}
        >
          <span>Respond</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss banner"
          className="rounded p-1 text-muted hover:text-ink hover:bg-raised/60 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

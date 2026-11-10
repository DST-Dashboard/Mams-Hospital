"use client";

import { AlertTriangle, CheckCircle2, ChevronRight, Clock, ShieldAlert } from "lucide-react";
import Link from "next/link";
import React from "react";
import { SeverityIcon } from "@/components/status/badges";
import { useAlerts } from "@/lib/hooks";
import { ago, stamp } from "@/lib/format";
import { useUi } from "@/lib/store";

export function AlertHistory({ tankId }: { tankId: number }) {
  const { data: alerts, isLoading, error } = useAlerts({ tankId, state: "all" });
  const tz = useUi((s) => s.tz);

  const tankAlerts = alerts ?? [];

  return (
    <div className="rounded-xl border hairline bg-surface p-5 space-y-4">
      <div className="flex items-center justify-between border-b hairline pb-3">
        <div className="flex items-center gap-2">
          <ShieldAlert size={18} className="text-warn" />
          <h3 className="text-base font-semibold text-ink">Alert & Alarm History</h3>
        </div>
        <span className="text-xs text-muted font-medium">
          {tankAlerts.length} total recorded events
        </span>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-xs text-muted">
          Loading alert log for this tank...
        </div>
      ) : error ? (
        <div role="alert" className="p-3 text-xs text-crit">
          Failed to load alerts: {error.message}
        </div>
      ) : tankAlerts.length === 0 ? (
        <div className="flex h-28 flex-col items-center justify-center text-center text-xs text-muted">
          <CheckCircle2 size={24} className="text-ok/70 mb-1" />
          <span>No alarm incidents logged for this tank. All telemetry is nominal.</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {tankAlerts.slice(0, 10).map((a) => {
            const isResolved = a.state === "resolved";
            const isAcked = a.state === "acknowledged";

            return (
              <div
                key={a.id}
                className="flex items-start justify-between gap-3 rounded-lg border hairline bg-raised/30 p-3 hover:bg-raised/60 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    <SeverityIcon severity={a.severity} size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-ink">{a.type}</span>
                      <span
                        className={`rounded px-1.5 py-0.2 text-[10px] font-semibold uppercase ${
                          isResolved
                            ? "bg-ok/15 text-ok"
                            : isAcked
                            ? "bg-info/15 text-info"
                            : "bg-crit/15 text-crit animate-pulse"
                        }`}
                      >
                        {a.state}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted line-clamp-1">{a.message}</p>
                    {a.ackNote ? (
                      <p className="mt-1 text-[11px] text-muted italic">Note: &ldquo;{a.ackNote}&rdquo;</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-col items-end shrink-0 gap-1.5">
                  <span className="text-[11px] font-mono text-muted">
                    {stamp(a.openedAt, tz)}
                  </span>
                  <Link
                    href={`/alerts/${a.id}`}
                    className="inline-flex items-center gap-0.5 text-xs font-medium text-tide hover:underline"
                  >
                    <span>Details</span>
                    <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

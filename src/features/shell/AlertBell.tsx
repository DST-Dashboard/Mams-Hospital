"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { useAlerts, useDashboard, useMe } from "@/lib/hooks";
import { post } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import { SeverityChip, type Severity } from "@/components/status/badges";
import { ago } from "@/lib/format";
import { Button } from "@/components/ui/Button";

export function AlertBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [ackingId, setAckingId] = useState<number | null>(null);
  const toast = useToast();

  const { data: me } = useMe();
  const { data: dashboard } = useDashboard();
  const { data: alertsData, mutate: refreshAlerts } = useAlerts({ state: "open" });

  const asOf = dashboard?.asOf ?? Date.now();
  const activeAlerts = alertsData || [];
  const count = activeAlerts.length;
  const canAck = me?.role === "operator" || me?.role === "admin";

  const handleAck = async (id: number) => {
    try {
      setAckingId(id);
      await post(`/api/alerts/${id}/ack`, { note: "Acknowledged via quick bell" });
      await refreshAlerts();
      toast.success("Alert acknowledged.");
    } catch {
      toast.error("Could not acknowledge alert.");
    } finally {
      setAckingId(null);
    }
  };

  return (
    <div className={`relative inline-block ${className || ""}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={`Alert notifications: ${count} active`}
        aria-expanded={open}
        className="relative w-9 h-9 rounded-full bg-[rgba(255,255,255,0.15)] border border-[rgba(255,255,255,0.20)] text-white flex items-center justify-center hover:bg-white/25 transition-all"
      >
        <Bell size={18} aria-hidden />

        {count > 0 && (
          <>
            <span
              className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[var(--accent-500)] text-white text-[10px] font-bold flex items-center justify-center leading-none"
              aria-hidden
            >
              {count > 9 ? "9+" : count}
            </span>
            <span
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[var(--accent-500)] opacity-75 animate-ping"
              aria-hidden
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Active alerts overview"
          className="absolute right-0 top-full mt-2 w-[360px] max-w-[calc(100vw-32px)] bg-[var(--bg-card)] rounded-[12px] p-3 border border-[var(--bd)] shadow-[var(--sh-shell)] z-[var(--z-dropdown)] border-t-[3px] border-t-[var(--accent-500)] text-[var(--tx-main)] animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--bd)]">
            <span className="font-bold text-[14px] text-[var(--tx-head)]">
              Alerts · {count} active
            </span>
            <Link
              href="/alerts"
              onClick={() => setOpen(false)}
              className="text-[12px] font-bold text-[var(--brand-500)] hover:underline"
            >
              View all
            </Link>
          </div>

          {activeAlerts.length === 0 ? (
            <p className="text-[13px] text-[var(--tx-muted)] text-center py-6">
              No active alerts. All tanks normal.
            </p>
          ) : (
            <div className="divide-y divide-[var(--bd-soft)] max-h-[360px] overflow-y-auto">
              {activeAlerts.slice(0, 5).map((alert) => {
                const sev = (alert.severity as Severity) || "info";
                return (
                  <div key={alert.id} className="py-2.5 flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <SeverityChip severity={sev} />
                        <span className="text-[11px] text-[var(--tx-quiet)]">
                          {ago(alert.openedAt, asOf)}
                        </span>
                      </div>
                      <Link
                        href={`/alerts/${alert.id}`}
                        onClick={() => setOpen(false)}
                        className="text-[12.8px] font-semibold text-[var(--tx-head)] hover:underline line-clamp-1"
                      >
                        {alert.message}
                      </Link>
                    </div>

                    {canAck && (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={ackingId === alert.id}
                        onClick={() => handleAck(alert.id)}
                        className="text-[11px] py-1 px-2 h-auto flex-shrink-0"
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 mt-2 border-t border-[var(--bd)] text-center">
            <Link
              href="/alerts"
              onClick={() => setOpen(false)}
              className="text-[12px] font-medium text-[var(--tx-link)] hover:underline"
            >
              Open alert log →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

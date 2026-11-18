"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const { data: me } = useMe();
  const { data: dashboard } = useDashboard();
  const { data: alertsData, mutate: refreshAlerts } = useAlerts({ state: "open" });

  const asOf = dashboard?.asOf ?? Date.now();
  const activeAlerts = alertsData || [];
  const count = activeAlerts.length;
  const canAck = me?.role === "operator" || me?.role === "admin";

  // Close on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node | null)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  // Keyboard navigation
  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setOpen((prev) => !prev);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  const handlePanelKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    }
  };

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
    <div ref={containerRef} className={`relative inline-block ${className || ""}`}>
      <button
        ref={triggerRef}
        type="button"
        id="alert-bell-trigger"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        aria-label={`Alert notifications: ${count} active`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative w-9 h-9 rounded-full bg-[var(--bg-card)] border border-[var(--bd)] text-[var(--tx-head)] flex items-center justify-center hover:bg-[var(--bg-subtle)] hover:text-[var(--brand-700)] transition-all shadow-sm"
      >
        <Bell size={18} className="text-[var(--tx-head)]" aria-hidden />

        {count > 0 && (
          <>
            <span
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--accent-500)] text-white text-[10px] font-bold flex items-center justify-center leading-none shadow-sm z-10"
              aria-hidden
            >
              {count > 9 ? "9+" : count}
            </span>
            <span
              className="absolute -top-1 -right-1 w-[18px] h-[18px] rounded-full bg-[var(--accent-500)] opacity-75 animate-ping pointer-events-none"
              aria-hidden
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="region"
          aria-label="Active alerts overview"
          aria-labelledby="alert-bell-trigger"
          onKeyDown={handlePanelKeyDown}
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

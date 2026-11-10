"use client";

import clsx from "clsx";
import { Bell, ChevronRight } from "lucide-react";
import Link from "next/link";
import React, { useEffect, useRef, useState } from "react";
import { useAlerts } from "@/lib/hooks";
import { SeverityIcon } from "@/components/status/badges";
import { ago } from "@/lib/format";

export function AlertBell() {
  const { data: alerts, isLoading } = useAlerts({ state: "open" });
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeAlerts = alerts ?? [];
  const count = activeAlerts.length;
  const hasCritical = activeAlerts.some((a) => a.severity === "critical" || a.severity === "emergency");

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={`Alert notifications: ${count} active alerts`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={clsx(
          "btn-quiet relative h-8 w-8 px-0 transition-colors",
          open && "bg-raised text-ink",
          hasCritical && "border-crit/50 text-crit"
        )}
      >
        <Bell size={16} aria-hidden="true" />
        {count > 0 ? (
          <span
            className={clsx(
              "absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white shadow-xs",
              hasCritical ? "bg-crit animate-pulse" : "bg-warn text-bg"
            )}
          >
            {count > 99 ? "99+" : count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Active alerts notification panel"
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-lg border hairline bg-surface p-0 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="flex items-center justify-between border-b hairline px-4 py-3 bg-raised/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-ink">Active Alerts</span>
              <span className="rounded-full bg-raised px-2 py-0.5 text-xs font-medium text-muted">
                {count}
              </span>
            </div>
            <Link
              href="/alerts"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-tide hover:underline flex items-center gap-0.5"
            >
              View all
              <ChevronRight size={12} />
            </Link>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y hairline divide-line/30">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-muted">Loading alerts...</div>
            ) : count === 0 ? (
              <div className="p-6 text-center text-xs text-muted">
                No active alerts at this time. All tanks operating within normal parameters.
              </div>
            ) : (
              activeAlerts.slice(0, 5).map((a) => (
                <Link
                  key={a.id}
                  href={`/alerts/${a.id}`}
                  onClick={() => setOpen(false)}
                  className="flex items-start gap-3 p-3.5 hover:bg-raised/60 transition-colors text-left"
                >
                  <div className="mt-0.5 shrink-0">
                    <SeverityIcon severity={a.severity} size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink truncate">{a.tankLabel}</span>
                      <span className="text-[11px] text-muted whitespace-nowrap">
                        {ago(a.openedAt, Date.now())}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted line-clamp-2 leading-relaxed">
                      {a.message}
                    </p>
                  </div>
                </Link>
              ))
            )}
          </div>

          {count > 5 ? (
            <div className="border-t hairline p-2 text-center bg-raised/20">
              <Link
                href="/alerts"
                onClick={() => setOpen(false)}
                className="text-xs text-muted hover:text-ink transition-colors block py-1 font-medium"
              >
                + {count - 5} more alerts in log
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

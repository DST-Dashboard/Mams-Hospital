"use client";

import clsx from "clsx";
import { Check, ChevronDown } from "lucide-react";
import React, { useRef, useState, useEffect } from "react";
import { useToast } from "@/components/ui/Toast";
import type { TankRow } from "@/server/repos/tanks";

const STATUSES: { value: TankRow["status"]; label: string; dot: string }[] = [
  { value: "active", label: "Active", dot: "bg-ok" },
  { value: "maintenance", label: "Maintenance", dot: "bg-warn" },
  { value: "draft", label: "Draft", dot: "bg-muted" },
  { value: "offline", label: "Offline", dot: "bg-crit" },
  { value: "decommissioned", label: "Decommissioned", dot: "bg-line" },
];

export function StatusMenu({ tank, onUpdated }: { tank: TankRow; onUpdated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success, error: toastError } = useToast();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const current = STATUSES.find((s) => s.value === tank.status) ?? STATUSES[0];

  const handleSelect = async (newStatus: TankRow["status"]) => {
    if (newStatus === tank.status || loading) return;
    try {
      setLoading(true);
      const g = tank.geometry;
      const res = await fetch(`/api/tanks/${tank.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          label: tank.label,
          deviceId: tank.deviceId,
          zone: tank.zone,
          location: tank.location,
          status: newStatus,
          shape: g.shape.kind,
          heightCm: g.heightCm,
          deadZoneCm: g.deadZoneCm,
          radiusCm: g.shape.kind === "cylinder" ? g.shape.radiusCm : undefined,
          widthCm: g.shape.kind === "rectangle" ? g.shape.widthCm : undefined,
          lengthCm: g.shape.kind === "rectangle" ? g.shape.lengthCm : undefined,
          warnPct: tank.thresholds.warnPct,
          critPct: tank.thresholds.critPct,
          emptyPct: tank.thresholds.emptyPct,
          dimsConfirmed: tank.dimsConfirmed,
        }),
      });

      if (!res.ok) throw new Error("Failed to change status");
      success(`Updated status of ${tank.label} to ${newStatus}`);
      setOpen(false);
      onUpdated?.();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error updating status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div ref={ref} className="relative inline-block text-left">
      <button
        type="button"
        disabled={loading}
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-full border hairline bg-surface px-2.5 py-1 text-xs font-medium text-ink hover:bg-raised transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide"
      >
        <span className={clsx("h-2 w-2 rounded-full shrink-0", current?.dot)} />
        <span className="capitalize">{tank.status}</span>
        <ChevronDown size={12} className="text-muted ml-0.5" />
      </button>

      {open ? (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-lg border hairline bg-surface p-1 shadow-lg z-30 animate-in fade-in duration-100">
          {STATUSES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => handleSelect(s.value)}
              className={clsx(
                "flex w-full items-center justify-between rounded px-2.5 py-1.5 text-xs text-left transition-colors",
                s.value === tank.status
                  ? "bg-raised font-semibold text-tide"
                  : "text-ink hover:bg-raised/60 hover:text-ink"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={clsx("h-2 w-2 rounded-full", s.dot)} />
                <span>{s.label}</span>
              </div>
              {s.value === tank.status ? <Check size={13} /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

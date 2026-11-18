"use client";

import { useState, useRef, useEffect } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { post } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";

export interface SnoozeMenuProps {
  alertId: number;
  disabled?: boolean;
  onSnoozed?: (snoozedUntil: number) => void;
  size?: "sm" | "md";
}

export function calculateUntilTomorrow8amIST(nowMs = Date.now()): number {
  // IST is UTC + 5:30 (330 minutes)
  const istOffsetMs = 330 * 60_000;
  const istNow = new Date(nowMs + istOffsetMs);

  const targetYear = istNow.getUTCFullYear();
  const targetMonth = istNow.getUTCMonth();
  const targetDate = istNow.getUTCDate() + (istNow.getUTCHours() >= 8 ? 1 : 0);

  const targetUtcMs = Date.UTC(targetYear, targetMonth, targetDate, 8, 0) - istOffsetMs;
  const minutes = Math.round((targetUtcMs - nowMs) / 60_000);
  return Math.min(24 * 60, Math.max(15, minutes));
}

export function SnoozeMenu({ alertId, disabled = false, onSnoozed, size = "sm" }: SnoozeMenuProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [open]);

  const handleSnooze = async (minutes: number, label: string) => {
    try {
      setBusy(true);
      setOpen(false);
      const res = await post<{ snoozedUntil?: number }>(`/api/alerts/${alertId}/snooze`, { minutes });
      toast.success(`Alert snoozed (${label})`);
      if (onSnoozed && res?.snoozedUntil) {
        onSnoozed(res.snoozedUntil);
      }
    } catch {
      toast.error("Failed to snooze alert.");
    } finally {
      setBusy(false);
    }
  };

  const options = [
    { label: "15 minutes", minutes: 15 },
    { label: "1 hour", minutes: 60 },
    { label: "4 hours", minutes: 240 },
    { label: "Until tomorrow 08:00 IST", minutes: calculateUntilTomorrow8amIST() },
  ];

  return (
    <div ref={menuRef} style={{ position: "relative", display: "inline-block" }}>
      <Button
        variant="outline"
        size={size}
        icon={Clock}
        disabled={disabled}
        loading={busy}
        onClick={() => setOpen(!open)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        Snooze
      </Button>

      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            background: "var(--bg-card)",
            border: "1px solid var(--bd)",
            borderRadius: "var(--r-md)",
            boxShadow: "var(--sh-card)",
            padding: "4px",
            zIndex: 100,
            minWidth: "190px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {options.map((opt) => (
            <button
              key={opt.label}
              type="button"
              role="menuitem"
              onClick={() => handleSnooze(opt.minutes, opt.label)}
              style={{
                background: "none",
                border: "none",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: "13px",
                borderRadius: "var(--r-sm)",
                color: "var(--tx-head)",
                cursor: "pointer",
                width: "100%",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import React from "react";
import clsx from "clsx";
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowUp,
  CheckCircle2,
  Clock,
  FlaskConical,
  HelpCircle,
  Hourglass,
  Info,
  Radio,
  Shield,
  User,
  Wrench,
  XCircle,
} from "lucide-react";

export type Severity = "info" | "warning" | "critical" | "emergency";

export function SeverityIcon({
  severity,
  size = 14,
  className,
}: {
  severity: Severity | string | null | undefined;
  size?: number;
  className?: string;
}) {
  switch (severity) {
    case "emergency":
      return <AlertOctagon size={size} className={clsx("text-white", className)} aria-hidden />;
    case "critical":
      return <AlertCircle size={size} className={clsx("text-[var(--err-tx)]", className)} aria-hidden />;
    case "warning":
      return <AlertTriangle size={size} className={clsx("text-[var(--warn-tx)]", className)} aria-hidden />;
    case "info":
    default:
      return <Info size={size} className={clsx("text-[var(--info-tx)]", className)} aria-hidden />;
  }
}

export function SeverityChip({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  const map: Record<Severity, { label: string; class: string }> = {
    emergency: { label: "EMERGENCY", class: "chip--emg" },
    critical: { label: "CRITICAL", class: "chip--err" },
    warning: { label: "WARNING", class: "chip--warn" },
    info: { label: "INFO", class: "chip--info" },
  };

  const item = map[severity] || map.info;

  return (
    <span className={clsx("chip uppercase tracking-[0.5px]", item.class, className)}>
      <SeverityIcon severity={severity} size={12} />
      <span>{item.label}</span>
    </span>
  );
}

export function AlertStateChip({
  state,
  severity = "warning",
  className,
}: {
  state: "active" | "acknowledged" | "snoozed" | "resolved" | "suppressed" | "escalated";
  severity?: string;
  className?: string;
}) {
  switch (state) {
    case "active":
      return (
        <SeverityChip
          severity={(severity as Severity) || "warning"}
          className={className}
        />
      );
    case "acknowledged":
      return (
        <span className={clsx("chip chip--info", className)}>
          <CheckCircle2 size={12} aria-hidden />
          <span>Acknowledged</span>
        </span>
      );
    case "snoozed":
      return (
        <span className={clsx("chip chip--neutral", className)}>
          <Clock size={12} aria-hidden />
          <span>Snoozed</span>
        </span>
      );
    case "resolved":
      return (
        <span className={clsx("chip chip--ok", className)}>
          <CheckCircle2 size={12} aria-hidden />
          <span>Resolved</span>
        </span>
      );
    case "suppressed":
      return (
        <span className={clsx("chip chip--neutral chip--dashed", className)}>
          <HelpCircle size={12} aria-hidden />
          <span>Suppressed</span>
        </span>
      );
    case "escalated":
      return (
        <span className={clsx("chip chip--err", className)}>
          <ArrowUp size={12} aria-hidden />
          <span>Escalated</span>
        </span>
      );
    default:
      return null;
  }
}

export function NodeStatusChip({
  status,
  className,
}: {
  status: "active" | "maintenance" | "offline" | "decommissioned" | "draft";
  className?: string;
}) {
  switch (status) {
    case "active":
      return (
        <span className={clsx("chip chip--ok", className)}>
          <CheckCircle2 size={12} aria-hidden />
          <span>Active</span>
        </span>
      );
    case "maintenance":
      return (
        <span className={clsx("chip chip--info", className)}>
          <Wrench size={12} aria-hidden />
          <span>Maintenance</span>
        </span>
      );
    case "offline":
      return (
        <span className={clsx("chip chip--err", className)}>
          <XCircle size={12} aria-hidden />
          <span>Offline</span>
        </span>
      );
    case "decommissioned":
      return (
        <span className={clsx("chip chip--neutral", className)}>
          <XCircle size={12} aria-hidden />
          <span>Decommissioned</span>
        </span>
      );
    case "draft":
    default:
      return (
        <span className={clsx("chip chip--neutral chip--dashed", className)}>
          <Hourglass size={12} aria-hidden />
          <span>Draft</span>
        </span>
      );
  }
}

export function SourceChip({
  simulated,
  className,
}: {
  simulated: boolean;
  className?: string;
}) {
  if (simulated) {
    return (
      <span
        title="Simulated sensor data (physics model)"
        className={clsx("chip chip--sim", className)}
      >
        <FlaskConical size={10} aria-hidden />
        <span>SIM</span>
      </span>
    );
  }

  return (
    <span
      title="Live physical hardware node"
      className={clsx("chip chip--ok text-[11px]", className)}
    >
      <Radio size={10} className="text-[var(--live)]" aria-hidden />
      <span>LIVE</span>
    </span>
  );
}

// Legacy alias for unmigrated views
export const SimulatedBadge = () => <SourceChip simulated={true} />;

export function QualityChip({
  quality,
  className,
}: {
  quality: "good" | "fair" | "weak";
  className?: string;
}) {
  switch (quality) {
    case "good":
      return (
        <span className={clsx("chip chip--ok text-[11px]", className)}>
          <CheckCircle2 size={11} aria-hidden />
          <span>Good</span>
        </span>
      );
    case "fair":
      return (
        <span className={clsx("chip chip--warn text-[11px]", className)}>
          <AlertTriangle size={11} aria-hidden />
          <span>Fair</span>
        </span>
      );
    case "weak":
    default:
      return (
        <span className={clsx("chip chip--err text-[11px]", className)}>
          <AlertCircle size={11} aria-hidden />
          <span>Weak</span>
        </span>
      );
  }
}

export function RoleChip({
  role,
  className,
}: {
  role: "viewer" | "operator" | "admin";
  className?: string;
}) {
  switch (role) {
    case "admin":
      return (
        <span
          className={clsx(
            "chip bg-[var(--brand-600)] text-white border-transparent text-[11px]",
            className
          )}
        >
          <Shield size={11} aria-hidden />
          <span className="capitalize">Admin</span>
        </span>
      );
    case "operator":
      return (
        <span className={clsx("chip chip--info text-[11px]", className)}>
          <User size={11} aria-hidden />
          <span className="capitalize">Operator</span>
        </span>
      );
    case "viewer":
    default:
      return (
        <span className={clsx("chip chip--neutral text-[11px]", className)}>
          <User size={11} aria-hidden />
          <span className="capitalize">Viewer</span>
        </span>
      );
  }
}

export function PhaseChip({
  phase,
  className,
}: {
  phase: 2 | 3;
  className?: string;
}) {
  return (
    <span className={clsx("chip chip--phase", className)} aria-hidden>
      PHASE {phase}
    </span>
  );
}

export function SampleDataBadge({ className }: { className?: string }) {
  return (
    <span
      title="Endpoint returned sample data (mock pending backend implementation)"
      className={clsx(
        "chip bg-amber-500 text-white font-bold text-[10px] tracking-wide uppercase px-2 py-0.5",
        className
      )}
    >
      SAMPLE DATA
    </span>
  );
}

export function FreshnessPill({
  ageMin,
  state,
  snapshot = false,
  label,
  className,
}: {
  ageMin?: number | null;
  state?: "fresh" | "stale" | "offline" | "none";
  snapshot?: boolean;
  label?: string;
  className?: string;
}) {
  // Thresholds: green <= 10m, amber 10-15m, red > 15m
  const computedAge = ageMin !== undefined ? ageMin : state === "fresh" ? 5 : state === "stale" ? 12 : null;
  const isOk = computedAge != null && computedAge <= 10;
  const isWarn = computedAge != null && computedAge > 10 && computedAge <= 15;
  const isErr = computedAge == null || computedAge > 15;

  const dotColor = isOk
    ? "bg-[var(--live)]"
    : isWarn
    ? "bg-[var(--gold-500)]"
    : "bg-[var(--err-tx)]";

  const defaultText = snapshot
    ? label || "Snapshot · last reading 30 Oct 11:13 IST"
    : isErr
    ? "No recent uplink"
    : isWarn
    ? `Delayed · uplink ${computedAge} min ago`
    : `Data fresh · uplink ${computedAge ?? 0} min ago`;

  const displayText = label || defaultText;

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 text-[12px] font-semibold text-[var(--tx-strip)] select-none",
        className
      )}
    >
      <span className={clsx("w-2 h-2 rounded-full flex-shrink-0", dotColor)} aria-hidden />
      <span>{displayText}</span>
    </div>
  );
}

export function ModeBadge({
  tanks = [],
  className,
}: {
  tanks?: { simulated: boolean }[];
  className?: string;
}) {
  const total = tanks.length;
  const simCount = tanks.filter((t) => t.simulated).length;
  const liveCount = total - simCount;

  let text = "DEMO DATA";
  if (total > 0) {
    if (simCount === total) {
      text = "DEMO DATA";
    } else if (liveCount === total) {
      text = `LIVE · ${total} NODES`;
    } else {
      text = `MIXED · ${liveCount} LIVE + ${simCount} SIMULATED`;
    }
  }

  return (
    <div
      className={clsx(
        "chip chip--info font-bold text-[12.8px] tracking-[0.5px] uppercase shadow-sm",
        className
      )}
    >
      {text}
    </div>
  );
}

"use client";

import React from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, AlertTriangle, Info, Inbox, Lock } from "lucide-react";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  text: string;
  action?: React.ReactNode;
  locked?: 2 | 3;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  text,
  action,
  locked,
  className,
}: EmptyStateProps) {
  return (
    <div className={clsx("empty-state", className)}>
      <div className="empty-bubble">
        {locked ? <Lock size={26} aria-hidden /> : <Icon size={26} aria-hidden />}
      </div>
      <h2 className="text-[20px] font-semibold text-[var(--tx-head)] mb-2 font-display">
        {title}
      </h2>
      <p className="text-[14px] text-[var(--tx-muted)] max-w-[480px] mb-4 leading-[1.6]">
        {text}
      </p>

      {locked && (
        <span className="chip chip--phase mb-2" aria-hidden>
          PHASE {locked}
        </span>
      )}

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Could not load data",
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={clsx(
        "rounded-[12px] border border-[var(--err-bd)] bg-[var(--err-bg)] p-6 my-4 text-[var(--err-tx)]",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={20} className="flex-shrink-0 mt-0.5" aria-hidden />
        <div className="flex-grow min-w-0">
          <h3 className="text-[16px] font-semibold m-0 mb-1">{title}</h3>
          <p className="text-[13px] opacity-90 m-0 leading-[1.6]">{message}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="btn btn-outline btn-sm mt-3 border-[var(--err-bd)] text-[var(--err-tx)] hover:bg-white/20"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export interface BannerProps {
  tone: "warning" | "error" | "info";
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function Banner({ tone, children, action, className }: BannerProps) {
  const Icon = tone === "error" ? AlertCircle : tone === "warning" ? AlertTriangle : Info;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={clsx(
        "banner",
        tone === "warning" && "banner--warning",
        tone === "error" && "banner--error",
        tone === "info" && "banner--info",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon size={18} className="flex-shrink-0" aria-hidden />
        <div className="text-[12px] font-medium leading-[1.5] min-w-0">{children}</div>
      </div>
      {action && <div className="flex-shrink-0 ml-3">{action}</div>}
    </div>
  );
}

export function Skeleton({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={clsx("skeleton", className)} style={style} aria-hidden="true" />;
}

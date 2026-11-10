"use client";

import clsx from "clsx";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import React, { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: ReactNode;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: ReactNode, type?: ToastType, duration?: number) => void;
  success: (message: ReactNode, duration?: number) => void;
  error: (message: ReactNode, duration?: number) => void;
  info: (message: ReactNode, duration?: number) => void;
  warning: (message: ReactNode, duration?: number) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const iconMap: Record<ToastType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const typeStyles: Record<ToastType, { border: string; bg: string; icon: string }> = {
  success: { border: "border-ok/30", bg: "bg-surface", icon: "text-ok" },
  error: { border: "border-crit/40", bg: "bg-surface", icon: "text-crit" },
  info: { border: "border-info/30", bg: "bg-surface", icon: "text-info" },
  warning: { border: "border-warn/40", bg: "bg-surface", icon: "text-warn" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (message: ReactNode, type: ToastType = "info", duration = 4000) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, message, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: addToast,
      success: (msg, dur) => addToast(msg, "success", dur),
      error: (msg, dur) => addToast(msg, "error", dur ?? 6000),
      info: (msg, dur) => addToast(msg, "info", dur),
      warning: (msg, dur) => addToast(msg, "warning", dur ?? 5000),
      dismiss,
    }),
    [addToast, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        role="region"
        aria-label="Notifications"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const Icon = iconMap[t.type];
          const styles = typeStyles[t.type];
          return (
            <div
              key={t.id}
              role={t.type === "error" ? "alert" : "status"}
              className={clsx(
                "pointer-events-auto flex items-start gap-3 rounded-md border p-3 shadow-lg transition-all",
                styles.bg,
                styles.border
              )}
            >
              <Icon className={clsx("h-5 w-5 shrink-0 mt-0.5", styles.icon)} aria-hidden="true" />
              <div className="flex-1 text-sm font-medium text-ink leading-snug">{t.message}</div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss notification"
                className="shrink-0 rounded p-1 text-muted hover:text-ink hover:bg-raised/80 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Return a dummy fallback so it doesn't break if used outside provider
    return {
      toast: () => {},
      success: () => {},
      error: () => {},
      info: () => {},
      warning: () => {},
      dismiss: () => {},
    };
  }
  return ctx;
}

"use client";

import React, { createContext, useCallback, useContext, useId, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastTone = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  tone: ToastTone;
  message: string;
}

export interface ToastContextValue {
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idPrefix = useId();

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (tone: ToastTone, message: string) => {
      const id = `${idPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const item: ToastItem = { id, tone, message };

      setToasts((prev) => [...prev, item]);

      // Auto-dismiss 5s, errors persist until closed
      if (tone !== "error") {
        setTimeout(() => {
          removeToast(id);
        }, 5000);
      }
    },
    [idPrefix, removeToast]
  );

  const value: ToastContextValue = {
    success: useCallback((msg) => addToast("success", msg), [addToast]),
    error: useCallback((msg) => addToast("error", msg), [addToast]),
    info: useCallback((msg) => addToast("info", msg), [addToast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((toast) => {
          const isError = toast.tone === "error";
          return (
            <div
              key={toast.id}
              role={isError ? "alert" : "status"}
              className={clsx(
                "toast",
                toast.tone === "success" && "toast--success",
                toast.tone === "error" && "toast--error",
                toast.tone === "info" && "toast--info"
              )}
            >
              <div className="flex-shrink-0 mt-0.5">
                {toast.tone === "success" && (
                  <CheckCircle2 size={18} className="text-[var(--ok-tx)]" aria-hidden />
                )}
                {toast.tone === "error" && (
                  <AlertTriangle size={18} className="text-[var(--err-tx)]" aria-hidden />
                )}
                {toast.tone === "info" && (
                  <Info size={18} className="text-[var(--info-tx)]" aria-hidden />
                )}
              </div>

              <div className="flex-grow min-w-0 pr-2">
                <p className="text-[14px] font-semibold text-[var(--tx-head)] m-0 mb-0.5 leading-[1.3]">
                  {toast.tone === "success" ? "Success" : toast.tone === "error" ? "Error" : "Notice"}
                </p>
                <p className="text-[12.8px] text-[var(--tx-main)] m-0 leading-[1.4] break-words">
                  {toast.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                aria-label="Dismiss notification"
                className="btn btn-outline btn-icon rounded-full w-6 h-6 p-0 border-none text-[var(--tx-muted)] hover:text-[var(--tx-head)] flex-shrink-0"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

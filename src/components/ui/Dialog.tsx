"use client";

import React, { useEffect, useRef } from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { trapFocus } from "@/lib/a11y";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: {
    icon: LucideIcon;
    text: string;
  };
  size?: "md" | "lg";
  mandatory?: boolean;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({
  open,
  onClose,
  title,
  eyebrow,
  size = "md",
  mandatory = false,
  footer,
  children,
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    if (!open) return;

    // Body scroll lock
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus trap: run once on mount of open dialog
    const cleanupFocus = trapFocus(panelRef.current);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !mandatory) {
        e.preventDefault();
        onCloseRef.current();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      cleanupFocus();
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, mandatory]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      className="modal-overlay"
      onClick={(e) => {
        if (!mandatory && e.target === e.currentTarget) {
          onCloseRef.current();
        }
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        tabIndex={-1}
        className={clsx(
          "modal",
          size === "lg" && "modal--lg",
          className
        )}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            {eyebrow && (
              <div className="eyebrow">
                <eyebrow.icon size={12} aria-hidden />
                <span>{eyebrow.text}</span>
              </div>
            )}
            <h2 id="dialog-title" className="card-title text-[24px]">
              {title}
            </h2>
          </div>

          {!mandatory && (
            <button
              type="button"
              onClick={() => onCloseRef.current()}
              aria-label="Close dialog"
              className="btn btn-outline btn-icon rounded-full w-9 h-9 p-0 inline-flex items-center justify-center text-[var(--tx-label)] hover:text-[var(--tx-head)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
            >
              <X size={18} aria-hidden />
            </button>
          )}
        </div>

        <div className="modal-body text-[14px] text-[var(--tx-main)]">
          {children}
        </div>

        {footer && (
          <div className="modal-footer flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[var(--bd)]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

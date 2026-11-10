"use client";

import clsx from "clsx";
import { X } from "lucide-react";
import React, { useEffect, useRef, type ReactNode } from "react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  closeOnBackdrop?: boolean;
}

const widthStyles: Record<NonNullable<DialogProps["maxWidth"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "md",
  className,
  closeOnBackdrop = true,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocusedElement.current = document.activeElement as HTMLElement | null;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === "Tab" && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    // Focus first focusable element
    requestAnimationFrame(() => {
      if (dialogRef.current) {
        const first = dialogRef.current.querySelector<HTMLElement>(
          'button:not([aria-label="Close"]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        (first ?? dialogRef.current).focus();
      }
    });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previouslyFocusedElement.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-150"
      aria-modal="true"
      role="dialog"
      aria-labelledby={title ? "dialog-title" : undefined}
      aria-describedby={description ? "dialog-description" : undefined}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={clsx(
          "relative w-full rounded-lg border hairline bg-surface p-6 shadow-xl z-10 transition-all",
          "focus:outline-none",
          widthStyles[maxWidth],
          className
        )}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-4 right-4 rounded p-1 text-muted hover:text-ink hover:bg-raised transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide"
        >
          <X className="h-5 w-5" aria-hidden="true" />
        </button>

        {title ? (
          <div className="mb-4 pr-6">
            <h2 id="dialog-title" className="text-lg font-semibold tracking-tight text-ink">
              {title}
            </h2>
            {description ? (
              <p id="dialog-description" className="mt-1 text-sm text-muted">
                {description}
              </p>
            ) : null}
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}

export function DialogFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mt-6 flex flex-wrap items-center justify-end gap-3", className)}>
      {children}
    </div>
  );
}

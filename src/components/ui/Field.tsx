"use client";

import clsx from "clsx";
import React, { useId, type ReactNode } from "react";

export interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: FieldProps) {
  const generatedId = useId();
  const id = htmlFor || generatedId;

  return (
    <div className={clsx("w-full space-y-1.5", className)}>
      {label ? (
        <div className="flex items-center justify-between">
          <label htmlFor={id} className="block text-xs font-medium text-ink">
            {label}
            {required ? <span className="ml-1 text-crit" aria-hidden="true">*</span> : null}
          </label>
        </div>
      ) : null}

      <div>{children}</div>

      {error ? (
        <p className="text-xs text-crit flex items-center gap-1" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

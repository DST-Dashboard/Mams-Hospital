"use client";

import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import React, { forwardRef, type SelectHTMLAttributes, type ReactNode } from "react";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  options?: SelectOption[];
  error?: ReactNode;
  hint?: ReactNode;
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, label, options, error, hint, placeholder, children, id, disabled, ...props },
  ref
) {
  const generatedId = React.useId();
  const selectId = id || generatedId;

  return (
    <div className="w-full space-y-1.5">
      {label ? (
        <label htmlFor={selectId} className="block text-xs font-medium text-ink">
          {label}
        </label>
      ) : null}

      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={clsx(
            "field appearance-none pr-9 text-ink bg-surface transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide focus-visible:ring-offset-1",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            error ? "border-crit focus-visible:ring-crit" : "border hairline focus-visible:ring-tide",
            className
          )}
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options
            ? options.map((opt) => (
                <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                  {opt.label}
                </option>
              ))
            : children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted"
          aria-hidden="true"
        />
      </div>

      {error ? (
        <p className="text-xs text-crit" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
});

Select.displayName = "Select";

"use client";

import React, { forwardRef } from "react";
import clsx from "clsx";

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  error?: boolean | string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { options, error, className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      aria-invalid={Boolean(error) ? "true" : undefined}
      className={clsx("select", className)}
      {...props}
    >
      {options
        ? options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))
        : children}
    </select>
  );
});

"use client";

import React, { forwardRef, useId } from "react";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";

export interface FieldProps {
  label: string;
  icon?: LucideIcon;
  help?: string;
  error?: string;
  unit?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({
  label,
  icon: Icon,
  help,
  error,
  unit,
  required,
  htmlFor,
  children,
  className,
}: FieldProps) {
  const generatedId = useId();
  const id = htmlFor || generatedId;
  const errorId = `${id}-error`;
  const helpId = `${id}-help`;

  return (
    <div className={clsx("field", className)}>
      <label htmlFor={id} className="control-label">
        {label}
        {required && <span className="text-[var(--accent-500)] ml-0.5">*</span>}
        {Icon && <Icon size={12} className="text-[var(--accent-500)] ml-1" aria-hidden />}
      </label>

      <div className={clsx(unit && "field-unit")}>
        {children}
        {unit && <span className="unit-suffix" aria-hidden>{unit}</span>}
      </div>

      {help && !error && (
        <p id={helpId} className="text-[12px] text-[var(--tx-note)] mt-1 mb-0 leading-[1.6]">
          {help}
        </p>
      )}

      {error && (
        <p id={errorId} role="alert" className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      aria-invalid={Boolean(error) ? "true" : undefined}
      className={clsx("input", className)}
      {...props}
    />
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, error, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={Boolean(error) ? "true" : undefined}
      className={clsx("textarea", className)}
      {...props}
    />
  );
});

"use client";

import clsx from "clsx";
import { Loader2 } from "lucide-react";
import React, { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

export type ButtonVariant = "primary" | "quiet" | "danger" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: "left" | "right";
  children?: ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: "bg-tide text-bg font-medium hover:bg-tide/85 shadow-sm active:translate-y-px",
  quiet: "border hairline bg-surface hover:bg-raised text-ink active:translate-y-px",
  danger: "bg-crit text-white hover:bg-crit/90 active:translate-y-px shadow-sm",
  outline: "border hairline bg-transparent hover:bg-surface text-ink",
  ghost: "bg-transparent hover:bg-raised/60 text-ink",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs rounded gap-1.5",
  md: "h-10 px-4 text-sm rounded gap-2",
  lg: "h-12 px-6 text-base rounded-md gap-2.5",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    disabled = false,
    icon,
    iconPosition = "left",
    children,
    className,
    type = "button",
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={clsx(
        "inline-flex items-center justify-center font-medium transition-all select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2
          className={clsx("animate-spin shrink-0", size === "sm" ? "w-3.5 h-3.5" : size === "lg" ? "w-5 h-5" : "w-4 h-4")}
          aria-hidden="true"
        />
      ) : icon && iconPosition === "left" ? (
        <span className="shrink-0">{icon}</span>
      ) : null}

      {children ? <span>{children}</span> : null}

      {!loading && icon && iconPosition === "right" ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
    </button>
  );
});

Button.displayName = "Button";

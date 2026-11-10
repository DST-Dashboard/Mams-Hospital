"use client";

import React, { forwardRef } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { LucideIcon } from "lucide-react";
import { Loader2, Lock } from "lucide-react";

export type ButtonVariant =
  | "primary"
  | "cta"
  | "data"
  | "accent"
  | "outline"
  | "secondary"
  | "glass"
  | "danger";

export interface ButtonBaseProps {
  variant?: ButtonVariant;
  size?: "md" | "sm";
  icon?: LucideIcon;
  loading?: boolean;
  iconOnly?: boolean;
  lock?: 2 | 3;
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonBaseProps {}

export interface LinkButtonProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement>,
    ButtonBaseProps {
  href: string;
}

const variantClassMap: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  cta: "btn-cta",
  data: "btn-data",
  accent: "btn-accent",
  outline: "btn-outline",
  secondary: "btn-secondary",
  glass: "btn-glass",
  danger: "btn-danger",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    icon: Icon,
    loading = false,
    iconOnly = false,
    lock,
    className,
    disabled,
    children,
    onClick,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading || Boolean(lock);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled) {
      e.preventDefault();
      return;
    }
    // Radial ripple effect (§11.2, §16)
    if (!lock && variant === "primary") {
      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const circle = document.createElement("span");
      const diameter = Math.max(rect.width, rect.height);
      const radius = diameter / 2;

      circle.style.width = circle.style.height = `${diameter}px`;
      circle.style.left = `${e.clientX - rect.left - radius}px`;
      circle.style.top = `${e.clientY - rect.top - radius}px`;
      circle.style.position = "absolute";
      circle.style.borderRadius = "50%";
      circle.style.transform = "scale(0)";
      circle.style.animation = "ripple 600ms linear";
      circle.style.backgroundColor = "rgba(255, 255, 255, 0.4)";
      circle.style.pointerEvents = "none";

      const ripple = button.getElementsByClassName("btn-ripple")[0];
      if (ripple) ripple.remove();

      circle.className = "btn-ripple";
      button.appendChild(circle);
      setTimeout(() => circle.remove(), 600);
    }

    onClick?.(e);
  };

  return (
    <button
      ref={ref}
      disabled={isDisabled}
      aria-busy={loading ? "true" : undefined}
      aria-disabled={isDisabled ? "true" : undefined}
      onClick={handleClick}
      className={clsx(
        "btn",
        variantClassMap[variant],
        size === "sm" && "btn-sm",
        iconOnly && "btn-icon",
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={size === "sm" ? 14 : 16} aria-hidden />
      ) : lock ? (
        <Lock size={size === "sm" ? 14 : 16} aria-hidden />
      ) : Icon ? (
        <Icon size={size === "sm" ? 14 : 16} aria-hidden />
      ) : null}

      {!iconOnly && children}

      {lock && (
        <span className="chip chip--phase ml-1" aria-hidden>
          PHASE {lock}
        </span>
      )}
    </button>
  );
});

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(function LinkButton(
  {
    href,
    variant = "primary",
    size = "md",
    icon: Icon,
    loading = false,
    iconOnly = false,
    lock,
    className,
    children,
    ...props
  },
  ref
) {
  if (lock) {
    return (
      <span
        ref={ref}
        aria-disabled="true"
        className={clsx(
          "btn",
          variantClassMap[variant],
          size === "sm" && "btn-sm",
          iconOnly && "btn-icon",
          "opacity-50 cursor-not-allowed pointer-events-none",
          className
        )}
      >
        <Lock size={size === "sm" ? 14 : 16} aria-hidden />
        {!iconOnly && children}
        <span className="chip chip--phase ml-1" aria-hidden>
          PHASE {lock}
        </span>
      </span>
    );
  }

  return (
    <Link
      ref={ref}
      href={href}
      className={clsx(
        "btn",
        variantClassMap[variant],
        size === "sm" && "btn-sm",
        iconOnly && "btn-icon",
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="animate-spin" size={size === "sm" ? 14 : 16} aria-hidden />
      ) : Icon ? (
        <Icon size={size === "sm" ? 14 : 16} aria-hidden />
      ) : null}
      {!iconOnly && children}
    </Link>
  );
});

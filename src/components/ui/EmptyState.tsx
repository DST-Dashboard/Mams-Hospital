"use client";

import clsx from "clsx";
import React, { type ReactNode } from "react";
import { Button, type ButtonProps } from "./Button";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    variant?: ButtonProps["variant"];
  };
  secondaryAction?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex min-h-[220px] flex-col items-center justify-center rounded-lg border border-dashed hairline bg-surface/50 p-8 text-center",
        className
      )}
    >
      {icon ? (
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-raised/80 text-muted">
          {icon}
        </div>
      ) : null}

      <h3 className="text-base font-semibold text-ink">{title}</h3>

      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-muted">{description}</p>
      ) : null}

      {children ? <div className="mt-4">{children}</div> : null}

      {action || secondaryAction ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {action ? (
            <Button
              variant={action.variant ?? "primary"}
              size="sm"
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ) : null}
          {secondaryAction}
        </div>
      ) : null}
    </div>
  );
}

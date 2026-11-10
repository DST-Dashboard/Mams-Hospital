"use client";

import clsx from "clsx";
import React, { useId, useState, type ReactNode } from "react";

export interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  side?: "top" | "bottom" | "left" | "right";
}

const sideStyles: Record<NonNullable<TooltipProps["side"]>, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export function Tooltip({ content, children, className, side = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const id = useId();

  if (!content) return <>{children}</>;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      <span aria-describedby={visible ? id : undefined}>{children}</span>

      {visible ? (
        <span
          id={id}
          role="tooltip"
          className={clsx(
            "pointer-events-none absolute z-50 whitespace-nowrap rounded bg-ink px-2 py-1 text-xs font-normal text-bg shadow-md",
            "animate-in fade-in-50 zoom-in-95 duration-100",
            sideStyles[side],
            className
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}

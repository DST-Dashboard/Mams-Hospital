"use client";

import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";

export interface TooltipProps {
  text: string;
  children: React.ReactElement;
  className?: string;
}

export function Tooltip({ text, children, className }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const show = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setVisible(true);
    }, 150); // 150ms delay per spec §20
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && visible) {
        hide();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible]);

  return (
    <div
      className={clsx("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && text && (
        <div
          role="tooltip"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[1150] px-2.5 py-1.5 rounded-[6px] text-white text-[12px] leading-[1.5] max-w-[240px] whitespace-normal pointer-events-none shadow-md animate-in fade-in duration-150"
          style={{ backgroundColor: "var(--bg-code, #1a202c)" }}
        >
          {text}
          {/* Arrow */}
          <span
            className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4"
            style={{ borderTopColor: "var(--bg-code, #1a202c)" }}
            aria-hidden
          />
        </div>
      )}
    </div>
  );
}

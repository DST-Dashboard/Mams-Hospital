"use client";

import React from "react";
import clsx from "clsx";
import type { CalendarDayItem } from "@/lib/windows";

export interface DaySelectorProps {
  days: CalendarDayItem[];
  selectedKey?: string; // "last24h" or "YYYY-MM-DD"
  onSelectDay: (key: string) => void;
  className?: string;
}

export function DaySelector({
  days,
  selectedKey = "last24h",
  onSelectDay,
  className,
}: DaySelectorProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Calendar day selector"
      className={clsx("flex flex-wrap items-center gap-1.5", className)}
    >
      {/* 24-Hour Rolling Default Option */}
      <button
        type="button"
        role="radio"
        aria-checked={selectedKey === "last24h"}
        onClick={() => onSelectDay("last24h")}
        className={clsx(
          "btn btn-sm text-[12px] font-semibold px-2.5 py-1 rounded-full border transition-all",
          selectedKey === "last24h"
            ? "bg-[var(--brand-600)] text-white border-[var(--brand-600)] shadow-sm"
            : "bg-[var(--bg-card)] text-[var(--tx-main)] border-[var(--bd)] hover:bg-[var(--bg-subtle)]"
        )}
      >
        Last 24h
      </button>

      {/* Calendar Days */}
      {days.map((day) => {
        const isSelected = selectedKey === day.key;
        return (
          <button
            key={day.key}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelectDay(day.key)}
            className={clsx(
              "btn btn-sm text-[12px] font-semibold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5",
              isSelected
                ? "bg-[var(--brand-600)] text-white border-[var(--brand-600)] shadow-sm"
                : "bg-[var(--bg-card)] text-[var(--tx-main)] border-[var(--bd)] hover:bg-[var(--bg-subtle)]"
            )}
          >
            <span>{day.label}</span>
            {day.partial && (
              <span
                className={clsx(
                  "text-[9.5px] px-1 py-0.2 rounded font-bold uppercase tracking-wider",
                  isSelected
                    ? "bg-white/20 text-white"
                    : "bg-[var(--bg-pill)] text-[var(--tx-quiet)]"
                )}
                title="Partial day at dataset boundary"
              >
                partial
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

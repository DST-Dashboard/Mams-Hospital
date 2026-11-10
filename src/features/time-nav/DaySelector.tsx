"use client";

import clsx from "clsx";
import React from "react";
import { useUi } from "@/lib/store";
import { toZoned } from "@/domain/time";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface DaySelectorProps {
  asOf: number;
  selectedDay?: number | null; // 0 = Mon .. 6 = Sun
  onSelectDay: (from: number, to: number, dow: number) => void;
  className?: string;
}

export function DaySelector({ asOf, selectedDay, onSelectDay, className }: DaySelectorProps) {
  const tz = useUi((s) => s.tz);

  // Compute the 7 calendar days ending at asOf
  const daySlices = React.useMemo(() => {
    const endZoned = toZoned(asOf, tz);
    const slices = [];

    for (let i = 6; i >= 0; i--) {
      // Step back i days
      const targetTime = asOf - i * 24 * 3600_000;
      const zoned = toZoned(targetTime, tz);
      // JS getUTCDay(): 0 is Sunday, 1 is Monday... convert to Mon=0..Sun=6
      const jsDay = zoned.getUTCDay();
      const dow = jsDay === 0 ? 6 : jsDay - 1;

      // Start of day in UTC ms
      const startOfDay = targetTime - (targetTime % (24 * 3600_000));
      const endOfDay = startOfDay + 24 * 3600_000;

      slices.push({
        dow,
        label: DAYS[dow]!,
        date: `${zoned.getUTCDate()} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][zoned.getUTCMonth()]}`,
        from: startOfDay,
        to: Math.min(asOf, endOfDay),
      });
    }

    return slices;
  }, [asOf, tz]);

  return (
    <div
      role="group"
      aria-label="Filter by specific day of the week"
      className={clsx("flex items-center gap-1.5 overflow-x-auto pb-1", className)}
    >
      {daySlices.map((slice) => {
        const isSelected = selectedDay === slice.dow;

        return (
          <button
            key={`${slice.dow}-${slice.from}`}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelectDay(slice.from, slice.to, slice.dow)}
            className={clsx(
              "flex flex-col items-center rounded-md border px-2.5 py-1.5 text-xs transition-colors whitespace-nowrap",
              isSelected
                ? "border-tide bg-tide text-bg font-bold shadow-xs"
                : "border-line/60 bg-surface text-muted hover:bg-raised hover:text-ink"
            )}
          >
            <span className="font-semibold">{slice.label}</span>
            <span className={clsx("text-[10px]", isSelected ? "text-bg/80" : "text-muted")}>
              {slice.date}
            </span>
          </button>
        );
      })}
    </div>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import { Heatmap } from "@/components/charts/Heatmap";
import { aggregateHeatmap, type PointLike } from "@/lib/heatmap";
import { Select } from "@/components/ui/Select";
import { useUi } from "@/lib/store";
import type { CalendarDayItem } from "@/lib/windows";
import type { TankCardData } from "@/lib/types";

export interface WeekHeatmapProps {
  tanks: TankCardData[];
  readingsMap: Map<number, PointLike[]>;
  calendarDays: CalendarDayItem[];
  activeDayKey?: string;
  onSelectCell?: (dayKey: string, hour: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function WeekHeatmap({
  tanks,
  readingsMap,
  calendarDays,
  activeDayKey,
  onSelectCell,
  isLoading = false,
  className,
}: WeekHeatmapProps) {
  const tz = useUi((s) => s.tz);
  const [selectedTankId, setSelectedTankId] = useState<string>("all");

  const options = [
    { value: "all", label: "All tanks (Average)" },
    ...tanks.map((t) => ({
      value: String(t.id),
      label: `${t.label}${t.simulated ? " (SIM)" : ""}`,
    })),
  ];

  // Aggregate points based on chosen tank
  const pointsToAggregate = useMemo(() => {
    if (selectedTankId === "all") {
      const all: PointLike[] = [];
      readingsMap.forEach((pts) => {
        all.push(...pts);
      });
      return all;
    }
    const id = Number(selectedTankId);
    return readingsMap.get(id) || [];
  }, [selectedTankId, readingsMap]);

  const grid = useMemo(() => {
    return aggregateHeatmap(pointsToAggregate, tz, calendarDays);
  }, [pointsToAggregate, tz, calendarDays]);

  return (
    <div className={className}>
      <div className="flex justify-end mb-2">
        <div className="w-56">
          <Select
            value={selectedTankId}
            onChange={(e) => setSelectedTankId(e.target.value)}
            options={options}
            aria-label="Filter heatmap by tank"
          />
        </div>
      </div>

      <Heatmap
        grid={grid}
        activeDayKey={activeDayKey}
        onSelectCell={onSelectCell}
        isLoading={isLoading}
      />
    </div>
  );
}

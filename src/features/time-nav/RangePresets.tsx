"use client";

import React from "react";
import { Segmented } from "@/components/ui/primitives";

export type PresetKey = "1h" | "6h" | "24h" | "week" | "custom";

export interface RangePresetsProps {
  value: PresetKey;
  onChange: (preset: PresetKey) => void;
  className?: string;
}

export function RangePresets({ value, onChange, className }: RangePresetsProps) {
  const options: { value: PresetKey; label: string; title?: string }[] = [
    { value: "1h", label: "1h", title: "Last 1 hour" },
    { value: "6h", label: "6h", title: "Last 6 hours" },
    { value: "24h", label: "24h", title: "Last 24 hours (Full Day)" },
    { value: "week", label: "Week", title: "Scroll and focus the 7-day monitoring panel" },
    { value: "custom", label: "Custom", title: "Choose custom start and end times" },
  ];

  return (
    <div className={className}>
      <Segmented<PresetKey>
        value={value}
        onChange={onChange}
        options={options}
        ariaLabel="Time range selection preset"
        size="sm"
      />
    </div>
  );
}

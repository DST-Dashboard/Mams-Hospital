"use client";

import React, { useState } from "react";
import { Calendar, Clock, Share2, Check } from "lucide-react";
import { RangePresets, type PresetKey } from "./RangePresets";
import { DaySelector } from "./DaySelector";
import {
  ControlPanel,
  ControlGroup,
  FieldHelp,
  ContextBar,
} from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { CalendarDayItem, Scope } from "@/lib/windows";
import { stamp } from "@/lib/format";
import { useUi } from "@/lib/store";

export interface TimeNavPanelProps {
  scope: Scope;
  onScopeChange: (next: Scope) => void;
  calendarDays: CalendarDayItem[];
  asOf: number;
  totalTanks?: number;
  onScrollToWeek?: () => void;
  className?: string;
}

export function TimeNavPanel({
  scope,
  onScopeChange,
  calendarDays,
  asOf,
  totalTanks = 5,
  onScrollToWeek,
  className,
}: TimeNavPanelProps) {
  const tz = useUi((s) => s.tz);
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  // Derive active preset
  const activePreset: PresetKey =
    scope.day === "1h"
      ? "1h"
      : scope.day === "6h"
      ? "6h"
      : scope.day === "24h" || scope.day === "last24h"
      ? "24h"
      : scope.from && scope.to && scope.day === "custom"
      ? "custom"
      : "24h";

  const handlePresetChange = (preset: PresetKey) => {
    if (preset === "week") {
      if (onScrollToWeek) onScrollToWeek();
      return;
    }

    if (preset === "1h") {
      onScopeChange({
        ...scope,
        day: "1h",
        from: asOf - 3600_000,
        to: asOf,
      });
    } else if (preset === "6h") {
      onScopeChange({
        ...scope,
        day: "6h",
        from: asOf - 6 * 3600_000,
        to: asOf,
      });
    } else if (preset === "24h") {
      onScopeChange({
        ...scope,
        day: "last24h",
        from: asOf - 24 * 3600_000,
        to: asOf,
      });
    } else if (preset === "custom") {
      onScopeChange({
        ...scope,
        day: "custom",
        from: scope.from || asOf - 24 * 3600_000,
        to: scope.to || asOf,
      });
    }
  };

  const handleSelectDay = (dayKey: string) => {
    if (dayKey === "last24h") {
      onScopeChange({
        ...scope,
        day: "last24h",
        from: asOf - 24 * 3600_000,
        to: asOf,
      });
    } else {
      const item = calendarDays.find((d) => d.key === dayKey);
      if (item) {
        onScopeChange({
          ...scope,
          day: dayKey,
          from: item.from,
          to: item.to,
        });
      }
    }
  };

  // Copy shareable link
  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Bookmarkable view URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this URL:", window.location.href);
    }
  };

  // Context sentence (§6.2 M2.5)
  const tankText = scope.tank ? `Tank ${scope.tank}` : `all ${totalTanks} tanks`;
  const contextSentence = `Showing ${
    scope.day === "last24h"
      ? "the last 24 hours"
      : scope.day
      ? `day ${scope.day}`
      : "custom range"
  } · ${tankText} · ${stamp(asOf, tz)} · snapshot`;

  return (
    <div className={className}>
      <ControlPanel
        actions={
          <Button
            variant="outline"
            size="sm"
            icon={copied ? Check : Share2}
            onClick={handleShare}
            aria-label="Copy shareable link with current time window and tank selection"
          >
            {copied ? "Copied" : "Share"}
          </Button>
        }
      >
        {/* Preset Selector */}
        <ControlGroup label="Preset Range" icon={Clock}>
          <RangePresets value={activePreset} onChange={handlePresetChange} />
        </ControlGroup>

        {/* Calendar Day Selector */}
        <ControlGroup label="Calendar Day" icon={Calendar}>
          <DaySelector
            days={calendarDays}
            selectedKey={scope.day || "last24h"}
            onSelectDay={handleSelectDay}
          />
        </ControlGroup>
      </ControlPanel>

      {/* Field Help */}
      <FieldHelp>
        Switch between rolling hours or pick a specific calendar day in {tz}.
        Dragging on the 7-day trend chart synchronizes here automatically.
      </FieldHelp>

      {/* Context Status Bar */}
      <ContextBar
        text={contextSentence}
        status={{ state: "snapshot", text: "Anchored Demo" }}
      />
    </div>
  );
}

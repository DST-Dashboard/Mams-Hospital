"use client";

import { RotateCcw } from "lucide-react";
import React from "react";
import { useUrlTimeState } from "@/lib/url-state";
import { stamp } from "@/lib/format";
import { useUi } from "@/lib/store";

export interface BrushSyncProps {
  onReset?: () => void;
  className?: string;
}

/**
 * [FE-04] Displays brush-synced time window indicators and provides a one-click reset
 */
export function BrushSync({ onReset, className }: BrushSyncProps) {
  const { from, to, setUrlState } = useUrlTimeState();
  const tz = useUi((s) => s.tz);

  if (!from || !to) return null;

  const handleReset = () => {
    setUrlState({ range: "24h", from: undefined, to: undefined });
    onReset?.();
  };

  return (
    <div
      role="status"
      aria-label="Time window synchronized via chart selection"
      className={`inline-flex items-center gap-2 rounded-lg border hairline bg-raised/50 px-3 py-1.5 text-xs ${className ?? ""}`}
    >
      <span className="text-muted">Zoomed Window:</span>
      <span className="font-mono font-medium text-ink">
        {stamp(from, tz)} → {stamp(to, tz)}
      </span>

      <button
        type="button"
        onClick={handleReset}
        title="Reset zoom to standard range"
        className="ml-1 inline-flex items-center gap-1 rounded bg-raised px-1.5 py-0.5 text-[11px] font-semibold text-tide hover:bg-raised/80 transition-colors"
      >
        <RotateCcw size={11} />
        <span>Reset</span>
      </button>
    </div>
  );
}

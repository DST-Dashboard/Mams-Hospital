"use client";

import { useEffect, useRef } from "react";
import type { Win } from "@/lib/windows";

export interface BrushSyncProps {
  onBrushRange: (range: Win) => void;
  debounceMs?: number;
}

/**
 * BrushSync helper for synchronizing week-chart drag brush events
 * into the Day window as a debounced custom range.
 */
export function useBrushSync(
  onBrushRange: (range: Win) => void,
  debounceMs = 250
) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleBrush = (range: Win) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onBrushRange(range);
    }, debounceMs);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return handleBrush;
}

export function BrushSync(_props: BrushSyncProps) {
  void _props;
  // Headless synchronization coordinator
  return null;
}

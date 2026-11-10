"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useTransition } from "react";
import type { RangeKey } from "./store";

export interface TimeRangeState {
  range?: RangeKey | "custom";
  from?: number;
  to?: number;
  tankId?: number;
}

/**
 * [FE-04] Hook for bookmarkable URL state: ?range=&from=&to=&tank= (U-11).
 * Restores selection on load and supports browser forward/back.
 */
export function useUrlTimeState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const rangeParam = searchParams.get("range") as RangeKey | "custom" | null;
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const tankParam = searchParams.get("tank");

  const from = fromParam ? Number(fromParam) : undefined;
  const to = toParam ? Number(toParam) : undefined;
  const tankId = tankParam ? Number(tankParam) : undefined;
  const range = rangeParam ?? (from && to ? "custom" : "24h");

  const setUrlState = useCallback(
    (newState: Partial<TimeRangeState>, replace = true) => {
      const current = new URLSearchParams(searchParams.toString());

      if (newState.range !== undefined) {
        if (newState.range) current.set("range", newState.range);
        else current.delete("range");
      }

      if (newState.from !== undefined) {
        if (newState.from != null) current.set("from", String(newState.from));
        else current.delete("from");
      }

      if (newState.to !== undefined) {
        if (newState.to != null) current.set("to", String(newState.to));
        else current.delete("to");
      }

      if (newState.tankId !== undefined) {
        if (newState.tankId != null) current.set("tank", String(newState.tankId));
        else current.delete("tank");
      }

      const queryString = current.toString();
      const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;

      startTransition(() => {
        if (replace) {
          router.replace(nextUrl, { scroll: false });
        } else {
          router.push(nextUrl, { scroll: false });
        }
      });
    },
    [router, pathname, searchParams]
  );

  return {
    range,
    from,
    to,
    tankId,
    setUrlState,
    isPending,
  };
}

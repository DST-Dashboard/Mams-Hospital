"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { useEffect, useState } from "react";
import { ApiError, fetcher } from "./api";
import type {
  AlertRow,
  AnalyticsResponse,
  DashboardData,
  MeResponse,
  ReadingsResponse,
  TankRow,
} from "./types";

export interface HookResult<T> {
  data: T | undefined;
  error: ApiError | undefined;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (data?: T | Promise<T>, shouldRevalidate?: boolean) => Promise<T | undefined>;
  isMock: boolean;
}

export function useApi<T>(key: string | null, opts?: SWRConfiguration): HookResult<T> {
  const { data, error, isLoading, isValidating, mutate } = useSWR<T, ApiError>(
    key,
    fetcher,
    opts
  );
  const isMock = Boolean(data && typeof data === "object" && (data as { __mock?: boolean }).__mock);
  return {
    data,
    error: error as ApiError | undefined,
    isLoading,
    isValidating,
    mutate: mutate as HookResult<T>["mutate"],
    isMock,
  };
}

export function useMe(opts?: SWRConfiguration) {
  return useApi<MeResponse>("/api/auth/me", {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
    ...opts,
  });
}

export function useDashboard(opts?: SWRConfiguration) {
  return useApi<DashboardData>("/api/dashboard", {
    refreshInterval: 15_000,
    dedupingInterval: 5_000,
    ...opts,
  });
}

export function useTanks(params: { deleted?: boolean } = {}, opts?: SWRConfiguration) {
  const query = params.deleted ? "?deleted=1" : "";
  return useApi<TankRow[]>(`/api/tanks${query}`, opts);
}

export function useTank(id: number | null | undefined, opts?: SWRConfiguration) {
  return useApi<TankRow>(id ? `/api/tanks/${id}` : null, opts);
}

export interface ReadingsParams {
  tankId: number | null | undefined;
  from: number;
  to: number;
  res?: "auto" | "raw" | "15m" | "1h" | "1d";
  enabled?: boolean;
}

export function useReadings(params: ReadingsParams, opts?: SWRConfiguration) {
  const { tankId, from, to, res = "auto", enabled = true } = params;
  const shouldFetch = enabled && tankId != null && from > 0 && to > from;
  const key = shouldFetch
    ? `/api/readings?tankId=${tankId}&from=${from}&to=${to}&res=${res}`
    : null;
  return useApi<ReadingsResponse>(key, opts);
}

export function useAnalytics(
  tankId: number | null | undefined,
  from: number,
  to: number,
  opts?: SWRConfiguration
) {
  const shouldFetch = tankId != null && from > 0 && to > from;
  const key = shouldFetch ? `/api/tanks/${tankId}/analytics?from=${from}&to=${to}` : null;
  return useApi<AnalyticsResponse>(key, opts);
}

export function useAlerts(params: { state?: "open" | "all" } = {}, opts?: SWRConfiguration) {
  const query = params.state === "open" ? "?state=open" : "";
  return useApi<AlertRow[]>(`/api/alerts${query}`, {
    refreshInterval: 15_000,
    dedupingInterval: 5_000,
    ...opts,
  });
}

export function useAlert(id: number | null | undefined, opts?: SWRConfiguration) {
  return useApi<AlertRow>(id ? `/api/alerts/${id}` : null, opts);
}

export function useOnline(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator !== "undefined" && typeof navigator.onLine === "boolean"
      ? navigator.onLine
      : true
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return online;
}

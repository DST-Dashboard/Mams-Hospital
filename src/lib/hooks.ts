"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { fetcher, post } from "@/lib/api";
import type { DashboardData, ReadingsResponse, AnalyticsResponse } from "@/lib/types";
import {
  type AlertDTO,
  type AlertDetailDTO,
  AlertListQuery,
  type CompareDTO,
  type HeatmapDTO,
  type NotificationPrefsDTO,
  type SystemStatusDTO,
  type UserDTO,
  type AuditEntryDTO,
} from "@/contracts";
import type { z } from "zod";

export type AlertListQueryParams = z.infer<typeof AlertListQuery>;

export interface TankRecord {
  id: number;
  deviceId: string | null;
  label: string;
  status: "draft" | "active" | "maintenance" | "offline" | "decommissioned";
  shape: "cylinder" | "rectangular";
  heightCm: number;
  radiusCm: number | null;
  widthCm: number | null;
  lengthCm: number | null;
  deadZoneCm: number;
  capacityL: number;
  warnPct: number;
  critPct: number;
  emptyPct: number;
  dimsConfirmed: boolean;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

const DEFAULT_SWR_CONFIG: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  refreshInterval: 30_000, // 30s auto-refresh for live IoT telemetry
  dedupingInterval: 5_000,
  shouldRetryOnError: true,
  errorRetryCount: 3,
};

/**
 * [FE-01] Typed SWR hook for main overview dashboard
 */
export function useDashboard(config?: SWRConfiguration) {
  return useSWR<DashboardData>("/api/dashboard", fetcher, {
    ...DEFAULT_SWR_CONFIG,
    ...config,
  });
}

/**
 * [FE-01] Typed SWR hook for a tank's time-series readings
 */
export function useReadings(
  tankId: number | null | undefined,
  params?: { range?: string; from?: number; to?: number; resolution?: string },
  config?: SWRConfiguration
) {
  const query = new URLSearchParams();
  if (tankId != null) query.set("tankId", String(tankId));
  if (params?.range) query.set("range", params.range);
  if (params?.from != null) query.set("from", String(params.from));
  if (params?.to != null) query.set("to", String(params.to));
  if (params?.resolution) query.set("res", params.resolution);

  const key = tankId != null ? `/api/readings?${query.toString()}` : null;
  return useSWR<ReadingsResponse>(key, fetcher, {
    ...DEFAULT_SWR_CONFIG,
    ...config,
  });
}

/**
 * [FE-01] Typed SWR hook for a tank's derived analytics & fill/drain events
 */
export function useTankAnalytics(
  tankId: number | null | undefined,
  params?: { from?: number; to?: number },
  config?: SWRConfiguration
) {
  const query = new URLSearchParams();
  if (params?.from != null) query.set("from", String(params.from));
  if (params?.to != null) query.set("to", String(params.to));

  const key = tankId != null ? `/api/tanks/${tankId}/analytics?${query.toString()}` : null;
  return useSWR<AnalyticsResponse>(key, fetcher, {
    ...DEFAULT_SWR_CONFIG,
    ...config,
  });
}

/**
 * [FE-01] Typed SWR hook for active or historical alerts
 */
export function useAlerts(params?: Partial<AlertListQueryParams>, config?: SWRConfiguration) {
  const query = new URLSearchParams();
  if (params?.state) query.set("state", params.state);
  if (params?.tankId != null) query.set("tankId", String(params.tankId));
  if (params?.severity) query.set("severity", params.severity);
  if (params?.type) query.set("type", params.type);
  if (params?.from != null) query.set("from", String(params.from));
  if (params?.to != null) query.set("to", String(params.to));

  const qs = query.toString();
  const key = `/api/alerts${qs ? `?${qs}` : ""}`;
  return useSWR<AlertDTO[]>(key, fetcher, {
    ...DEFAULT_SWR_CONFIG,
    refreshInterval: 15_000, // Faster poll for alerts
    ...config,
  });
}

/**
 * [FE-01] Typed SWR hook for forensic alert detail
 */
export function useAlertDetail(alertId: number | null | undefined, config?: SWRConfiguration) {
  const key = alertId != null ? `/api/alerts/${alertId}` : null;
  return useSWR<AlertDetailDTO>(key, fetcher, {
    ...DEFAULT_SWR_CONFIG,
    ...config,
  });
}

/**
 * [FE-01] Typed SWR hook for 7x24 weekly heatmap
 */
export function useHeatmap(
  tankId: number | null | undefined,
  params?: { tz?: "IST" | "UTC"; from?: number; to?: number },
  config?: SWRConfiguration
) {
  const query = new URLSearchParams();
  if (tankId != null) query.set("tankId", String(tankId));
  if (params?.tz) query.set("tz", params.tz);
  if (params?.from != null) query.set("from", String(params.from));
  if (params?.to != null) query.set("to", String(params.to));

  const key = tankId != null ? `/api/analytics/heatmap?${query.toString()}` : null;
  return useSWR<HeatmapDTO>(key, fetcher, {
    ...DEFAULT_SWR_CONFIG,
    refreshInterval: 60_000,
    ...config,
  });
}

/**
 * [FE-01] Typed SWR hook for multi-tank comparative analytics
 */
export function useCompare(
  params?: { from?: number; to?: number; res?: "15m" | "1h" | "1d" },
  config?: SWRConfiguration
) {
  const query = new URLSearchParams();
  if (params?.from != null) query.set("from", String(params.from));
  if (params?.to != null) query.set("to", String(params.to));
  if (params?.res) query.set("res", params.res);

  const qs = query.toString();
  const key = `/api/analytics/compare${qs ? `?${qs}` : ""}`;
  return useSWR<CompareDTO>(key, fetcher, {
    ...DEFAULT_SWR_CONFIG,
    ...config,
  });
}

/**
 * [FE-01] Typed SWR hook for node/tank administration list
 */
export function useTanks(includeDeleted = false, config?: SWRConfiguration) {
  const key = `/api/tanks${includeDeleted ? "?deleted=1" : ""}`;
  return useSWR<TankRecord[]>(key, fetcher, {
    ...DEFAULT_SWR_CONFIG,
    ...config,
  });
}

/**
 * [FE-01] Typed SWR hook for a single tank record
 */
export function useTank(tankId: number | null | undefined, config?: SWRConfiguration) {
  const key = tankId != null ? `/api/tanks/${tankId}` : null;
  return useSWR<TankRecord>(key, fetcher, {
    ...DEFAULT_SWR_CONFIG,
    ...config,
  });
}

/**
 * [FE-01] Typed SWR hook for user notification settings
 */
export function useNotificationPrefs(config?: SWRConfiguration) {
  return useSWR<NotificationPrefsDTO>("/api/settings/notifications", fetcher, {
    ...DEFAULT_SWR_CONFIG,
    ...config,
  });
}

/**
 * [FE-01] Typed SWR hook for admin system status & device health
 */
export function useSystemStatus(config?: SWRConfiguration) {
  return useSWR<SystemStatusDTO>("/api/system/status", fetcher, {
    ...DEFAULT_SWR_CONFIG,
    ...config,
  });
}

/**
 * [FE-01] Typed SWR hook for user management
 */
export function useUsers(config?: SWRConfiguration) {
  return useSWR<UserDTO[]>("/api/users", fetcher, {
    ...DEFAULT_SWR_CONFIG,
    ...config,
  });
}

/**
 * [FE-01] Typed SWR hook for audit log entries
 */
export function useAudit(
  params?: { entity?: string; userId?: number; action?: string; from?: number; to?: number; page?: number; pageSize?: number },
  config?: SWRConfiguration
) {
  const query = new URLSearchParams();
  if (params?.entity) query.set("entity", params.entity);
  if (params?.userId != null) query.set("userId", String(params.userId));
  if (params?.action) query.set("action", params.action);
  if (params?.from != null) query.set("from", String(params.from));
  if (params?.to != null) query.set("to", String(params.to));
  if (params?.page != null) query.set("page", String(params.page));
  if (params?.pageSize != null) query.set("pageSize", String(params.pageSize));

  const qs = query.toString();
  const key = `/api/audit${qs ? `?${qs}` : ""}`;
  return useSWR<{ items: AuditEntryDTO[]; total: number; page: number; pageSize: number } | AuditEntryDTO[]>(key, fetcher, {
    ...DEFAULT_SWR_CONFIG,
    ...config,
  });
}

/**
 * Common mutation helpers
 */
export async function acknowledgeAlert(alertId: number, note?: string) {
  return post(`/api/alerts/${alertId}/ack`, { note });
}

export async function snoozeAlert(alertId: number, minutes: number) {
  return post(`/api/alerts/${alertId}/snooze`, { minutes });
}

export async function resolveAlert(alertId: number, note?: string) {
  return post(`/api/alerts/${alertId}/resolve`, { note });
}

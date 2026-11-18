"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Database, Hourglass } from "lucide-react";
import { useTank, useDashboard, useReadings, useAnalytics } from "@/lib/hooks";
import { useUi } from "@/lib/store";
import { ViewGuide } from "@/components/ui/primitives";
import { Skeleton } from "@/components/ui/primitives";
import { Select } from "@/components/ui/Select";
import { TankHeroCard } from "./TankHeroCard";
import { ReadingCard } from "./ReadingCard";
import { StatusCard } from "./StatusCard";
import { StatsGrid } from "./StatsGrid";
import { EventTimeline } from "./EventTimeline";
import { AlertHistory } from "./AlertHistory";
import { SignalPanel } from "./SignalPanel";
import { RawInspector } from "./RawInspector";
import { TrendChart } from "@/components/charts/TrendChart";
import { TimeNavPanel } from "@/features/time-nav/TimeNavPanel";
import { useBrushSync } from "@/features/time-nav/BrushSync";
import { TANK_DETAIL_GUIDE } from "./copy";
import {
  calendarDays,
  dayWindow,
  weekWindow,
  windowForCalendarDay,
  type Scope,
  type Win,
} from "@/lib/windows";
import { readScope, writeScope } from "@/lib/url-state";
import { buildSeries, inferPump } from "@/lib/series";
import { stamp } from "@/lib/format";
import "@/styles/views-monitoring.css";

export interface TankDetailViewProps {
  id: number;
}

export function TankDetailView({ id }: TankDetailViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tz = useUi((s) => s.tz);
  const setLastTankId = useUi((s) => s.setLastTankId);

  // Update last visited tank ID in store
  useEffect(() => {
    if (id > 0) {
      setLastTankId(id);
    }
  }, [id, setLastTankId]);

  const { data: tank, error: tankError, isLoading: tankLoading, mutate: refreshTank } = useTank(id);
  const { data: dashboard, mutate: refreshDashboard } = useDashboard();

  const asOf = dashboard?.asOf ?? 1793339580000;
  const cardData = dashboard?.tanks.find((t) => t.id === id);

  // Scope state
  const scope = useMemo(() => readScope(searchParams), [searchParams]);

  const handleScopeChange = (nextScope: Scope) => {
    const qs = writeScope({ ...nextScope, tank: id });
    router.push(`${pathname}${qs}`, { scroll: false });
  };

  // Time boundaries
  const datasetStart = Date.UTC(2026, 9, 23, 5, 46);
  const datasetEnd = asOf;
  const days = useMemo(
    () => calendarDays(datasetStart, datasetEnd, tz),
    [datasetStart, datasetEnd, tz]
  );

  // Day window (24h or custom)
  const dayWin: Win = useMemo(() => {
    if (scope.from && scope.to) {
      return { from: scope.from, to: scope.to };
    }
    if (scope.day && scope.day !== "last24h" && /^\d{4}-\d{2}-\d{2}$/.test(scope.day)) {
      return windowForCalendarDay(scope.day, tz);
    }
    return dayWindow(asOf);
  }, [scope, asOf, tz]);

  // Week window (7 days)
  const weekWin: Win = useMemo(() => weekWindow(asOf), [asOf]);

  // Fetch Day Raw Readings
  const dayReadings = useReadings({
    tankId: id,
    from: dayWin.from,
    to: dayWin.to,
    res: "raw",
  });

  // Fetch Week Hourly Readings
  const weekReadings = useReadings({
    tankId: id,
    from: weekWin.from,
    to: weekWin.to,
    res: "1h",
  });

  // Analytics for Day and Week
  const dayAnalytics = useAnalytics(id, dayWin.from, dayWin.to);
  const weekAnalytics = useAnalytics(id, weekWin.from, weekWin.to);

  // Inferred pump state
  const pump = useMemo(
    () => inferPump(dayAnalytics.data?.events || weekAnalytics.data?.events, asOf),
    [dayAnalytics.data?.events, weekAnalytics.data?.events, asOf]
  );

  // Chart series preparation
  const daySeries = useMemo(() => {
    if (!tank) return [];
    return [
      {
        tankId: tank.id,
        label: tank.label,
        simulated: tank.simulated,
        points: buildSeries(dayReadings.data?.points || [], dayWin, 300_000),
      },
    ];
  }, [tank, dayReadings.data, dayWin]);

  const weekSeries = useMemo(() => {
    if (!tank) return [];
    return [
      {
        tankId: tank.id,
        label: tank.label,
        simulated: tank.simulated,
        points: buildSeries(weekReadings.data?.points || [], weekWin, 3600_000),
      },
    ];
  }, [tank, weekReadings.data, weekWin]);

  // Raw readings for inspector
  const rawInspectorPoints = useMemo(() => {
    return (dayReadings.data?.points || []).map((p) => ({
      t: p.t,
      distanceCm: p.distanceCm,
      levelCm: p.levelCm,
      levelPct: p.levelPct,
      volumeL: p.volumeL,
      quality: p.quality || "good",
    }));
  }, [dayReadings.data]);

  // Brush handler for week chart
  const handleBrushRange = useBrushSync((range: Win) => {
    handleScopeChange({
      ...scope,
      day: "custom",
      from: range.from,
      to: range.to,
    });
  });

  // Tank switcher options
  const tankSwitcherOptions = useMemo(() => {
    const list = dashboard?.tanks || [];
    return list.map((t) => ({
      value: String(t.id),
      label: `${t.label}${t.simulated ? " (SIM)" : ""}`,
    }));
  }, [dashboard?.tanks]);

  const handleSwitchTank = (newIdStr: string) => {
    const newId = Number(newIdStr);
    if (newId && newId !== id) {
      router.push(`/tanks/${newId}${writeScope(scope)}`);
    }
  };

  if (tankLoading) {
    return (
      <div className="flex flex-col gap-8 pb-12">
        <Skeleton className="w-64 h-10" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-[360px] rounded-xl" />
          <Skeleton className="h-[360px] rounded-xl" />
          <Skeleton className="h-[360px] rounded-xl" />
        </div>
        <Skeleton className="h-[480px] rounded-xl" />
      </div>
    );
  }

  // 404 state if tank not found
  if (tankError || !tank) {
    return (
      <div className="py-12 flex justify-center">
        <div className="card p-10 max-w-lg text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[var(--warn-bg)] text-[var(--warn-tx)] flex items-center justify-center">
            <Database size={28} />
          </div>
          <h2 className="text-[22px] font-bold text-[var(--tx-head)]">Tank not found</h2>
          <p className="text-[14px] text-[var(--tx-body)]">
            Tank #{id} does not exist or has been removed from the hospital water system.
          </p>
          <Link href="/dashboard" className="btn btn-primary mt-2 inline-flex items-center gap-2">
            <ArrowLeft size={16} />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  // Draft state (awaiting first reading)
  if (tank.status === "draft") {
    return (
      <div className="py-12 flex justify-center">
        <div className="card p-10 max-w-lg text-center flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[var(--neutral-bg)] text-[var(--tx-quiet)] flex items-center justify-center">
            <Hourglass size={28} />
          </div>
          <h2 className="text-[22px] font-bold text-[var(--tx-head)]">{tank.label} (Draft)</h2>
          <p className="text-[14px] text-[var(--tx-body)]">
            This tank is in Draft state awaiting its first telemetry uplink from sensor transmitter.
          </p>
          <span className="chip chip--neutral font-mono text-[12px]">Countdown: 04:59</span>
          <Link href="/dashboard" className="btn btn-outline mt-2">
            Back to Overview
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* Page Header with Tank Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-semibold text-[var(--tx-quiet)] mb-1">
            <Link href="/dashboard" className="hover:text-[var(--brand-800)] flex items-center gap-1">
              <ArrowLeft size={13} />
              <span>Overview</span>
            </Link>
            <span>/</span>
            <span>Tank Detail</span>
          </div>

          <h1 className="text-[26px] font-bold text-[var(--tx-head)] font-['Merriweather',serif]">
            {tank.label}
          </h1>
          <p className="text-[13px] text-[var(--tx-body)] mt-0.5">
            {tank.location || "Rooftop storage vessel"} · Last reading {stamp(asOf, tz)} ({tz})
          </p>
        </div>

        {/* Tank Switcher Dropdown */}
        {tankSwitcherOptions.length > 0 && (
          <div className="w-60">
            <Select
              value={String(id)}
              onChange={(e) => handleSwitchTank(e.target.value)}
              options={tankSwitcherOptions}
              aria-label="Switch selected water tank"
            />
          </div>
        )}
      </div>

      {/* Top 3-Up Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TankHeroCard tank={tank} cardData={cardData} />
        <ReadingCard tank={tank} cardData={cardData} />
        <StatusCard
          tank={tank}
          cardData={cardData}
          pump={pump}
          onRefresh={() => {
            refreshTank();
            refreshDashboard();
          }}
        />
      </div>

      {/* View Guide */}
      <ViewGuide
        question={TANK_DETAIL_GUIDE.question}
        description={TANK_DETAIL_GUIDE.description}
        steps={TANK_DETAIL_GUIDE.steps}
        howToRead={TANK_DETAIL_GUIDE.howToRead}
        collapsedByDefault={true}
        storageKey="ohtms_tank_detail_guide_collapsed"
      />

      {/* Time Navigation Panel */}
      <section aria-label="Tank detail time navigation">
        <TimeNavPanel
          scope={scope}
          onScopeChange={handleScopeChange}
          calendarDays={days}
          asOf={asOf}
          totalTanks={5}
        />
      </section>

      {/* Stats Grid comparing Day | Week */}
      <section aria-label="Tank hydraulic statistics comparison">
        <StatsGrid
          dayAnalytics={dayAnalytics.data}
          weekAnalytics={weekAnalytics.data}
        />
      </section>

      {/* Stacked Day Chart (440px) */}
      <section aria-labelledby="day-chart-heading">
        <TrendChart
          title={`Day trend · ${tank.label} (24 hours)`}
          eyebrow="HIGH-CADENCE 24-HOUR TELEMETRY"
          explainer="High-resolution 5-minute telemetry points for the selected 24-hour cycle. Dotted horizontal lines represent Warning (40%), Critical (20%), and Emergency (5%) levels."
          footnote={`Physical threshold boundaries configured for ${tank.label}. Missing data periods are rendered with gaps.`}
          series={daySeries}
          win={dayWin}
          thresholds={tank.thresholds}
          events={dayAnalytics.data?.events}
          height={440}
          isLoading={dayReadings.isLoading}
          error={dayReadings.error}
          onRetry={() => dayReadings.mutate()}
        />
      </section>

      {/* Stacked Week Chart (440px) with Brush */}
      <section id="week-chart-section" aria-labelledby="week-chart-heading">
        <TrendChart
          title={`Week trend · ${tank.label} (7 days)`}
          eyebrow="HOURLY 7-DAY SYNOPTIC OVERVIEW"
          explainer="Aggregated 1-hour average water level. Drag across any period to zoom the 24-hour day chart above."
          footnote="Full 7-day cyclical perspective. Weekly morning and evening peak drawdowns visible."
          series={weekSeries}
          win={weekWin}
          thresholds={tank.thresholds}
          events={weekAnalytics.data?.events}
          height={440}
          enableBrush={true}
          onBrushEnd={handleBrushRange}
          isLoading={weekReadings.isLoading}
          error={weekReadings.error}
          onRetry={() => weekReadings.mutate()}
        />
      </section>

      {/* Hydraulic Activity Events Timeline */}
      <section aria-label="Hydraulic pump fill and drain event history">
        <EventTimeline
          events={dayAnalytics.data?.events || weekAnalytics.data?.events || []}
          tankHeightCm={tank.geometry.heightCm}
          tankCapacityL={cardData?.capacityL ?? 8639}
        />
      </section>

      {/* Two-Up: Alert History & Signal Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AlertHistory tankId={tank.id} tankLabel={tank.label} />
        <SignalPanel
          cardData={cardData}
          completenessPct={dayAnalytics.data?.completenessPct ?? weekAnalytics.data?.completenessPct}
        />
      </div>

      {/* Collapsible Raw Readings Inspector (Inverted Distance Chart + Paged Table) */}
      <section aria-label="Raw sensor readings inspector">
        <RawInspector
          points={rawInspectorPoints}
          win={dayWin}
        />
      </section>
    </div>
  );
}

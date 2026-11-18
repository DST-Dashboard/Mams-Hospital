"use client";

import React, { useMemo, useRef } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { AlertCircle, AlertTriangle, Layers } from "lucide-react";
import { useDashboard, useReadings, useAnalytics } from "@/lib/hooks";
import { useUi } from "@/lib/store";
import { PageHeader, ViewGuide, Glossary } from "@/components/ui/primitives";
import { ModeBadge } from "@/components/status/badges";
import { TankGrid } from "./TankGrid";
import { FleetHealth } from "./FleetHealth";
import { WeekHeatmap } from "./WeekHeatmap";
import { AllTanksTrend } from "./AllTanksTrend";
import { NodeHealthGrid } from "./NodeHealthGrid";
import { SignalQualityCard } from "./SignalQualityCard";
import { TimeNavPanel } from "@/features/time-nav/TimeNavPanel";
import { useBrushSync } from "@/features/time-nav/BrushSync";
import { DASHBOARD_GUIDE, DASHBOARD_GLOSSARY } from "./copy";
import {
  calendarDays,
  dayWindow,
  weekWindow,
  windowForCalendarDay,
  type Scope,
  type Win,
} from "@/lib/windows";
import { readScope, writeScope } from "@/lib/url-state";
import { buildSeries, isUnstable } from "@/lib/series";
import { stamp } from "@/lib/format";
import "@/styles/views-monitoring.css";

export function DashboardView() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tz = useUi((s) => s.tz);

  // Kiosk redirect check (§20)
  if (searchParams.get("kiosk") === "1") {
    router.replace("/kiosk");
  }

  const { data: dashboard, isLoading } = useDashboard();
  const weekSectionRef = useRef<HTMLDivElement>(null);

  // Reference timestamp: anchored server clock or now
  const asOf = dashboard?.asOf ?? 1793339580000; // default 30 Oct 11:13 IST in ms
  const tanks = dashboard?.tanks ?? [];

  // Parse time scope from URL
  const scope = useMemo(() => readScope(searchParams), [searchParams]);

  const handleScopeChange = (nextScope: Scope) => {
    const qs = writeScope(nextScope);
    router.push(`${pathname}${qs}`, { scroll: false });
  };

  // Time boundaries
  const datasetStart = Date.UTC(2026, 9, 23, 5, 46); // 23 Oct 11:16 IST
  const datasetEnd = asOf;
  const days = useMemo(
    () => calendarDays(datasetStart, datasetEnd, tz),
    [datasetStart, datasetEnd, tz]
  );

  // Active Day Window [from, to]
  const activeDayWin: Win = useMemo(() => {
    if (scope.from && scope.to) {
      return { from: scope.from, to: scope.to };
    }
    if (scope.day && scope.day !== "last24h" && /^\d{4}-\d{2}-\d{2}$/.test(scope.day)) {
      return windowForCalendarDay(scope.day, tz);
    }
    return dayWindow(asOf);
  }, [scope, asOf, tz]);

  // Always-visible 7-Day Window
  const weekWin: Win = useMemo(() => weekWindow(asOf), [asOf]);

  // Fetch Day Raw Readings for all 5 tanks
  const d1 = useReadings({ tankId: 1, from: activeDayWin.from, to: activeDayWin.to, res: "raw" });
  const d2 = useReadings({ tankId: 2, from: activeDayWin.from, to: activeDayWin.to, res: "raw" });
  const d3 = useReadings({ tankId: 3, from: activeDayWin.from, to: activeDayWin.to, res: "raw" });
  const d4 = useReadings({ tankId: 4, from: activeDayWin.from, to: activeDayWin.to, res: "raw" });
  const d5 = useReadings({ tankId: 5, from: activeDayWin.from, to: activeDayWin.to, res: "raw" });

  // Fetch Week Hourly Readings for all 5 tanks
  const w1 = useReadings({ tankId: 1, from: weekWin.from, to: weekWin.to, res: "1h" });
  const w2 = useReadings({ tankId: 2, from: weekWin.from, to: weekWin.to, res: "1h" });
  const w3 = useReadings({ tankId: 3, from: weekWin.from, to: weekWin.to, res: "1h" });
  const w4 = useReadings({ tankId: 4, from: weekWin.from, to: weekWin.to, res: "1h" });
  const w5 = useReadings({ tankId: 5, from: weekWin.from, to: weekWin.to, res: "1h" });

  // Analytics for Fleet Completeness and Unstable check
  const a1 = useAnalytics(1, weekWin.from, weekWin.to);
  const a2 = useAnalytics(2, weekWin.from, weekWin.to);
  const a3 = useAnalytics(3, weekWin.from, weekWin.to);
  const a4 = useAnalytics(4, weekWin.from, weekWin.to);
  const a5 = useAnalytics(5, weekWin.from, weekWin.to);

  // Check for flapping / unstable signal on Tank 3 (or any tank)
  const hasFlappingTank =
    isUnstable(a3.data?.events) ||
    isUnstable(a1.data?.events) ||
    isUnstable(a2.data?.events) ||
    isUnstable(a4.data?.events) ||
    isUnstable(a5.data?.events);

  // Fleet completeness calculation
  const allCompleteness = [
    a1.data?.completenessPct,
    a2.data?.completenessPct,
    a3.data?.completenessPct,
    a4.data?.completenessPct,
    a5.data?.completenessPct,
  ].filter((v): v is number => v !== undefined && v !== null);

  const avgWeekCompleteness =
    allCompleteness.length > 0
      ? allCompleteness.reduce((acc, c) => acc + c, 0) / allCompleteness.length
      : null;

  // Day series for MultiTankChart
  const daySeries = useMemo(() => {
    const rawList = [
      { id: 1, label: "Tank 1", data: d1.data },
      { id: 2, label: "Tank 2", data: d2.data },
      { id: 3, label: "Tank 3", data: d3.data },
      { id: 4, label: "Tank 4", data: d4.data },
      { id: 5, label: "Tank 5", data: d5.data },
    ];
    return rawList.map((item) => ({
      tankId: item.id,
      label: item.label,
      simulated: item.id > 1,
      points: buildSeries(item.data?.points || [], activeDayWin, 300_000),
    }));
  }, [d1.data, d2.data, d3.data, d4.data, d5.data, activeDayWin]);

  // Week series for MultiTankChart
  const weekSeries = useMemo(() => {
    const rawList = [
      { id: 1, label: "Tank 1", data: w1.data },
      { id: 2, label: "Tank 2", data: w2.data },
      { id: 3, label: "Tank 3", data: w3.data },
      { id: 4, label: "Tank 4", data: w4.data },
      { id: 5, label: "Tank 5", data: w5.data },
    ];
    return rawList.map((item) => ({
      tankId: item.id,
      label: item.label,
      simulated: item.id > 1,
      points: buildSeries(item.data?.points || [], weekWin, 3600_000),
    }));
  }, [w1.data, w2.data, w3.data, w4.data, w5.data, weekWin]);

  // Readings map for Heatmap
  const heatmapReadingsMap = useMemo(() => {
    const map = new Map<number, { t: number; levelPct?: number | null; pct?: number | null }[]>();
    map.set(1, w1.data?.points || []);
    map.set(2, w2.data?.points || []);
    map.set(3, w3.data?.points || []);
    map.set(4, w4.data?.points || []);
    map.set(5, w5.data?.points || []);
    return map;
  }, [w1.data, w2.data, w3.data, w4.data, w5.data]);

  // Brush synchronization from Week chart -> sets Custom Day window
  const handleBrushRange = useBrushSync((range: Win) => {
    handleScopeChange({
      ...scope,
      day: "custom",
      from: range.from,
      to: range.to,
    });
  });

  // Clicking a heatmap cell zooms the Day window to that hour
  const handleSelectHeatmapCell = (dayKey: string, hour: number) => {
    const dayBounds = windowForCalendarDay(dayKey, tz);
    const hourStart = dayBounds.from + hour * 3600_000;
    const hourEnd = hourStart + 3600_000;
    handleScopeChange({
      ...scope,
      day: "custom",
      from: hourStart,
      to: hourEnd,
    });
  };

  const scrollToWeek = () => {
    weekSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const modeLineText =
    dashboard?.clockMode === "anchored"
      ? `Snapshot · last reading ${stamp(asOf, tz)}. Displaying recorded demonstration dataset.`
      : `Live telemetry. Last uplink received at ${stamp(asOf, tz)}.`;

  return (
    <div className="flex flex-col gap-8 pb-12">
      {/* 1. Page Header (H2; Hero carries H1 per spec §7.5) */}
      <PageHeader
        eyebrow={{ icon: Layers, text: "HOSPITAL OVERVIEW" }}
        title="Rooftop overhead water tanks"
        intro="Continuous level, volume and consumption monitoring across 5 hospital rooftop tanks."
        as="h2"
        modeBadge={<ModeBadge tanks={tanks} />}
        modeLine={modeLineText}
      />

      {/* 2. System & Telemetry Banners */}
      <div className="flex flex-col gap-3">
        {/* Unstable / Flapping Signal Warning (Tank 3) */}
        {hasFlappingTank && (
          <aside
            role="alert"
            className="banner banner--warning text-[13px] flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} aria-hidden />
              <span>
                <strong>Unstable signal detected on Tank 3:</strong> Surface turbulence or sensor
                bouncing is generating frequent rapid events (&gt;40 events). Consumption volume
                calculations are unreliable and suppressed.
              </span>
            </div>
            <Link
              href="/tanks/3"
              className="text-[12px] font-bold underline underline-offset-4 ml-4 flex-shrink-0"
            >
              Inspect Tank 3 →
            </Link>
          </aside>
        )}

        {/* Provisional Dimensions Banner */}
        {dashboard?.summary?.unconfirmed ? (
          <div className="banner banner--info text-[13px] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} aria-hidden />
              <span>
                <strong>Provisional setup:</strong> Tank dimensions have not been confirmed by an
                administrator. Derived percentages and volumes are provisional, and level alarms are
                paused.
              </span>
            </div>
            <Link
              href="/admin/nodes"
              className="text-[12px] font-bold underline underline-offset-4 ml-4 flex-shrink-0"
            >
              Confirm dimensions →
            </Link>
          </div>
        ) : null}
      </div>

      {/* 3. Collapsed View Guide (Remembers preference) */}
      <ViewGuide
        question={DASHBOARD_GUIDE.question}
        description={DASHBOARD_GUIDE.description}
        steps={DASHBOARD_GUIDE.steps}
        howToRead={DASHBOARD_GUIDE.howToRead}
        collapsedByDefault={true}
        storageKey="ohtms_overview_guide_collapsed"
      />

      {/* 4. Tank Status Grid (5 tiles, 180px TankSvg, 32px font, sparklines) */}
      <section aria-labelledby="tank-status-heading">
        <div className="flex items-center justify-between mb-4">
          <h2 id="tank-status-heading" className="text-[18px] font-bold text-[var(--tx-head)]">
            Tank status
          </h2>
          <span className="text-[12px] text-[var(--tx-quiet)] font-medium">
            5 rooftop vessels · click any tile for deep dive
          </span>
        </div>

        <TankGrid tanks={tanks} asOf={asOf} loading={isLoading} />
      </section>

      {/* 5. Control Panel & Time Navigation */}
      <section aria-label="Time-range navigation and controls">
        <TimeNavPanel
          scope={scope}
          onScopeChange={handleScopeChange}
          calendarDays={days}
          asOf={asOf}
          totalTanks={tanks.length}
          onScrollToWeek={scrollToWeek}
        />
      </section>

      {/* 6. Fleet Health (3 KPI Boxes: Alerts · Reporting Nodes · Completeness Day|Week) */}
      <section aria-labelledby="fleet-health-heading">
        <h2 id="fleet-health-heading" className="sr-only">
          Fleet Health Metrics
        </h2>
        <FleetHealth
          tanks={tanks}
          openAlertsCount={dashboard?.alerts?.length ?? 0}
          dayCompleteness={avgWeekCompleteness}
          weekCompleteness={avgWeekCompleteness}
        />
      </section>

      {/* 7. Day Panel "LAST 24 HOURS" (5 tanks overlaid, full 24h axis, 5-min cadence) */}
      <section aria-labelledby="day-trend-heading">
        <AllTanksTrend
          mode="day"
          series={daySeries}
          win={activeDayWin}
          isLoading={d1.isLoading || d2.isLoading}
          error={d1.error || d2.error}
          onRetry={() => {
            d1.mutate();
            d2.mutate();
            d3.mutate();
            d4.mutate();
            d5.mutate();
          }}
        />
      </section>

      {/* 8. Week Panel "LAST 7 DAYS" (Hourly, selected-day band, brush drag) */}
      <section ref={weekSectionRef} id="week-trend-section" aria-labelledby="week-trend-heading">
        <AllTanksTrend
          mode="week"
          series={weekSeries}
          win={weekWin}
          enableBrush={true}
          onBrushEnd={handleBrushRange}
          isLoading={w1.isLoading || w2.isLoading}
          error={w1.error || w2.error}
          onRetry={() => {
            w1.mutate();
            w2.mutate();
            w3.mutate();
            w4.mutate();
            w5.mutate();
          }}
        />
      </section>

      {/* 9. Week Heatmap (7x24 grid, thermal scale, hour click zoom) */}
      <section aria-labelledby="week-heatmap-heading">
        <WeekHeatmap
          tanks={tanks}
          readingsMap={heatmapReadingsMap}
          calendarDays={days}
          activeDayKey={scope.day}
          onSelectCell={handleSelectHeatmapCell}
          isLoading={w1.isLoading}
        />
      </section>

      {/* 10. Two-Up: Node Health & Signal Quality */}
      <section className="mon-twoup-grid" aria-label="Hardware telemetry and radio link quality">
        <NodeHealthGrid tanks={tanks} />
        <SignalQualityCard tanks={tanks} completenessPct={avgWeekCompleteness} />
      </section>

      {/* 11. Glossary (8 Terms) */}
      <section aria-label="Overhead tank terminology glossary">
        <Glossary terms={DASHBOARD_GLOSSARY} />
      </section>
    </div>
  );
}

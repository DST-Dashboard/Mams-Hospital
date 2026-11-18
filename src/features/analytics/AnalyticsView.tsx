"use client";

import { PageHeader, ViewGuide } from "@/components/ui/primitives";
import { CompareView } from "./CompareView";
import { ConsumptionRanking } from "./ConsumptionRanking";
import { ReportsList } from "./ReportsList";
import { Playback } from "./Playback";
import { ICON } from "@/components/ui/icons";

export function AnalyticsView() {
  return (
    <>
      <PageHeader
        eyebrow={{ icon: ICON.analytics, text: "FLEET COMPARISON" }}
        title="Water Consumption & Analytics"
        intro="Comparative metrics across all hospital rooftop tanks for Day (24h) and Week (7d)."
      />

      <ViewGuide
        question="How much water are we using?"
        description="Compare tanks over one window: how much they drained, how much was pumped in, and how steady they were."
        steps={[
          "Pick a window.",
          "Compare rows in the table.",
          "Use the daily bars to spot recurring peaks.",
        ]}
        howToRead="Consumption counts water leaving the tank (level falling). Inflow counts water entering (level rising)."
        storageKey="ohtms_guide_analytics"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-8)" }}>
        <CompareView />
        <ConsumptionRanking />
        <ReportsList />
        <Playback />
      </div>
    </>
  );
}

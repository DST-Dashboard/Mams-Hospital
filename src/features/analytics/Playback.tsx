"use client";

import { Card, EmptyState } from "@/components/ui/primitives";
import { ICON } from "@/components/ui/icons";

export function Playback() {
  return (
    <div id="forecasts" className="ops-grid-2">
      <Card
        id="comparison"
        eyebrow={{ icon: ICON.analytics, text: "ANOMALY DETECTION" }}
        title="Comparison & Anomalies"
      >
        <EmptyState
          icon={ICON.analytics}
          title="Anomaly Detection"
          text="Automated baseline comparison, peak usage hours, and pipe burst alerts arrive in Phase 2/3."
          locked={2}
        />
      </Card>

      <Card
        eyebrow={{ icon: ICON.clock, text: "PREDICTIVE FORECASTS" }}
        title="Time to Empty & Leak Analytics"
      >
        <EmptyState
          icon={ICON.clock}
          title="Predictive Models"
          text="Linear regression run-out estimators and nocturnal leak detection models arrive in Phase 2/3."
          locked={3}
        />
      </Card>
    </div>
  );
}

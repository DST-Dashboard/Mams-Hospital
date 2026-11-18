"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/primitives";
import { ICON } from "@/components/ui/icons";
import { useDashboard, useAnalytics } from "@/lib/hooks";
import { dayWindow } from "@/lib/windows";
import { stamp } from "@/lib/format";

function TankAnomalyRow({
  tank,
  from,
  to,
}: {
  tank: { id: number; label: string };
  from: number;
  to: number;
}) {
  const { data: analytics, isLoading } = useAnalytics(tank.id, from, to);
  const anomalies = analytics?.anomalies ?? [];

  return (
    <div
      style={{
        padding: "var(--sp-3) var(--sp-4)",
        borderRadius: "var(--r-md)",
        border: "1px solid var(--bd)",
        background: "var(--bg-card)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--sp-2)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontWeight: 700, fontSize: "14px", color: "var(--tx-head)" }}>
          {tank.label}
        </span>
        {isLoading ? (
          <span style={{ fontSize: "12px", color: "var(--tx-quiet)" }}>Analyzing...</span>
        ) : anomalies.length === 0 ? (
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "var(--r-full)",
              background: "rgba(34, 197, 94, 0.12)",
              color: "var(--ok-tx)",
              border: "1px solid rgba(34, 197, 94, 0.3)",
            }}
          >
            ✓ Normal (within 3σ)
          </span>
        ) : (
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: "var(--r-full)",
              background: "rgba(239, 68, 68, 0.12)",
              color: "var(--err-tx)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
            }}
          >
            ⚠ {anomalies.length} anomaly {anomalies.length === 1 ? "marker" : "markers"} (&gt; 3σ)
          </span>
        )}
      </div>

      {anomalies.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "4px" }}>
          <div style={{ fontSize: "12px", color: "var(--tx-quiet)" }}>
            Rolling 12-sample baseline excursions (&gt; 3σ):
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {anomalies.slice(0, 5).map((a, i) => (
              <span
                key={i}
                style={{
                  fontSize: "11px",
                  fontFamily: "monospace",
                  background: "var(--bg-subtle)",
                  border: "1px solid var(--bd)",
                  padding: "2px 6px",
                  borderRadius: "var(--r-sm)",
                  color: "var(--tx-body)",
                }}
              >
                {stamp(a.t, "IST", false)}: z={a.zScore.toFixed(1)}σ ({Math.round(a.value)} cm)
              </span>
            ))}
            {anomalies.length > 5 && (
              <span style={{ fontSize: "11px", color: "var(--tx-quiet)", alignSelf: "center" }}>
                +{anomalies.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function Playback() {
  const { data: dashboard } = useDashboard();
  const asOf = dashboard?.asOf ?? Date.now();
  const win = useMemo(() => dayWindow(asOf), [asOf]);
  const tanks = dashboard?.tanks ?? [];

  return (
    <Card
      id="comparison"
      eyebrow={{ icon: ICON.analytics, text: "ANOMALY DETECTION" }}
      title="Comparison & Statistical Anomalies (24h Window)"
      footnote="Rolling mean and standard deviation (σ) computed over a 12-sample (1-hour) window. Readings deviating by > 3σ from baseline are flagged as anomalies."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
        {tanks.length === 0 ? (
          <div style={{ padding: "var(--sp-4)", textAlign: "center", color: "var(--tx-quiet)", fontSize: "13px" }}>
            Awaiting tank telemetry...
          </div>
        ) : (
          tanks.map((t) => (
            <TankAnomalyRow key={t.id} tank={t} from={win.from} to={win.to} />
          ))
        )}
      </div>
    </Card>
  );
}

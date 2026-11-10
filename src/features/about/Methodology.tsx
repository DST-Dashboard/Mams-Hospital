"use client";

import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { ICON } from "@/components/ui/icons";
import { PhaseChip, SourceChip } from "@/components/status/badges";

export function Methodology() {
  return (
    <div id="methodology" style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
      <Card
        eyebrow={{ icon: ICON.methodology, text: "SCIENTIFIC RIGOR" }}
        title="Telemetry Methodology & Data Truth"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", fontSize: "14px", lineHeight: 1.7, color: "var(--tx-body)" }}>
          <p style={{ margin: 0 }}>
            OHTMS operates on strict data honesty principles. Hospital water infrastructure is critical: false certainty can cause water stockouts during surgical procedures, while false alarms create alert fatigue.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-6)", marginTop: "var(--sp-2)" }}>
            <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--bd-soft)", padding: "var(--sp-5)", borderRadius: "var(--r-xl)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
                <SourceChip simulated={false} />
                <strong style={{ color: "var(--tx-head)" }}>Hardware Live Node (Tank 1)</strong>
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--tx-body)" }}>
                Tank 1 reflects genuine physical telemetry from a Seeed Studio Wio-E5 LoRaWAN ultrasonic transceiver mounted on a rooftop water tank. It exhibits real atmospheric noise, surface ripple fluctuations, and a real hardware transmission interval of ~293 seconds.
              </p>
            </div>

            <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--bd-soft)", padding: "var(--sp-5)", borderRadius: "var(--r-xl)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
                <SourceChip simulated={true} />
                <strong style={{ color: "var(--tx-head)" }}>Simulated Nodes (Tanks 2–5)</strong>
              </div>
              <p style={{ margin: 0, fontSize: "13px", color: "var(--tx-body)" }}>
                Tanks 2 through 5 are generated via a high-fidelity physics simulator modeling realistic hospital consumption cycles, diurnal patient load profiles, and automated borehole pump recharge cycles. Every synthetic value is transparently marked with the <strong>SIM</strong> badge.
              </p>
            </div>
          </div>

          <div style={{ background: "var(--bg-card)", border: "1px solid var(--bd)", borderRadius: "var(--r-lg)", padding: "var(--sp-4)", marginTop: "var(--sp-2)" }}>
            <div style={{ fontWeight: 700, color: "var(--tx-head)", marginBottom: "var(--sp-2)" }}>
              Anchored Clock & Demonstration Mode
            </div>
            <p style={{ margin: 0, fontSize: "13px" }}>
              In demonstration mode (<code>clockMode === &apos;anchored&apos;</code>), the system anchors the current moment to the newest recorded reading (30 Oct 11:13 IST). All relative timestamps (&apos;2 min ago&apos;, &apos;yesterday&apos;) calculate relative to this snapshot anchor, guaranteeing a rich, populated hospital dataset for evaluation without synthetic time-drift artifacts.
            </p>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "var(--sp-2)" }}>
            <Button variant="outline" lock={2} title="Available in Full Deployment">
              Regenerate week with new seed <PhaseChip phase={2} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Data Retention Table */}
      <Card
        eyebrow={{ icon: ICON.table, text: "DATA GOVERNANCE" }}
        title="Telemetry & Audit Retention Policy"
        footnote="NABH and clinical safety standards require a 7-year audit trail for operational decisions and threshold alarms."
      >
        <table className="table" style={{ width: "100%", fontSize: "13px" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>Data Category</th>
              <th style={{ textAlign: "left" }}>Sampling Cadence</th>
              <th style={{ textAlign: "left" }}>Retention Horizon</th>
              <th style={{ textAlign: "left" }}>Storage Tier</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Raw Readings</strong></td>
              <td>~5 min per node</td>
              <td>90 days</td>
              <td>Hot SQLite Telemetry Table</td>
            </tr>
            <tr>
              <td><strong>Hourly Averages (1h)</strong></td>
              <td>60 min rollups</td>
              <td>1 year</td>
              <td>Aggregated Rollup Store</td>
            </tr>
            <tr>
              <td><strong>Daily Summaries (1d)</strong></td>
              <td>24 h rollups</td>
              <td>5 years</td>
              <td>Long-Term Analytics DB</td>
            </tr>
            <tr>
              <td><strong>Pump & Drain Events</strong></td>
              <td>Discrete state transitions</td>
              <td>5 years</td>
              <td>Incident Event Log</td>
            </tr>
            <tr>
              <td><strong>Threshold Alerts</strong></td>
              <td>Fired, ack & resolved events</td>
              <td>5 years</td>
              <td>Alert Safety Archive</td>
            </tr>
            <tr>
              <td><strong>Regulatory Audit Log</strong></td>
              <td>Every user action & config edit</td>
              <td><strong>7 years</strong></td>
              <td>Tamper-Evident Compliance Log</td>
            </tr>
            <tr>
              <td><strong>Deleted Nodes</strong></td>
              <td>Soft-deleted records</td>
              <td>90 days</td>
              <td>Restorable Trash Bin</td>
            </tr>
          </tbody>
        </table>
      </Card>
    </div>
  );
}

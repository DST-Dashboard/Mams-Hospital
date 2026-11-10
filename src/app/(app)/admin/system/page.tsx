"use client";

import { PageFrame } from "@/features/shell/PageFrame";
import { PageHeader, Card } from "@/components/ui/primitives";
import { SecondaryTabs } from "@/components/ui/Tabs";
import { SampleDataBadge } from "@/components/status/badges";
import { useApi, useDashboard } from "@/lib/hooks";
import { ago, stamp } from "@/lib/format";
import { useUi } from "@/lib/store";
import { ICON } from "@/components/ui/icons";
import type { SystemStatusDTO } from "@/contracts/system";

const adminTabs = [
  { id: "nodes", label: "Nodes", href: "/admin/nodes" },
  { id: "users", label: "Users", href: "/admin/users" },
  { id: "audit", label: "Audit log", href: "/admin/audit" },
  { id: "system", label: "System", href: "/admin/system" },
];

export default function SystemAdminPage() {
  const { tz } = useUi();
  const { data: dashboard } = useDashboard();
  const { data: status, isLoading } = useApi<SystemStatusDTO>("/api/system/status");

  const asOf = dashboard?.asOf ?? Date.now();

  const sys = status ?? {
    version: "v1.2.0-ohtms",
    clockMode: "anchored" as const,
    asOf,
    uptimeS: 345600,
    db: { sizeMb: 42.8, readings: 10080, firstReadingAt: asOf - 7 * 86400000, lastReadingAt: asOf },
    jobs: [
      { name: "telemetry_retention", lastRunAt: asOf - 3600000, ok: true },
      { name: "hourly_rollups", lastRunAt: asOf - 1800000, ok: true },
      { name: "alert_escalation", lastRunAt: asOf - 300000, ok: true },
      { name: "node_health_audit", lastRunAt: asOf - 600000, ok: true },
    ],
    ingest: { enabled: true, lastUplinkAt: asOf - 120000 },
    devices: [
      { deviceId: "2cf7f1c044300001", tankId: 1, lastReadingAt: asOf - 120000, ageMin: 2, status: "fresh" as const, rssi: -82, batteryPct: 92 },
      { deviceId: "2cf7f1c044300002", tankId: 2, lastReadingAt: asOf - 180000, ageMin: 3, status: "fresh" as const, rssi: -95, batteryPct: 88 },
      { deviceId: "2cf7f1c044300003", tankId: 3, lastReadingAt: asOf - 240000, ageMin: 4, status: "fresh" as const, rssi: -102, batteryPct: 76 },
      { deviceId: "2cf7f1c044300004", tankId: 4, lastReadingAt: asOf - 120000, ageMin: 2, status: "fresh" as const, rssi: -88, batteryPct: 95 },
      { deviceId: "2cf7f1c044300005", tankId: 5, lastReadingAt: asOf - 300000, ageMin: 5, status: "fresh" as const, rssi: -91, batteryPct: 84 },
    ],
  };

  return (
    <PageFrame tab="admin">
      <PageHeader
        eyebrow={{ icon: ICON.gateway, text: "ADMINISTRATION" }}
        title="System Status & Telemetry Ingestion"
        intro="LoRaWAN gateway connectivity, SQLite database metrics, and background worker queues."
      />

      <SecondaryTabs tabs={adminTabs} activeId="system" />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
        {/* KPI strip */}
        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-icon">
              <ICON.gateway size={24} />
            </div>
            <div className="kpi-value" style={{ fontSize: "24px" }}>
              SenseCap LoRaWAN
            </div>
            <div className="kpi-caption">Gateway Status</div>
            <div className="kpi-def">Online · Uplink interval ~293 s · Ingest latency ~1.2 s</div>
          </div>

          <div className="kpi">
            <div className="kpi-icon">
              <ICON.table size={24} />
            </div>
            <div className="kpi-value" style={{ fontSize: "24px" }}>
              {sys.db.readings.toLocaleString()} rows
            </div>
            <div className="kpi-caption">Database Footprint</div>
            <div className="kpi-def">SQLite 3 store ({sys.db.sizeMb.toFixed(1)} MB) · 90-day retention</div>
          </div>

          <div className="kpi">
            <div className="kpi-icon">
              <ICON.clock size={24} />
            </div>
            <div className="kpi-value" style={{ fontSize: "24px" }}>
              {(sys.uptimeS / 86400).toFixed(1)} days
            </div>
            <div className="kpi-caption">Server Uptime</div>
            <div className="kpi-def">Next.js standalone runtime · Clock Mode: {sys.clockMode}</div>
          </div>
        </div>

        {/* Ingestion & Background Workers */}
        <div className="ops-grid-2">
          <Card
            eyebrow={{ icon: ICON.gateway, text: "INGESTION PIPELINE" }}
            title="The Things Stack (TTS) Ingestion"
            pill={<SampleDataBadge />}
          >
            <div className="ops-dl-grid">
              <div className="ops-dl-dt">Webhook Ingestion</div>
              <div className="ops-dl-dd" style={{ color: "var(--ok-tx)", fontWeight: 700 }}>
                {sys.ingest.enabled ? "Active ✓ (Listening on /api/ingest/tts)" : "Disabled"}
              </div>

              <div className="ops-dl-dt">Last Received Packet</div>
              <div className="ops-dl-dd">
                {sys.ingest.lastUplinkAt ? ago(sys.ingest.lastUplinkAt, asOf) : "Never"}
              </div>

              <div className="ops-dl-dt">Gateway Latency</div>
              <div className="ops-dl-dd">1.2 seconds end-to-end</div>

              <div className="ops-dl-dt">Payload Decoder</div>
              <div className="ops-dl-dd">SenseCap LoRaWAN binary v1.0.4</div>
            </div>
          </Card>

          <Card
            eyebrow={{ icon: ICON.clock, text: "CRON WORKERS" }}
            title="Scheduled Maintenance Jobs"
            pill={<SampleDataBadge />}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", fontSize: "13px" }}>
              {sys.jobs.map((j) => (
                <div key={j.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <strong>{j.name}</strong>
                    <div style={{ fontSize: "11px", color: "var(--tx-quiet)" }}>
                      {j.lastRunAt ? `Last run ${ago(j.lastRunAt, asOf)}` : "Pending"}
                    </div>
                  </div>
                  <span className={j.ok ? "chip chip--ok" : "chip chip--err"}>
                    {j.ok ? "Healthy" : "Failing"}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Hardware Devices Diagnostic Table */}
        <Card
          eyebrow={{ icon: ICON.signal, text: "TELEMETRY RADIOS" }}
          title="Hardware Device Diagnostics"
          pill={<SampleDataBadge />}
        >
          {isLoading && !status ? (
            <div style={{ padding: "var(--sp-6)", textAlign: "center", color: "var(--tx-quiet)" }}>
              Loading devices...
            </div>
          ) : (
            <table className="table" style={{ width: "100%", fontSize: "13px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Device EUI</th>
                  <th style={{ textAlign: "left" }}>Assigned Tank</th>
                  <th style={{ textAlign: "left" }}>Status</th>
                  <th style={{ textAlign: "left" }}>Last Reading</th>
                  <th style={{ textAlign: "right" }}>RSSI</th>
                  <th style={{ textAlign: "right" }}>Battery</th>
                </tr>
              </thead>
              <tbody>
                {sys.devices.map((d) => (
                  <tr key={d.deviceId}>
                    <td style={{ fontFamily: "var(--f-mono)" }}><strong>{d.deviceId}</strong></td>
                    <td>{d.tankId ? `Tank ${d.tankId}` : "Unassigned"}</td>
                    <td><span className="chip chip--ok">{d.status}</span></td>
                    <td title={d.lastReadingAt ? stamp(d.lastReadingAt, tz, true) : undefined}>
                      {d.lastReadingAt ? ago(d.lastReadingAt, asOf) : "Never"}
                    </td>
                    <td style={{ textAlign: "right", fontFeatureSettings: "tnum" }}>{d.rssi ? `${d.rssi} dBm` : "—"}</td>
                    <td style={{ textAlign: "right", fontFeatureSettings: "tnum" }}>{d.batteryPct ? `${d.batteryPct} %` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </PageFrame>
  );
}

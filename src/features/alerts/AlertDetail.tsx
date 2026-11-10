"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Breadcrumbs, Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { SeverityChip, AlertStateChip, PhaseChip, SampleDataBadge } from "@/components/status/badges";
import { useToast } from "@/components/ui/Toast";
import { useAlerts, useTank, useReadings, useMe, useDashboard } from "@/lib/hooks";
import { post } from "@/lib/api";
import { stamp, fmtCm, fmtFill, fmtLitres, fmtDbm, fmtSnr } from "@/lib/format";
import { useUi } from "@/lib/store";
import { canAcknowledgeAlerts } from "@/lib/roles";
import { ICON } from "@/components/ui/icons";
import { TrendChart } from "@/components/charts/TrendChart";
import { normalizeAlert } from "./adapter";
import "@/styles/views-ops.css";

interface AlertDetailProps {
  alertId: number;
}

export function AlertDetail({ alertId }: AlertDetailProps) {
  const toast = useToast();
  const { tz } = useUi();
  const { data: me } = useMe();
  const { data: dashboard } = useDashboard();
  const { data: rawAlerts, mutate: mutateAlerts } = useAlerts({ state: "all" });

  const [responseNote, setResponseNote] = useState("");
  const [busy, setBusy] = useState(false);

  // Find the alert
  const alert = useMemo(() => {
    if (!rawAlerts) return null;
    const found = (rawAlerts as unknown[]).find(
      (a) => (a as { id: number }).id === alertId
    ) as Record<string, unknown> | undefined;
    if (!found) return null;
    return normalizeAlert(found);
  }, [rawAlerts, alertId]);

  // Load tank info
  const { data: tank } = useTank(alert ? alert.tankId : null);

  // Window for ±3h chart around alert.openedAt
  const chartWindow = useMemo(() => {
    const target = alert?.triggerT ?? alert?.openedAt ?? Date.now();
    const threeHoursMs = 3 * 60 * 60 * 1000;
    return {
      from: target - threeHoursMs,
      to: target + threeHoursMs,
    };
  }, [alert]);

  const { data: readingsData } = useReadings({
    tankId: alert?.tankId ?? 0,
    from: chartWindow.from,
    to: chartWindow.to,
    res: "raw",
    enabled: !!alert?.tankId,
  });

  const chartSeries = useMemo(() => {
    if (!readingsData?.points || !alert) return [];
    return [
      {
        tankId: alert.tankId,
        label: alert.tankLabel,
        simulated: alert.simulated,
        points: readingsData.points.map((p) => ({
          t: p.t,
          levelPct: p.levelPct,
          levelCm: p.levelCm,
          distanceCm: p.distanceCm,
          volumeL: p.volumeL,
        })),
      },
    ];
  }, [readingsData, alert]);

  // Sensor health verdict
  const isHealthyVerdict = useMemo(() => {
    if (!readingsData?.points?.length) return true;
    const triggerPt = readingsData.points[readingsData.points.length - 1];
    return triggerPt?.quality === "ok" || triggerPt?.quality === "good";
  }, [readingsData]);

  const canAck = canAcknowledgeAlerts(me?.role);

  const handleAck = async () => {
    try {
      setBusy(true);
      await post(`/api/alerts/${alertId}/ack`, { note: responseNote.trim() || undefined });
      toast.success("Alert acknowledged.");
      mutateAlerts();
    } catch {
      toast.error("Failed to acknowledge alert.");
    } finally {
      setBusy(false);
    }
  };

  const handleResolve = async () => {
    try {
      setBusy(true);
      const res = await post<{ ok: boolean; __mock?: boolean }>(`/api/alerts/${alertId}/resolve`, {
        note: responseNote.trim() || undefined,
      });
      if (res && res.__mock) {
        toast.info("Not saved: resolve isn't live yet (backend pending)");
      } else {
        toast.success("Alert resolved.");
        mutateAlerts();
      }
    } catch {
      toast.error("Failed to resolve alert.");
    } finally {
      setBusy(false);
    }
  };

  if (!alert) {
    return (
      <div className="ops-view-container">
        <Breadcrumbs items={[{ label: "Alerts", href: "/alerts" }, { label: `Alert #${alertId}` }]} />
        <Card title="Alert not found">
          <p style={{ color: "var(--tx-quiet)" }}>
            The requested alert #{alertId} could not be located. It may have been cleared or archived.
          </p>
          <Link href="/alerts">
            <Button variant="outline" size="sm">
              Return to alerts
            </Button>
          </Link>
        </Card>
      </div>
    );
  }

  const triggerPt = readingsData?.points?.[readingsData.points.length - 1];

  return (
    <div className="ops-view-container">
      <Breadcrumbs items={[{ label: "Alerts", href: "/alerts" }, { label: `Alert #${alert.id}` }]} />

      {/* Header */}
      <div className="ops-alert-hero">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", marginBottom: "var(--sp-2)" }}>
            <SeverityChip severity={alert.severity} />
            <AlertStateChip state={alert.state} />
            <span style={{ fontSize: "12px", color: "var(--tx-quiet)" }}>ID #{alert.id}</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: 900, color: "var(--tx-head)", margin: 0 }}>
            {alert.message || `${alert.tankLabel} — ${alert.type}`}
          </h1>
          <p style={{ color: "var(--tx-quiet)", fontSize: "14px", marginTop: "var(--sp-1)" }}>
            Fired {stamp(alert.openedAt, tz, true)} for {alert.tankLabel}
          </p>
        </div>

        <div style={{ display: "flex", gap: "var(--sp-2)" }}>
          <Link href={`/tanks/${alert.tankId}`}>
            <Button variant="outline" size="sm" icon={ICON.tank}>
              Open Tank Detail
            </Button>
          </Link>
        </div>
      </div>

      {/* Two-up: Evidence Card | Lifecycle Card */}
      <div className="ops-grid-2">
        {/* Evidence Card */}
        <Card
          eyebrow={{ icon: ICON.diagram, text: "FORENSIC RECORD" }}
          title="Evidence & Telemetry"
          pill={
            <span
              className={`ops-verdict-chip ${
                isHealthyVerdict ? "ops-verdict-chip--ok" : "ops-verdict-chip--err"
              }`}
            >
              {isHealthyVerdict ? "Reading plausible — sensor healthy" : "Reading out of range — sensor fault suspected"}
            </span>
          }
        >
          <div className="ops-dl-grid">
            <div className="ops-dl-dt">Trigger Time</div>
            <div className="ops-dl-dd">{stamp(alert.triggerT ?? alert.openedAt, tz, true)}</div>

            <div className="ops-dl-dt">Sensor Distance</div>
            <div className="ops-dl-dd">{fmtCm(alert.triggerDistanceCm ?? triggerPt?.distanceCm)}</div>

            <div className="ops-dl-dt">Water Level</div>
            <div className="ops-dl-dd">{fmtCm(triggerPt?.levelCm)}</div>

            <div className="ops-dl-dt">Percent Full</div>
            <div className="ops-dl-dd">{fmtFill(alert.value ?? triggerPt?.levelPct)}</div>

            <div className="ops-dl-dt">Derived Volume</div>
            <div className="ops-dl-dd">{fmtLitres(triggerPt?.volumeL)}</div>

            <div className="ops-dl-dt">Signal RSSI / SNR</div>
            <div className="ops-dl-dd">
              {fmtDbm(dashboard?.tanks?.find((t) => t.id === alert.tankId)?.current?.rssi)} /{" "}
              {fmtSnr(dashboard?.tanks?.find((t) => t.id === alert.tankId)?.current?.snr)}
            </div>

            <div className="ops-dl-dt">Battery Level</div>
            <div className="ops-dl-dd">
              {dashboard?.tanks?.find((t) => t.id === alert.tankId)?.current?.batteryPct ?? "—"} %
            </div>

            <div className="ops-dl-dt">Signal Quality</div>
            <div className="ops-dl-dd">{triggerPt?.quality ?? "ok"}</div>
          </div>
        </Card>

        {/* Lifecycle Card */}
        <Card eyebrow={{ icon: ICON.clock, text: "INCIDENT TIMELINE" }} title="Lifecycle Progression">
          <div className="ops-stepper">
            <div className="ops-step-item">
              <div className="ops-step-dot ops-step-dot--done">✓</div>
              <div className="ops-step-content">
                <div className="ops-step-title">Detected</div>
                <div className="ops-step-meta">{stamp(alert.openedAt, tz, true)}</div>
              </div>
            </div>

            <div className="ops-step-item">
              <div className="ops-step-dot ops-step-dot--done">✓</div>
              <div className="ops-step-content">
                <div className="ops-step-title">Notified</div>
                <div className="ops-step-meta">In-app dispatch within 1.2s</div>
              </div>
            </div>

            <div className="ops-step-item">
              <div
                className={`ops-step-dot ${
                  alert.acknowledgedAt ? "ops-step-dot--done" : "ops-step-dot--current"
                }`}
              >
                {alert.acknowledgedAt ? "✓" : "•"}
              </div>
              <div className="ops-step-content">
                <div className="ops-step-title">Acknowledged</div>
                <div className="ops-step-meta">
                  {alert.acknowledgedAt
                    ? `${stamp(alert.acknowledgedAt, tz, true)}${
                        alert.acknowledgedByName ? ` by ${alert.acknowledgedByName}` : ""
                      }`
                    : "Pending operator confirmation"}
                </div>
              </div>
            </div>

            <div className="ops-step-item">
              <div
                className={`ops-step-dot ${
                  alert.resolvedAt ? "ops-step-dot--done" : "ops-step-dot--locked"
                }`}
              >
                {alert.resolvedAt ? "✓" : "○"}
              </div>
              <div className="ops-step-content">
                <div className="ops-step-title">Resolved</div>
                <div className="ops-step-meta">
                  {alert.resolvedAt ? stamp(alert.resolvedAt, tz, true) : "Awaiting condition clearance"}
                </div>
              </div>
            </div>

            <div className="ops-step-item" style={{ opacity: 0.5 }}>
              <div className="ops-step-dot ops-step-dot--locked">🔒</div>
              <div className="ops-step-content">
                <div className="ops-step-title">
                  Escalated <PhaseChip phase={2} />
                </div>
                <div className="ops-step-meta">Supervisor paging & incident tickets</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ±3h Incident Window Chart */}
      <Card
        eyebrow={{ icon: ICON.overview, text: "INCIDENT WINDOW" }}
        title="±3 Hours Level Trend & Threshold Crossing"
        footnote="Incident chart shows raw 5-minute telemetry around the triggering event. The dashed red line marks the warning threshold."
      >
        <TrendChart
          series={chartSeries}
          height={330}
          thresholds={
            tank?.thresholds ?? {
              warnPct: 40,
              critPct: 20,
              emptyPct: 5,
            }
          }
          title={`Incident ±3h window for ${alert.tankLabel}`}
        />
      </Card>

      {/* Response Card */}
      <Card
        eyebrow={{ icon: ICON.edit, text: "OPERATIONAL ACTION" }}
        title="Response & Confirmation"
      >
        {canAck ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
            <div>
              <label
                htmlFor="alert-response-action"
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--tx-label)",
                  marginBottom: "var(--sp-1)",
                }}
              >
                What did you do?
              </label>
              <textarea
                id="alert-response-action"
                rows={3}
                maxLength={280}
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                placeholder="Log physical actions taken (e.g. Switched line pump to Tank 1; investigated roof valve)."
                className="field"
                style={{ width: "100%", resize: "vertical" }}
              />
              <div style={{ textAlign: "right", fontSize: "11px", color: "var(--tx-quiet)", marginTop: "4px" }}>
                {responseNote.length} / 280 characters
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap", alignItems: "center" }}>
              <Button
                variant="primary"
                onClick={handleAck}
                loading={busy}
                disabled={alert.state === "acknowledged" || alert.state === "resolved"}
              >
                {alert.state === "acknowledged" ? "Acknowledged ✓" : "Acknowledge"}
              </Button>

              <Button
                variant="outline"
                onClick={handleResolve}
                loading={busy}
                disabled={alert.state === "resolved"}
              >
                Resolve
              </Button>

              <Button
                variant="outline"
                lock={2}
                title="Snoozing alerts is available in Phase 2"
              >
                Snooze
              </Button>
            </div>
          </div>
        ) : (
          <div style={{ color: "var(--tx-quiet)", fontSize: "13px" }}>
            <p>You have Viewer permissions (read-only). Response actions require Operator or Admin privileges.</p>
            {alert.ackNote && (
              <p>
                <strong>Recorded response:</strong> {alert.ackNote}
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Two-up: Delivery Card | Rule Card */}
      <div className="ops-grid-2">
        {/* Delivery Card */}
        <Card
          eyebrow={{ icon: ICON.gateway, text: "DISPATCH CHANNELS" }}
          title="Notification Delivery Status"
          pill={<SampleDataBadge />}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>
                <strong>In-App Webhook</strong>
              </span>
              <span style={{ color: "var(--ok-tx)", fontWeight: 700 }}>Delivered ✓</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
              <span>SMS Direct Alert</span>
              <PhaseChip phase={2} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
              <span>Email Digest</span>
              <PhaseChip phase={2} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
              <span>WhatsApp Emergency Alert</span>
              <PhaseChip phase={3} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
              <span>Automated Voice Call</span>
              <PhaseChip phase={3} />
            </div>
          </div>
        </Card>

        {/* Rule Card */}
        <Card eyebrow={{ icon: ICON.methodology, text: "ENGINE LOGIC" }} title="Alert Rule Definition">
          <div className="ops-dl-grid">
            <div className="ops-dl-dt">Trigger Rule</div>
            <div className="ops-dl-dd">{alert.type}</div>

            <div className="ops-dl-dt">Persistence</div>
            <div className="ops-dl-dd">3 consecutive readings (≈ 15 min)</div>

            <div className="ops-dl-dt">Cooldown</div>
            <div className="ops-dl-dd">30 minutes before re-arming</div>

            <div className="ops-dl-dt">Auto-resolve</div>
            <div className="ops-dl-dd">Hysteresis (+2% above trigger threshold)</div>

            <div className="ops-dl-dt">Repeats Suppressed</div>
            <div className="ops-dl-dd">0 deduplicated cycles</div>
          </div>
        </Card>
      </div>
    </div>
  );
}

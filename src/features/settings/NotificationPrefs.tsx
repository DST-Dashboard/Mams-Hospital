"use client";

import { Card } from "@/components/ui/primitives";
import { SampleDataBadge, PhaseChip } from "@/components/status/badges";
import { ICON } from "@/components/ui/icons";

export function NotificationPrefs() {
  return (
    <Card
      id="notifications"
      eyebrow={{ icon: ICON.gateway, text: "DISPATCH CHANNELS" }}
      title="Notification Preferences"
      pill={<SampleDataBadge />}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <p style={{ margin: 0, fontSize: "14px", color: "var(--tx-body)" }}>
          Configure individual operator channels and escalation dispatch schedules.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", borderTop: "1px solid var(--bd-soft)", paddingTop: "var(--sp-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>In-App Webhook Dispatch</div>
              <div style={{ fontSize: "11px", color: "var(--tx-quiet)" }}>Immediate real-time browser alerts</div>
            </div>
            <span className="chip chip--ok">Active</span>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>SMS Gateway</div>
              <div style={{ fontSize: "11px", color: "var(--tx-quiet)" }}>Direct mobile dispatch via SMS gateway</div>
            </div>
            <PhaseChip phase={2} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>Email Daily Digest</div>
              <div style={{ fontSize: "11px", color: "var(--tx-quiet)" }}>Summary reports to hospital administration</div>
            </div>
            <PhaseChip phase={2} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "13px" }}>WhatsApp Emergency Broadcast</div>
              <div style={{ fontSize: "11px", color: "var(--tx-quiet)" }}>High-priority incident group alerts</div>
            </div>
            <PhaseChip phase={3} />
          </div>
        </div>
      </div>
    </Card>
  );
}

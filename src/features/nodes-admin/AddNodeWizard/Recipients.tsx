"use client";

import { PhaseChip } from "@/components/status/badges";

export function RecipientsStep() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <p style={{ margin: 0, fontSize: "14px", color: "var(--tx-body)" }}>
        Select automated alert notification channels for this tank node.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", background: "var(--bg-subtle)", padding: "var(--sp-4)", borderRadius: "var(--r-md)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "13px" }}>In-App Webhooks & Browser Banner</div>
            <div style={{ fontSize: "11px", color: "var(--tx-quiet)" }}>Immediate real-time display on dashboard chrome</div>
          </div>
          <span className="chip chip--ok">Enabled ✓</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "13px" }}>SMS Emergency Paging</div>
            <div style={{ fontSize: "11px", color: "var(--tx-quiet)" }}>Duty engineers and maintenance staff</div>
          </div>
          <PhaseChip phase={2} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "13px" }}>Email Notification Digest</div>
            <div style={{ fontSize: "11px", color: "var(--tx-quiet)" }}>Daily summaries and non-critical thresholds</div>
          </div>
          <PhaseChip phase={2} />
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", opacity: 0.6 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "13px" }}>WhatsApp Duty Group</div>
            <div style={{ fontSize: "11px", color: "var(--tx-quiet)" }}>Emergency empty broadcast</div>
          </div>
          <PhaseChip phase={3} />
        </div>
      </div>
    </div>
  );
}

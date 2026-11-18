"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useToast } from "@/components/ui/Toast";
import { useApi } from "@/lib/hooks";
import { put } from "@/lib/api";
import { ICON } from "@/components/ui/icons";
import type { NotificationPrefsDTO } from "@/contracts/settings";

export function NotificationPrefs() {
  const toast = useToast();
  const { data: prefs, mutate } = useApi<NotificationPrefsDTO>("/api/settings/notifications");

  const [inApp, setInApp] = useState(true);
  const [email, setEmail] = useState(true);
  const [quietEnabled, setQuietEnabled] = useState(true);
  const [quietStart, setQuietStart] = useState("22:00");
  const [quietEnd, setQuietEnd] = useState("06:00");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (prefs) {
      setQuietEnabled(prefs.quietHours?.enabled ?? true);
      setQuietStart(prefs.quietHours?.start ?? "22:00");
      setQuietEnd(prefs.quietHours?.end ?? "06:00");

      const channels = prefs.channelsBySeverity?.critical ?? ["in_app", "email"];
      setInApp(channels.includes("in_app"));
      setEmail(channels.includes("email"));
    }
  }, [prefs]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const activeChannels: ("in_app" | "email")[] = [];
      if (inApp) activeChannels.push("in_app");
      if (email) activeChannels.push("email");

      const payload: NotificationPrefsDTO = {
        channelsBySeverity: {
          info: activeChannels,
          warning: activeChannels,
          critical: activeChannels,
          emergency: activeChannels,
        },
        quietHours: {
          enabled: quietEnabled,
          start: quietStart,
          end: quietEnd,
        },
        email: prefs?.email ?? null,
        phone: prefs?.phone ?? null,
        whatsapp: prefs?.whatsapp ?? null,
        tankIds: prefs?.tankIds ?? [],
      };

      await put("/api/settings/notifications", payload);
      await mutate();
      toast.success("Notification preferences and quiet hours saved.");
    } catch {
      toast.error("Failed to save notification preferences.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      id="notifications"
      eyebrow={{ icon: ICON.gateway, text: "DISPATCH CHANNELS & QUIET HOURS" }}
      title="Notification Preferences"
    >
      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
        {/* Section 1: Dispatch Channels */}
        <div>
          <h4 style={{ margin: "0 0 var(--sp-2)", fontSize: "14px", fontWeight: 700, color: "var(--tx-head)" }}>
            Active Alert Channels
          </h4>
          <p style={{ margin: "0 0 var(--sp-4)", fontSize: "13px", color: "var(--tx-body)" }}>
            Select delivery methods for telemetry thresholds, sensor faults, and automated escalation.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)" }}>
            {/* In-App */}
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--sp-3)",
                background: "var(--bg-subtle)",
                borderRadius: "var(--r-md)",
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--tx-head)" }}>In-App Browser Alerts</div>
                <div style={{ fontSize: "11px", color: "var(--tx-quiet)" }}>Instant banner and dashboard indicators</div>
              </div>
              <input
                type="checkbox"
                checked={inApp}
                onChange={(e) => setInApp(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "var(--brand-800)" }}
              />
            </label>

            {/* Email */}
            <label
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "var(--sp-3)",
                background: "var(--bg-subtle)",
                borderRadius: "var(--r-md)",
                cursor: "pointer",
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--tx-head)" }}>Email Notification Dispatch</div>
                <div style={{ fontSize: "11px", color: "var(--tx-quiet)" }}>Direct email alerts for critical events and daily summaries</div>
              </div>
              <input
                type="checkbox"
                checked={email}
                onChange={(e) => setEmail(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "var(--brand-800)" }}
              />
            </label>

            {/* SMS (Disabled) */}
            <Tooltip text="Hardware modem required">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--sp-3)",
                  background: "var(--bg-subtle)",
                  borderRadius: "var(--r-md)",
                  opacity: 0.5,
                  cursor: "not-allowed",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--tx-head)" }}>SMS Cellular Dispatch</div>
                  <div style={{ fontSize: "11px", color: "var(--tx-quiet)" }}>Direct SMS to on-call hospital mobile numbers</div>
                </div>
                <input type="checkbox" disabled checked={false} style={{ width: "18px", height: "18px" }} />
              </div>
            </Tooltip>

            {/* WhatsApp (Disabled) */}
            <Tooltip text="Hardware modem required">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "var(--sp-3)",
                  background: "var(--bg-subtle)",
                  borderRadius: "var(--r-md)",
                  opacity: 0.5,
                  cursor: "not-allowed",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--tx-head)" }}>WhatsApp Incident Group</div>
                  <div style={{ fontSize: "11px", color: "var(--tx-quiet)" }}>Broadcast to hospital engineering group</div>
                </div>
                <input type="checkbox" disabled checked={false} style={{ width: "18px", height: "18px" }} />
              </div>
            </Tooltip>
          </div>
        </div>

        {/* Section 2: Quiet Hours */}
        <div style={{ borderTop: "1px solid var(--bd-soft)", paddingTop: "var(--sp-4)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-3)" }}>
            <div>
              <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--tx-head)" }}>
                Night Shift Quiet Hours (IST)
              </h4>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--tx-quiet)" }}>
                Warning alerts are silenced. Critical and Emergency alerts always break through.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", cursor: "pointer", fontSize: "13px", fontWeight: 700 }}>
              <span>{quietEnabled ? "Active" : "Disabled"}</span>
              <input
                type="checkbox"
                checked={quietEnabled}
                onChange={(e) => setQuietEnabled(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "var(--brand-800)" }}
              />
            </label>
          </div>

          {quietEnabled && (
            <div style={{ display: "flex", gap: "var(--sp-4)", alignItems: "center", marginTop: "var(--sp-3)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--tx-body)" }}>Start Time</label>
                <input
                  type="time"
                  value={quietStart}
                  onChange={(e) => setQuietStart(e.target.value)}
                  className="input"
                  style={{ width: "130px", padding: "6px 10px" }}
                />
              </div>

              <span style={{ marginTop: "18px", color: "var(--tx-quiet)" }}>to</span>

              <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--tx-body)" }}>End Time</label>
                <input
                  type="time"
                  value={quietEnd}
                  onChange={(e) => setQuietEnd(e.target.value)}
                  className="input"
                  style={{ width: "130px", padding: "6px 10px" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Save button */}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button type="submit" variant="primary" loading={saving}>
            Save Notification Settings
          </Button>
        </div>
      </form>
    </Card>
  );
}

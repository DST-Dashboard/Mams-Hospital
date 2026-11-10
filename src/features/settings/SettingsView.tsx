"use client";

import { PageHeader, ViewGuide, Card } from "@/components/ui/primitives";
import { ThresholdForm } from "./ThresholdForm";
import { TankConfigForm } from "./TankConfigForm";
import { DisplayPrefs } from "./DisplayPrefs";
import { NotificationPrefs } from "./NotificationPrefs";
import { ChangePasswordForm } from "@/features/auth/ChangePasswordForm";
import { ICON } from "@/components/ui/icons";

export function SettingsView() {
  return (
    <>
      <PageHeader
        eyebrow={{ icon: ICON.settings, text: "SYSTEM CONFIGURATION" }}
        title="Settings & Thresholds"
        intro="Manage alert sensitivity limits, physical tank dimensions, display modes and account security."
      />

      <ViewGuide
        question="How should tanks and alerts be configured?"
        description="Thresholds decide when alerts fire. Dimensions decide how distance becomes litres."
        steps={[
          "Choose a tank.",
          "Adjust thresholds and watch the preview.",
          "Save.",
        ]}
        howToRead="Persistence is how many readings in a row must cross a threshold, which prevents noise."
        storageKey="ohtms_guide_settings"
      />

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-8)" }}>
        <ThresholdForm />
        <TankConfigForm />
        <DisplayPrefs />
        <NotificationPrefs />

        <Card
          id="security"
          eyebrow={{ icon: ICON.lock, text: "ACCOUNT & CREDENTIALS" }}
          title="Account Security"
          footnote="Passwords must be at least 8 characters. Session cookies are protected with httpOnly flags."
        >
          <ChangePasswordForm />
        </Card>
      </div>
    </>
  );
}

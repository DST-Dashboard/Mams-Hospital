"use client";

import { PageHeader, ViewGuide } from "@/components/ui/primitives";
import { AlertTable } from "./AlertTable";
import { ICON } from "@/components/ui/icons";

export function AlertsView() {
  return (
    <>
      <PageHeader
        eyebrow={{ icon: ICON.bell, text: "OPERATIONAL DISPATCH" }}
        title="Alerts & Incident Log"
        intro="Real-time threshold crossings, sensor faults and incident acknowledgement."
      />

      <ViewGuide
        question="What needs attention?"
        description="Every alert, newest first, with who responded and what they did."
        steps={[
          "Filter by level, tank or state.",
          "Open an alert for evidence and sensor health.",
          "Acknowledge it once you are handling it.",
        ]}
        howToRead="An active alert is still open; acknowledged means someone is on it; resolved means the condition cleared."
        storageKey="ohtms_guide_alerts"
      />

      <AlertTable />
    </>
  );
}

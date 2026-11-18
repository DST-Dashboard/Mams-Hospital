"use client";

import { Card, EmptyState } from "@/components/ui/primitives";
import { ICON } from "@/components/ui/icons";

export function ReportsList() {
  return (
    <Card
      id="reports"
      eyebrow={{ icon: ICON.download, text: "AUDIT & COMPLIANCE" }}
      title="Scheduled Reports & Exports"
    >
      <EmptyState
        icon={ICON.download}
        title="Automated Reports"
        text="Weekly summary PDF, NABH monthly compliance packages, and incident logs will be auto-generated in Phase 2."
        locked={2}
      />
    </Card>
  );
}

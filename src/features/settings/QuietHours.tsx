"use client";

import { Card, EmptyState } from "@/components/ui/primitives";
import { ICON } from "@/components/ui/icons";

export function QuietHours() {
  return (
    <Card
      eyebrow={{ icon: ICON.clock, text: "AUDIBLE DISPATCH" }}
      title="Quiet Hours (22:00 – 06:00)"
    >
      <EmptyState
        icon={ICON.clock}
        title="Quiet Hours Configuration"
        text="Suppression of non-emergency audible buzzer and siren dispatch during night shifts arrives in Phase 2."
        locked={2}
      />
    </Card>
  );
}

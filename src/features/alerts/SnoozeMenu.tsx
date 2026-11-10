"use client";

import { Button } from "@/components/ui/Button";
import { ICON } from "@/components/ui/icons";

export function SnoozeMenu() {
  return (
    <Button
      variant="outline"
      size="sm"
      icon={ICON.clock}
      lock={2}
      title="Snoozing alerts is available in Phase 2"
    >
      Snooze
    </Button>
  );
}

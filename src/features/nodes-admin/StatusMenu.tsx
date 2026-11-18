"use client";

import { useState } from "react";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { patch, tankToInput } from "@/lib/api";
import type { TankRow } from "@/lib/types";

interface StatusMenuProps {
  tank: TankRow;
  onSuccess: () => void;
}

export function StatusMenu({ tank, onSuccess }: StatusMenuProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as TankRow["status"];
    if (newStatus === tank.status) return;

    try {
      setBusy(true);
      const payload = tankToInput(tank, { status: newStatus });
      await patch(`/api/tanks/${tank.id}`, payload);
      toast.success(`${tank.label} status changed to ${newStatus}.`);
      onSuccess();
    } catch {
      toast.error("Failed to update node status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Select
      value={tank.status}
      onChange={handleChange}
      disabled={busy}
      options={[
        { value: "active", label: "Active" },
        { value: "maintenance", label: "Maintenance" },
        { value: "offline", label: "Offline" },
        { value: "decommissioned", label: "Decommissioned" },
        { value: "draft", label: "Draft" },
      ]}
    />
  );
}

"use client";

import React, { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import type { TankRow } from "@/server/repos/tanks";

export interface DeleteNodeDialogProps {
  open: boolean;
  onClose: () => void;
  tank: TankRow | null;
  onSuccess?: () => void;
}

export function DeleteNodeDialog({ open, onClose, tank, onSuccess }: DeleteNodeDialogProps) {
  const { success, error: toastError } = useToast();
  const [loading, setLoading] = useState(false);

  if (!tank) return null;

  const handleDelete = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tanks/${tank.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to decommission tank");
      }
      success(`Tank "${tank.label}" decommissioned. You can restore it from Deleted Nodes.`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting node";
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={handleDelete}
      title={`Decommission Tank: ${tank.label}`}
      description={
        <span>
          Are you sure you want to decommission this tank? Its active telemetry monitoring will be stopped and
          it will be moved to the Deleted Nodes archive.
        </span>
      }
      confirmLabel="Decommission Tank"
      confirmKeyword={tank.label}
      variant="danger"
      loading={loading}
    />
  );
}

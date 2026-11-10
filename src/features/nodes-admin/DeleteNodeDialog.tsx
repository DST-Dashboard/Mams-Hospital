"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { del } from "@/lib/api";
import type { TankRow } from "@/lib/types";

interface DeleteNodeDialogProps {
  open: boolean;
  tank: TankRow | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeleteNodeDialog({ open, tank, onClose, onSuccess }: DeleteNodeDialogProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  if (!tank) return null;

  const handleConfirm = async () => {
    try {
      setBusy(true);
      await del(`/api/tanks/${tank.id}`);
      toast.success(`${tank.label} moved to deleted nodes archive.`);
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to delete node.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      title={`Delete Node ${tank.label} (Modal M4)`}
      requireText={tank.label}
      confirmLabel="Delete node"
      danger={true}
      busy={busy}
      onConfirm={handleConfirm}
      body={
        <p style={{ margin: 0, color: "var(--tx-body)", fontSize: "14px" }}>
          This hides <strong>{tank.label}</strong> from the dashboard. History is kept for 90 days and you can restore it until then.
        </p>
      }
    />
  );
}

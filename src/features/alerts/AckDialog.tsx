"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { post } from "@/lib/api";
import { ICON } from "@/components/ui/icons";

interface AckDialogProps {
  open: boolean;
  onClose: () => void;
  alertId: number;
  alertTitle: string;
  onSuccess?: () => void;
}

export function AckDialog({ open, onClose, alertId, alertTitle, onSuccess }: AckDialogProps) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const handleAck = async () => {
    try {
      setBusy(true);
      await post(`/api/alerts/${alertId}/ack`, { note: note.trim() || undefined });
      toast.success("Alert acknowledged.");
      setNote("");
      onSuccess?.();
      onClose();
    } catch {
      toast.error("Failed to acknowledge alert. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Acknowledge Alert"
      eyebrow={{ icon: ICON.bell, text: `ALERT #${alertId}` }}
      size="md"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-3)", width: "100%" }}>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleAck} loading={busy}>
            Acknowledge alert
          </Button>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <p style={{ margin: 0, color: "var(--tx-body)", fontSize: "14px" }}>
          You are acknowledging <strong>{alertTitle}</strong>. This signals to the team that response actions are underway.
        </p>

        <div>
          <label
            htmlFor="ack-note"
            style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--tx-label)", marginBottom: "var(--sp-1)" }}
          >
            Action taken / Note (optional)
          </label>
          <textarea
            id="ack-note"
            rows={3}
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Switched to backup municipal supply; inspected rooftop lid."
            className="field"
            style={{ width: "100%", resize: "vertical" }}
          />
          <div style={{ textAlign: "right", fontSize: "11px", color: "var(--tx-quiet)", marginTop: "4px" }}>
            {note.length} / 500 characters
          </div>
        </div>
      </div>
    </Dialog>
  );
}

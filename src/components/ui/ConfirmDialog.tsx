"use client";

import React, { useState } from "react";
import { Dialog } from "./Dialog";
import { Button } from "./Button";
import { Input } from "./Field";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  danger?: boolean;
  requireText?: string;
  busy?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger = false,
  requireText,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const [typedText, setTypedText] = useState("");

  const isConfirmedDisabled = busy || (requireText ? typedText !== requireText : false);

  const handleConfirm = async () => {
    if (isConfirmedDisabled) return;
    await onConfirm();
    setTypedText("");
  };

  const handleClose = () => {
    if (busy) return;
    setTypedText("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={title}
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={danger ? "danger" : "primary"}
            loading={busy}
            disabled={isConfirmedDisabled}
            onClick={handleConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>{body}</div>

        {requireText && (
          <div className="pt-2">
            <p className="text-[13px] text-[var(--tx-muted)] mb-2">
              Type <strong className="font-mono text-[var(--tx-main)]">{requireText}</strong> to confirm:
            </p>
            <Input
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder={requireText}
              disabled={busy}
              autoFocus
            />
          </div>
        )}
      </div>
    </Dialog>
  );
}

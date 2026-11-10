"use client";

import React, { useState, type ReactNode } from "react";
import { Dialog, DialogFooter } from "./Dialog";
import { Button } from "./Button";

export interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  /** If provided, user must type this exact string to enable the confirm button (e.g. node label for deletion) */
  confirmKeyword?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  confirmKeyword,
  loading = false,
}: ConfirmDialogProps) {
  const [typedInput, setTypedInput] = useState("");
  const [internalLoading, setInternalLoading] = useState(false);

  const isConfirmedAllowed = confirmKeyword ? typedInput === confirmKeyword : true;
  const isLoading = loading || internalLoading;

  const handleConfirm = async () => {
    if (!isConfirmedAllowed || isLoading) return;
    try {
      setInternalLoading(true);
      await onConfirm();
      setTypedInput("");
      onClose();
    } catch {
      // Error handled by caller
    } finally {
      setInternalLoading(false);
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    setTypedInput("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title={title} maxWidth="md">
      <div className="space-y-4">
        <div className="text-sm text-muted">{description}</div>

        {confirmKeyword ? (
          <div className="rounded border hairline bg-raised/40 p-3 space-y-2">
            <label className="block text-xs font-medium text-ink">
              Type <span className="font-mono font-bold text-crit select-all">{confirmKeyword}</span> to confirm:
            </label>
            <input
              type="text"
              value={typedInput}
              onChange={(e) => setTypedInput(e.target.value)}
              placeholder={confirmKeyword}
              disabled={isLoading}
              className="field w-full font-mono text-sm"
              autoFocus
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="quiet" onClick={handleClose} disabled={isLoading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant}
            onClick={handleConfirm}
            loading={isLoading}
            disabled={!isConfirmedAllowed}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </div>
    </Dialog>
  );
}

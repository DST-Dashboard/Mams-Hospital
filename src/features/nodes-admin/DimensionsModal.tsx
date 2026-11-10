"use client";

import React, { useState } from "react";
import { AlertCircle, CheckCircle2, Database, HelpCircle, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { patch, tankToInput } from "@/lib/api";
import { useToast } from "@/components/ui/Toast";
import type { TankRow } from "@/lib/types";

export interface DimensionsModalProps {
  open: boolean;
  tanks: TankRow[];
  onSuccess: () => Promise<void> | void;
}

interface TankDraft {
  id: number;
  label: string;
  shape: "cylinder" | "rectangle";
  heightCm: number;
  radiusCm?: number;
  widthCm?: number;
  lengthCm?: number;
  deadZoneCm: number;
  error?: string;
  status: "idle" | "saving" | "done" | "error";
}

function computeCapacityL(d: TankDraft): number {
  const effectiveHeight = Math.max(0, d.heightCm - d.deadZoneCm);
  if (d.shape === "cylinder" && d.radiusCm) {
    const volCm3 = Math.PI * Math.pow(d.radiusCm, 2) * effectiveHeight;
    return Math.round(volCm3 / 1000);
  }
  if (d.shape === "rectangle" && d.widthCm && d.lengthCm) {
    const volCm3 = d.widthCm * d.lengthCm * effectiveHeight;
    return Math.round(volCm3 / 1000);
  }
  return 0;
}

export function DimensionsModal({ open, tanks, onSuccess }: DimensionsModalProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  // Initialize draft rows for unconfirmed tanks
  const [drafts, setDrafts] = useState<TankDraft[]>(() =>
    tanks.map((t) => {
      const isCyl = t.geometry.shape.kind === "cylinder";
      const cyl = isCyl ? (t.geometry.shape as { kind: "cylinder"; radiusCm: number }) : null;
      const rect = !isCyl
        ? (t.geometry.shape as { kind: "rectangle"; widthCm: number; lengthCm: number })
        : null;

      return {
        id: t.id,
        label: t.label,
        shape: t.geometry.shape.kind,
        heightCm: t.geometry.heightCm || 300,
        radiusCm: cyl?.radiusCm || 100,
        widthCm: rect?.widthCm || 200,
        lengthCm: rect?.lengthCm || 200,
        deadZoneCm: t.geometry.deadZoneCm || 25,
        status: "idle",
      };
    })
  );

  const updateDraft = (id: number, patchVal: Partial<TankDraft>) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ...patchVal, error: undefined } : d))
    );
  };

  const validateDraft = (d: TankDraft): string | null => {
    if (!d.heightCm || d.heightCm <= 0) {
      return "Height must be greater than 0 cm.";
    }
    if (d.heightCm < 20 || d.heightCm > 2000) {
      return "Height must be between 20 and 2,000 cm.";
    }
    if (d.deadZoneCm >= d.heightCm) {
      return "Dead zone must be smaller than the tank height.";
    }
    if (d.shape === "cylinder") {
      if (!d.radiusCm || d.radiusCm <= 0) return "Radius must be greater than 0 cm.";
      if (d.radiusCm < 10 || d.radiusCm > 1000) return "Radius must be between 10 and 1,000 cm.";
    } else {
      if (!d.widthCm || d.widthCm <= 0) return "Width must be greater than 0 cm.";
      if (!d.lengthCm || d.lengthCm <= 0) return "Length must be greater than 0 cm.";
    }
    return null;
  };

  const handleSave = async () => {
    // Validate all rows first
    let hasValidationError = false;
    const validated = drafts.map((d) => {
      const err = validateDraft(d);
      if (err) hasValidationError = true;
      return { ...d, error: err || undefined };
    });

    setDrafts(validated);
    if (hasValidationError) {
      toast.error("Please correct physical dimension errors before saving.");
      return;
    }

    setBusy(true);
    let allSucceeded = true;

    for (const draft of drafts) {
      const origRow = tanks.find((t) => t.id === draft.id);
      if (!origRow) continue;

      updateDraft(draft.id, { status: "saving" });

      try {
        const payload = tankToInput(origRow, {
          shape: draft.shape,
          heightCm: Number(draft.heightCm),
          radiusCm: draft.shape === "cylinder" ? Number(draft.radiusCm) : undefined,
          widthCm: draft.shape === "rectangle" ? Number(draft.widthCm) : undefined,
          lengthCm: draft.shape === "rectangle" ? Number(draft.lengthCm) : undefined,
          deadZoneCm: Number(draft.deadZoneCm),
          dimsConfirmed: true,
        });

        await patch(`/api/tanks/${draft.id}`, payload);
        updateDraft(draft.id, { status: "done" });
      } catch (e: unknown) {
        allSucceeded = false;
        const msg = e instanceof Error ? e.message : "Failed to save";
        updateDraft(draft.id, { status: "error", error: msg });
      }
    }

    setBusy(false);

    if (allSucceeded) {
      toast.success("Dimensions confirmed. Level alerts start within about a minute.");
      await onSuccess();
    } else {
      toast.error("Some tanks could not be updated. Please review errors.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {}}
      title="Confirm Tank Dimensions (M1)"
      eyebrow={{ icon: Database, text: "INITIAL SETUP" }}
      size="lg"
      mandatory={true}
      footer={
        <div className="flex items-center justify-between w-full">
          <p className="text-[12px] text-[var(--tx-quiet)] m-0">
            Tanks remain in provisional mode until dimensions are saved.
          </p>
          <Button
            variant="primary"
            loading={busy}
            onClick={handleSave}
            icon={CheckCircle2}
          >
            Save and start monitoring
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="banner banner--info text-[13px]">
          <HelpCircle size={18} className="flex-shrink-0" aria-hidden />
          <div>
            Default physical dimensions are loaded. Confirm or adjust the height, radius and
            dead zone for each tank so that derived water volume and alarms are accurate.
          </div>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
          {drafts.map((d) => {
            const capL = computeCapacityL(d);

            return (
              <div
                key={d.id}
                className="p-4 rounded-[12px] border border-[var(--bd)] bg-[var(--bg-subtle)] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[15px] text-[var(--tx-head)]">
                    {d.label}
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[var(--tx-quiet)]">
                      Capacity: <strong className="num text-[var(--tx-head)]">{capL.toLocaleString()} L</strong>
                    </span>
                    {d.status === "saving" && <Loader2 size={16} className="animate-spin text-[var(--brand-600)]" />}
                    {d.status === "done" && <CheckCircle2 size={16} className="text-[var(--ok-tx)]" />}
                    {d.status === "error" && <AlertCircle size={16} className="text-[var(--err-tx)]" />}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
                  <div>
                    <label className="control-label text-[11px] mb-1">Shape</label>
                    <Select
                      value={d.shape}
                      disabled={busy}
                      onChange={(e) =>
                        updateDraft(d.id, { shape: e.target.value as "cylinder" | "rectangle" })
                      }
                      options={[
                        { value: "cylinder", label: "Cylinder" },
                        { value: "rectangle", label: "Rectangle" },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="control-label text-[11px] mb-1">Height (cm)</label>
                    <Input
                      type="number"
                      value={d.heightCm}
                      disabled={busy}
                      onChange={(e) => updateDraft(d.id, { heightCm: Number(e.target.value) })}
                    />
                  </div>

                  {d.shape === "cylinder" ? (
                    <div>
                      <label className="control-label text-[11px] mb-1">Radius (cm)</label>
                      <Input
                        type="number"
                        value={d.radiusCm || 0}
                        disabled={busy}
                        onChange={(e) => updateDraft(d.id, { radiusCm: Number(e.target.value) })}
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="control-label text-[11px] mb-1">Width (cm)</label>
                        <Input
                          type="number"
                          value={d.widthCm || 0}
                          disabled={busy}
                          onChange={(e) => updateDraft(d.id, { widthCm: Number(e.target.value) })}
                        />
                      </div>
                      <div>
                        <label className="control-label text-[11px] mb-1">Length (cm)</label>
                        <Input
                          type="number"
                          value={d.lengthCm || 0}
                          disabled={busy}
                          onChange={(e) => updateDraft(d.id, { lengthCm: Number(e.target.value) })}
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="control-label text-[11px] mb-1">Dead Zone (cm)</label>
                    <Input
                      type="number"
                      value={d.deadZoneCm}
                      disabled={busy}
                      onChange={(e) => updateDraft(d.id, { deadZoneCm: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {d.error && (
                  <p role="alert" className="text-[12px] text-[var(--err-tx)] m-0 font-medium">
                    {d.error}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
}

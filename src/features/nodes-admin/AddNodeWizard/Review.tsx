"use client";

import { Check, Edit, Loader2 } from "lucide-react";
import React from "react";
import { Button } from "@/components/ui/Button";
import { litres } from "@/lib/format";
import type { AddNodeWizardData } from "./types";

export function ReviewStep({
  data,
  onGoToStep,
  onSubmit,
  loading,
}: {
  data: AddNodeWizardData;
  onGoToStep: (stepIndex: number) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  const baseAreaCm2 =
    data.shape === "cylinder"
      ? Math.PI * Math.max(0, data.radiusCm) ** 2
      : Math.max(0, data.widthCm) * Math.max(0, data.lengthCm);
  const capacityL = Math.round((baseAreaCm2 * Math.max(0, data.heightCm)) / 1000);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-ink">Step 5: Review & Submit</h3>
        <p className="text-xs text-muted">
          Review all configured parameters before commissioning the new hospital tank node.
        </p>
      </div>

      <div className="space-y-4">
        {/* Identity Section */}
        <div className="rounded-lg border hairline bg-surface p-4">
          <div className="flex items-center justify-between border-b hairline pb-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">1. Identification</span>
            <button
              type="button"
              onClick={() => onGoToStep(0)}
              className="text-xs text-tide hover:underline flex items-center gap-1 font-medium"
            >
              <Edit size={12} /> Edit
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-muted block">Label:</span>
              <span className="font-semibold text-ink">{data.label}</span>
            </div>
            <div>
              <span className="text-muted block">Device ID:</span>
              <span className="font-mono text-ink">{data.deviceId || "—"}</span>
            </div>
            <div>
              <span className="text-muted block">Zone:</span>
              <span className="text-ink">{data.zone || "—"}</span>
            </div>
            <div>
              <span className="text-muted block">Initial Status:</span>
              <span className="capitalize font-semibold text-tide">{data.status}</span>
            </div>
          </div>
        </div>

        {/* Geometry Section */}
        <div className="rounded-lg border hairline bg-surface p-4">
          <div className="flex items-center justify-between border-b hairline pb-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">2. Geometry & Capacity</span>
            <button
              type="button"
              onClick={() => onGoToStep(1)}
              className="text-xs text-tide hover:underline flex items-center gap-1 font-medium"
            >
              <Edit size={12} /> Edit
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-muted block">Shape:</span>
              <span className="capitalize font-semibold text-ink">{data.shape}</span>
            </div>
            <div>
              <span className="text-muted block">Height:</span>
              <span className="font-mono text-ink">{data.heightCm} cm</span>
            </div>
            <div>
              <span className="text-muted block">Dead Zone:</span>
              <span className="font-mono text-ink">{data.deadZoneCm} cm</span>
            </div>
            <div>
              <span className="text-muted block">Total Capacity:</span>
              <span className="font-mono font-bold text-tide">{litres(capacityL)}</span>
            </div>
          </div>
        </div>

        {/* Thresholds Section */}
        <div className="rounded-lg border hairline bg-surface p-4">
          <div className="flex items-center justify-between border-b hairline pb-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">3. Alert Thresholds</span>
            <button
              type="button"
              onClick={() => onGoToStep(2)}
              className="text-xs text-tide hover:underline flex items-center gap-1 font-medium"
            >
              <Edit size={12} /> Edit
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-muted block">Warning Setpoint:</span>
              <span className="font-mono font-semibold text-warn">{data.warnPct}%</span>
            </div>
            <div>
              <span className="text-muted block">Critical Setpoint:</span>
              <span className="font-mono font-semibold text-crit">{data.critPct}%</span>
            </div>
            <div>
              <span className="text-muted block">Empty Risk Cutoff:</span>
              <span className="font-mono font-semibold text-emerg">{data.emptyPct}%</span>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="rounded-lg border hairline bg-surface p-4">
          <div className="flex items-center justify-between border-b hairline pb-2 mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted">4. Notifications</span>
            <button
              type="button"
              onClick={() => onGoToStep(3)}
              className="text-xs text-tide hover:underline flex items-center gap-1 font-medium"
            >
              <Edit size={12} /> Edit
            </button>
          </div>
          <div className="text-xs space-y-1">
            <div>
              <span className="text-muted">Recipients: </span>
              <span className="font-medium text-ink">{data.recipientEmails || "None configured"}</span>
            </div>
            <div>
              <span className="text-muted">Channels: </span>
              <span className="text-ink">
                {[
                  data.notifyInApp && "In-App",
                  data.notifyEmail && "Email",
                  data.notifySms && "SMS",
                ]
                  .filter(Boolean)
                  .join(", ") || "None"}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t hairline">
        <Button
          type="button"
          variant="primary"
          onClick={onSubmit}
          loading={loading}
          icon={<Check size={16} />}
        >
          Commission Tank Node
        </Button>
      </div>
    </div>
  );
}

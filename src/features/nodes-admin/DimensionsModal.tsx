"use client";

import clsx from "clsx";
import { AlertTriangle, Calculator, Check, Info } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Dialog, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { litres } from "@/lib/format";
import type { TankRow } from "@/server/repos/tanks";

export interface DimensionsModalProps {
  open: boolean;
  onClose: () => void;
  tank: TankRow | null;
  onSuccess?: () => void;
}

export function DimensionsModal({ open, onClose, tank, onSuccess }: DimensionsModalProps) {
  const { success, error: toastError } = useToast();

  const [shape, setShape] = useState<"cylinder" | "rectangle">("cylinder");
  const [heightCm, setHeightCm] = useState<number>(300);
  const [radiusCm, setRadiusCm] = useState<number>(100);
  const [widthCm, setWidthCm] = useState<number>(100);
  const [lengthCm, setLengthCm] = useState<number>(100);
  const [deadZoneCm, setDeadZoneCm] = useState<number>(25);
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (tank) {
      const g = tank.geometry;
      setShape(g.shape.kind === "cylinder" ? "cylinder" : "rectangle");
      setHeightCm(g.heightCm ?? 300);
      setDeadZoneCm(g.deadZoneCm ?? 25);
      if (g.shape.kind === "cylinder") {
        setRadiusCm(g.shape.radiusCm ?? 100);
      } else {
        setWidthCm(g.shape.widthCm ?? 100);
        setLengthCm(g.shape.lengthCm ?? 100);
      }
    }
  }, [tank]);

  if (!tank) return null;

  // Calculate live capacity
  const baseAreaCm2 =
    shape === "cylinder" ? Math.PI * Math.max(0, radiusCm) ** 2 : Math.max(0, widthCm) * Math.max(0, lengthCm);
  const capacityL = Math.round((baseAreaCm2 * Math.max(0, heightCm)) / 1000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (heightCm < 20 || heightCm > 2000) {
      setFormError("Height must be between 20 cm and 2000 cm.");
      return;
    }
    if (deadZoneCm < 0 || deadZoneCm >= heightCm) {
      setFormError("Dead zone must be smaller than the tank height.");
      return;
    }
    if (shape === "cylinder" && (radiusCm < 10 || radiusCm > 1000)) {
      setFormError("Radius must be between 10 cm and 1000 cm.");
      return;
    }
    if (shape === "rectangle" && (widthCm < 10 || widthCm > 5000 || lengthCm < 10 || lengthCm > 5000)) {
      setFormError("Width and length must be between 10 cm and 5000 cm.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        label: tank.label,
        deviceId: tank.deviceId,
        zone: tank.zone,
        location: tank.location,
        status: tank.status,
        shape,
        heightCm,
        deadZoneCm,
        radiusCm: shape === "cylinder" ? radiusCm : undefined,
        widthCm: shape === "rectangle" ? widthCm : undefined,
        lengthCm: shape === "rectangle" ? lengthCm : undefined,
        warnPct: tank.thresholds.warnPct ?? 40,
        critPct: tank.thresholds.critPct ?? 20,
        emptyPct: tank.thresholds.emptyPct ?? 5,
        dimsConfirmed: true,
      };

      const res = await fetch(`/api/tanks/${tank.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save dimensions");
      }

      success(`Dimensions for ${tank.label} confirmed successfully!`);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update dimensions";
      setFormError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-tide" />
          <span>Confirm Tank Dimensions: {tank.label}</span>
        </div>
      }
      description="Calibrate physical geometry to calculate exact water percentages, volumes and alarm triggers."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError ? (
          <div role="alert" className="rounded-md border border-crit/40 bg-crit/10 p-3 text-xs text-crit flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        ) : null}

        {!tank.dimsConfirmed ? (
          <div className="rounded-md border border-warn/40 bg-warn/10 p-3 text-xs text-ink flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 text-warn mt-0.5" />
            <div>
              <span className="font-semibold text-warn">Provisional Dimensions:</span> This tank is currently using
              system defaults. Confirm the actual measured tank dimensions to remove provisional badges across the system.
            </div>
          </div>
        ) : null}

        {/* Shape Selection */}
        <div>
          <label className="block text-xs font-medium text-ink mb-1.5">Tank Geometry Shape</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setShape("cylinder")}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-md border p-3 text-sm font-medium transition-all",
                shape === "cylinder"
                  ? "border-tide bg-tide/15 text-tide font-semibold"
                  : "border-line/60 bg-surface text-muted hover:bg-raised"
              )}
            >
              <div className="h-3 w-3 rounded-full border-2 border-current" />
              <span>Cylindrical Tank</span>
            </button>

            <button
              type="button"
              onClick={() => setShape("rectangle")}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-md border p-3 text-sm font-medium transition-all",
                shape === "rectangle"
                  ? "border-tide bg-tide/15 text-tide font-semibold"
                  : "border-line/60 bg-surface text-muted hover:bg-raised"
              )}
            >
              <div className="h-3 w-3 rounded-xs border-2 border-current" />
              <span>Rectangular Tank</span>
            </button>
          </div>
        </div>

        {/* Dimensional Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Total Height (H)" hint="Distance from sensor to tank floor" required>
            <div className="relative">
              <input
                type="number"
                min={20}
                max={2000}
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="field pr-12 font-mono text-sm"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                cm
              </span>
            </div>
          </Field>

          <Field label="Dead Zone Offset" hint="Sensor blind spot at top of tank" required>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={100}
                value={deadZoneCm}
                onChange={(e) => setDeadZoneCm(Number(e.target.value))}
                className="field pr-12 font-mono text-sm"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                cm
              </span>
            </div>
          </Field>

          {shape === "cylinder" ? (
            <Field label="Tank Radius (R)" hint="Internal radius of tank" required>
              <div className="relative">
                <input
                  type="number"
                  min={10}
                  max={1000}
                  value={radiusCm}
                  onChange={(e) => setRadiusCm(Number(e.target.value))}
                  className="field pr-12 font-mono text-sm"
                  required
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                  cm
                </span>
              </div>
            </Field>
          ) : (
            <>
              <Field label="Width (W)" hint="Internal cross width" required>
                <div className="relative">
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    value={widthCm}
                    onChange={(e) => setWidthCm(Number(e.target.value))}
                    className="field pr-12 font-mono text-sm"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                    cm
                  </span>
                </div>
              </Field>

              <Field label="Length (L)" hint="Internal cross length" required>
                <div className="relative">
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    value={lengthCm}
                    onChange={(e) => setLengthCm(Number(e.target.value))}
                    className="field pr-12 font-mono text-sm"
                    required
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">
                    cm
                  </span>
                </div>
              </Field>
            </>
          )}
        </div>

        {/* Live Capacity Card */}
        <div className="rounded-lg border hairline bg-raised/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted uppercase tracking-wider">
              Calculated Total Tank Capacity
            </span>
            <span className="text-lg font-bold font-mono text-tide">{litres(capacityL)}</span>
          </div>
          <div className="mt-2 text-xs text-muted leading-relaxed">
            Effective usable water depth: <span className="font-semibold text-ink">{Math.max(0, heightCm - deadZoneCm)} cm</span>
            {" · "}Usable capacity: <span className="font-semibold text-ink">{litres(Math.round((baseAreaCm2 * Math.max(0, heightCm - deadZoneCm)) / 1000))}</span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="quiet" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={loading} icon={<Check size={16} />}>
            Confirm & Save Dimensions
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

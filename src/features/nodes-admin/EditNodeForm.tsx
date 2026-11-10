"use client";

import clsx from "clsx";
import { AlertTriangle, Check, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { litres } from "@/lib/format";
import type { TankRow } from "@/server/repos/tanks";

export function EditNodeForm({ tank, onSaved }: { tank: TankRow; onSaved?: () => void }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const g = tank.geometry;
  const th = tank.thresholds;

  const [label, setLabel] = useState(tank.label);
  const [deviceId, setDeviceId] = useState(tank.deviceId ?? "");
  const [zone, setZone] = useState(tank.zone ?? "");
  const [location, setLocation] = useState(tank.location ?? "");
  const [status, setStatus] = useState<TankRow["status"]>(tank.status);

  const [shape, setShape] = useState<"cylinder" | "rectangle">(
    g.shape.kind === "cylinder" ? "cylinder" : "rectangle"
  );
  const [heightCm, setHeightCm] = useState(g.heightCm ?? 300);
  const [radiusCm, setRadiusCm] = useState(g.shape.kind === "cylinder" ? g.shape.radiusCm : 100);
  const [widthCm, setWidthCm] = useState(g.shape.kind === "rectangle" ? g.shape.widthCm : 100);
  const [lengthCm, setLengthCm] = useState(g.shape.kind === "rectangle" ? g.shape.lengthCm : 100);
  const [deadZoneCm, setDeadZoneCm] = useState(g.deadZoneCm ?? 25);
  const [dimsConfirmed, setDimsConfirmed] = useState(tank.dimsConfirmed);

  const [warnPct, setWarnPct] = useState(th.warnPct ?? 40);
  const [critPct, setCritPct] = useState(th.critPct ?? 20);
  const [emptyPct, setEmptyPct] = useState(th.emptyPct ?? 5);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Live capacity calculation
  const baseAreaCm2 =
    shape === "cylinder" ? Math.PI * Math.max(0, radiusCm) ** 2 : Math.max(0, widthCm) * Math.max(0, lengthCm);
  const capacityL = Math.round((baseAreaCm2 * Math.max(0, heightCm)) / 1000);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!label.trim()) {
      setFormError("Tank label is required.");
      return;
    }
    if (heightCm < 20 || heightCm > 2000) {
      setFormError("Height must be between 20 cm and 2000 cm.");
      return;
    }
    if (deadZoneCm >= heightCm) {
      setFormError("Dead zone must be less than tank height.");
      return;
    }
    if (!(warnPct > critPct && critPct > emptyPct)) {
      setFormError("Thresholds must follow: Warning % > Critical % > Empty %.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        label: label.trim(),
        deviceId: deviceId.trim() || null,
        zone: zone.trim() || null,
        location: location.trim() || null,
        status,
        shape,
        heightCm,
        deadZoneCm,
        radiusCm: shape === "cylinder" ? radiusCm : undefined,
        widthCm: shape === "rectangle" ? widthCm : undefined,
        lengthCm: shape === "rectangle" ? lengthCm : undefined,
        warnPct,
        critPct,
        emptyPct,
        dimsConfirmed,
      };

      const res = await fetch(`/api/tanks/${tank.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to save tank settings");
      }

      success(`Settings for "${label}" saved successfully!`);
      onSaved?.();
      router.push("/admin/nodes");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating tank";
      setFormError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {formError ? (
        <div role="alert" className="rounded-lg border border-crit/40 bg-crit/10 p-4 text-sm text-crit flex items-start gap-2.5">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{formError}</span>
        </div>
      ) : null}

      {/* Section 1: Identity */}
      <section className="rounded-lg border hairline bg-surface p-6 space-y-4">
        <h3 className="text-base font-semibold text-ink border-b hairline pb-3">
          1. Node Identification & Deployment
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Tank Label" hint="User-friendly hospital display name" required>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="field font-medium text-sm"
              required
            />
          </Field>

          <Field label="LoRaWAN Device ID" hint="TTS end device identifier (e.g. wio-e5-node-01)">
            <input
              type="text"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="field font-mono text-sm"
              placeholder="e.g. wio-e5-node-01"
            />
          </Field>

          <Field label="Hospital Zone" hint="Facility zone (e.g. Ward Block B, Main Hospital)">
            <input
              type="text"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="field text-sm"
              placeholder="e.g. Block A Rooftop"
            />
          </Field>

          <Field label="Physical Location" hint="Specific rooftop or tank farm coordinates">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="field text-sm"
              placeholder="e.g. Building 2 Roof"
            />
          </Field>

          <Field label="Operational Status">
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as TankRow["status"])}
              options={[
                { value: "active", label: "Active (Telemetry Ingesting)" },
                { value: "maintenance", label: "Maintenance (Alerts Suppressed)" },
                { value: "draft", label: "Draft (Testing / Staging)" },
                { value: "offline", label: "Offline (Device Inactive)" },
              ]}
            />
          </Field>
        </div>
      </section>

      {/* Section 2: Geometry */}
      <section className="rounded-lg border hairline bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between border-b hairline pb-3">
          <h3 className="text-base font-semibold text-ink">
            2. Tank Dimensions & Mathematical Geometry
          </h3>
          <span className="text-xs font-mono font-bold text-tide bg-tide/10 px-2.5 py-1 rounded">
            Capacity: {litres(capacityL)}
          </span>
        </div>

        <div>
          <label className="block text-xs font-medium text-ink mb-1.5">Tank Shape</label>
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <button
              type="button"
              onClick={() => setShape("cylinder")}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-md border p-2.5 text-xs font-semibold transition-all",
                shape === "cylinder"
                  ? "border-tide bg-tide/15 text-tide"
                  : "border-line/60 bg-raised/40 text-muted hover:bg-raised"
              )}
            >
              Cylindrical Tank
            </button>
            <button
              type="button"
              onClick={() => setShape("rectangle")}
              className={clsx(
                "flex items-center justify-center gap-2 rounded-md border p-2.5 text-xs font-semibold transition-all",
                shape === "rectangle"
                  ? "border-tide bg-tide/15 text-tide"
                  : "border-line/60 bg-raised/40 text-muted hover:bg-raised"
              )}
            >
              Rectangular Tank
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Height (H)" hint="Sensor to floor (cm)" required>
            <input
              type="number"
              min={20}
              max={2000}
              value={heightCm}
              onChange={(e) => setHeightCm(Number(e.target.value))}
              className="field font-mono text-sm"
              required
            />
          </Field>

          <Field label="Dead Zone" hint="Blind spot (cm)" required>
            <input
              type="number"
              min={0}
              max={100}
              value={deadZoneCm}
              onChange={(e) => setDeadZoneCm(Number(e.target.value))}
              className="field font-mono text-sm"
              required
            />
          </Field>

          {shape === "cylinder" ? (
            <Field label="Radius (R)" hint="Internal radius (cm)" required>
              <input
                type="number"
                min={10}
                max={1000}
                value={radiusCm}
                onChange={(e) => setRadiusCm(Number(e.target.value))}
                className="field font-mono text-sm"
                required
              />
            </Field>
          ) : (
            <>
              <Field label="Width (W)" hint="Width (cm)" required>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={widthCm}
                  onChange={(e) => setWidthCm(Number(e.target.value))}
                  className="field font-mono text-sm"
                  required
                />
              </Field>

              <Field label="Length (L)" hint="Length (cm)" required>
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={lengthCm}
                  onChange={(e) => setLengthCm(Number(e.target.value))}
                  className="field font-mono text-sm"
                  required
                />
              </Field>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="dimsConfirmed"
            checked={dimsConfirmed}
            onChange={(e) => setDimsConfirmed(e.target.checked)}
            className="rounded border hairline text-tide focus:ring-tide"
          />
          <label htmlFor="dimsConfirmed" className="text-xs font-medium text-ink cursor-pointer">
            Mark dimensions as verified and physically confirmed (clears provisional badges)
          </label>
        </div>
      </section>

      {/* Section 3: Alarm Thresholds */}
      <section className="rounded-lg border hairline bg-surface p-6 space-y-4">
        <h3 className="text-base font-semibold text-ink border-b hairline pb-3">
          3. Alert & Alarm Thresholds
        </h3>
        <p className="text-xs text-muted">
          Water percentage triggers for alarm dispatch. Must follow Warning &gt; Critical &gt; Empty.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Field label="Warning Low Threshold" hint="Triggers warning notification" required>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={99}
                value={warnPct}
                onChange={(e) => setWarnPct(Number(e.target.value))}
                className="field font-mono text-sm pr-8"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
            </div>
          </Field>

          <Field label="Critical Low Threshold" hint="Triggers urgent facility alert" required>
            <div className="relative">
              <input
                type="number"
                min={1}
                max={99}
                value={critPct}
                onChange={(e) => setCritPct(Number(e.target.value))}
                className="field font-mono text-sm pr-8"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
            </div>
          </Field>

          <Field label="Empty / Dry Run Risk" hint="Triggers pump shutdown safeguard" required>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={50}
                value={emptyPct}
                onChange={(e) => setEmptyPct(Number(e.target.value))}
                className="field font-mono text-sm pr-8"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
            </div>
          </Field>
        </div>
      </section>

      {/* Form Action Buttons */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button variant="quiet" onClick={() => router.push("/admin/nodes")} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" loading={loading} icon={<Save size={16} />}>
          Save Tank Settings
        </Button>
      </div>
    </form>
  );
}

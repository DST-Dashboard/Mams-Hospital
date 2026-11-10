"use client";

import { useState, useMemo } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { patch, tankToInput } from "@/lib/api";
import { validateTankForm, capacityLitres, type TankFormValues } from "@/lib/validation";
import { ICON } from "@/components/ui/icons";
import { PhaseChip } from "@/components/status/badges";
import type { TankRow } from "@/lib/types";

interface EditNodeFormProps {
  open: boolean;
  tank: TankRow | null;
  allTanks: TankRow[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EditNodeForm({ open, tank, allTanks, onClose, onSuccess }: EditNodeFormProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [m5Open, setM5Open] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const initialShape = tank?.geometry?.shape?.kind === "cylinder" ? "cylinder" : "rectangle";
  const initialH = tank?.geometry?.heightCm ?? 300;
  const initialR = (tank?.geometry?.shape as { radiusCm?: number })?.radiusCm ?? 100;
  const initialW = (tank?.geometry?.shape as { widthCm?: number })?.widthCm ?? 100;
  const initialL = (tank?.geometry?.shape as { lengthCm?: number })?.lengthCm ?? 100;
  const initialDz = tank?.geometry?.deadZoneCm ?? 25;

  const [formValues, setFormValues] = useState<TankFormValues>({
    label: tank?.label ?? "",
    deviceId: tank?.deviceId ?? "",
    zone: tank?.zone ?? "",
    location: tank?.location ?? "",
    status: tank?.status ?? "active",
    shape: initialShape,
    heightCm: initialH,
    radiusCm: initialR,
    widthCm: initialW,
    lengthCm: initialL,
    deadZoneCm: initialDz,
    warnPct: tank?.thresholds?.warnPct ?? 40,
    critPct: tank?.thresholds?.critPct ?? 20,
    emptyPct: tank?.thresholds?.emptyPct ?? 5,
    dimsConfirmed: tank?.dimsConfirmed ?? true,
  });

  const h = typeof formValues.heightCm === "string" ? parseFloat(formValues.heightCm) || 0 : formValues.heightCm;
  const r = typeof formValues.radiusCm === "string" ? parseFloat(formValues.radiusCm) || 0 : formValues.radiusCm ?? 0;
  const w = typeof formValues.widthCm === "string" ? parseFloat(formValues.widthCm) || 0 : formValues.widthCm ?? 0;
  const l = typeof formValues.lengthCm === "string" ? parseFloat(formValues.lengthCm) || 0 : formValues.lengthCm ?? 0;

  const estimatedCapacity = useMemo(() => {
    return capacityLitres(formValues.shape, h, formValues.shape === "cylinder" ? r : w, l);
  }, [formValues.shape, h, r, w, l]);

  const dimensionsChanged = useMemo(() => {
    if (!tank) return false;
    return initialH !== h || initialDz !== formValues.deadZoneCm || (formValues.shape === "cylinder" ? initialR !== r : initialW !== w || initialL !== l);
  }, [tank, initialH, initialDz, initialR, initialW, initialL, h, formValues.deadZoneCm, formValues.shape, r, w, l]);

  if (!tank) return null;

  const handlePreSave = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateTankForm(formValues, allTanks, tank.id);
    if (!res.ok) {
      setFieldErrors(res.fieldErrors);
      toast.error(Object.values(res.fieldErrors)[0] ?? "Validation error");
      return;
    }

    if (dimensionsChanged) {
      setM5Open(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    try {
      setBusy(true);
      const isCyl = formValues.shape === "cylinder";
      const payload = tankToInput(tank, {
        label: formValues.label.trim(),
        deviceId: formValues.deviceId?.trim() || null,
        zone: formValues.zone?.trim() || null,
        location: formValues.location?.trim() || null,
        status: formValues.status,
        shape: formValues.shape,
        heightCm: h,
        deadZoneCm: typeof formValues.deadZoneCm === "string" ? parseFloat(formValues.deadZoneCm) : formValues.deadZoneCm,
        warnPct: typeof formValues.warnPct === "string" ? parseFloat(formValues.warnPct) : formValues.warnPct,
        critPct: typeof formValues.critPct === "string" ? parseFloat(formValues.critPct) : formValues.critPct,
        emptyPct: typeof formValues.emptyPct === "string" ? parseFloat(formValues.emptyPct) : formValues.emptyPct,
        dimsConfirmed: true,
        ...(isCyl ? { radiusCm: r } : { widthCm: w, lengthCm: l }),
      });

      await patch(`/api/tanks/${tank.id}`, payload);
      toast.success(`${formValues.label} updated successfully.`);
      setM5Open(false);
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to update node.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Dialog
        open={open && !m5Open}
        onClose={onClose}
        title={`Edit Node ${tank.label} (Modal M3)`}
        eyebrow={{ icon: ICON.edit, text: "NODE CONFIGURATION" }}
        size="lg"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-2)", width: "100%" }}>
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handlePreSave} loading={busy} icon={ICON.ok}>
              Save changes
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
          {/* Section 1: Identity */}
          <details open>
            <summary style={{ fontSize: "14px", fontWeight: 700, color: "var(--tx-head)", cursor: "pointer", marginBottom: "var(--sp-3)" }}>
              1. Hardware Identity & Location
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", paddingLeft: "var(--sp-4)" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Label *</label>
                <input
                  type="text"
                  value={formValues.label}
                  onChange={(e) => setFormValues({ ...formValues, label: e.target.value })}
                  className="field"
                  style={{ width: "100%", marginTop: "2px" }}
                />
                {fieldErrors.label && <div style={{ color: "var(--err-tx)", fontSize: "11px" }}>{fieldErrors.label}</div>}
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Device EUI</label>
                <input
                  type="text"
                  maxLength={16}
                  value={formValues.deviceId ?? ""}
                  onChange={(e) => setFormValues({ ...formValues, deviceId: e.target.value.toLowerCase() })}
                  className="field"
                  style={{ width: "100%", marginTop: "2px", fontFamily: "var(--f-mono)" }}
                />
                {fieldErrors.deviceId && <div style={{ color: "var(--err-tx)", fontSize: "11px" }}>{fieldErrors.deviceId}</div>}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Zone</label>
                  <input
                    type="text"
                    value={formValues.zone ?? ""}
                    onChange={(e) => setFormValues({ ...formValues, zone: e.target.value })}
                    className="field"
                    style={{ width: "100%", marginTop: "2px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Location</label>
                  <input
                    type="text"
                    value={formValues.location ?? ""}
                    onChange={(e) => setFormValues({ ...formValues, location: e.target.value })}
                    className="field"
                    style={{ width: "100%", marginTop: "2px" }}
                  />
                </div>
              </div>
            </div>
          </details>

          {/* Section 2: Dimensions */}
          <details open>
            <summary style={{ fontSize: "14px", fontWeight: 700, color: "var(--tx-head)", cursor: "pointer", marginBottom: "var(--sp-3)" }}>
              2. Physical Dimensions & Dead Zone
            </summary>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", paddingLeft: "var(--sp-4)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Shape</label>
                  <Select
                    value={formValues.shape}
                    onChange={(e) => setFormValues({ ...formValues, shape: e.target.value as "cylinder" | "rectangle" })}
                    options={[
                      { value: "cylinder", label: "Cylinder" },
                      { value: "rectangle", label: "Rectangle" },
                    ]}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Height (cm) *</label>
                  <input
                    type="number"
                    min={1}
                    value={formValues.heightCm}
                    onChange={(e) => setFormValues({ ...formValues, heightCm: parseFloat(e.target.value) || 0 })}
                    className="field"
                    style={{ width: "100%", marginTop: "2px" }}
                  />
                  {fieldErrors.heightCm && <div style={{ color: "var(--err-tx)", fontSize: "11px" }}>{fieldErrors.heightCm}</div>}
                </div>
              </div>

              {formValues.shape === "cylinder" ? (
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Radius (cm) *</label>
                  <input
                    type="number"
                    min={1}
                    value={formValues.radiusCm ?? ""}
                    onChange={(e) => setFormValues({ ...formValues, radiusCm: parseFloat(e.target.value) || 0 })}
                    className="field"
                    style={{ width: "100%", marginTop: "2px" }}
                  />
                  {fieldErrors.radiusCm && <div style={{ color: "var(--err-tx)", fontSize: "11px" }}>{fieldErrors.radiusCm}</div>}
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-3)" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Width (cm) *</label>
                    <input
                      type="number"
                      min={1}
                      value={formValues.widthCm ?? ""}
                      onChange={(e) => setFormValues({ ...formValues, widthCm: parseFloat(e.target.value) || 0 })}
                      className="field"
                      style={{ width: "100%", marginTop: "2px" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Length (cm) *</label>
                    <input
                      type="number"
                      min={1}
                      value={formValues.lengthCm ?? ""}
                      onChange={(e) => setFormValues({ ...formValues, lengthCm: parseFloat(e.target.value) || 0 })}
                      className="field"
                      style={{ width: "100%", marginTop: "2px" }}
                    />
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Dead zone (cm) *</label>
                <input
                  type="number"
                  min={0}
                  value={formValues.deadZoneCm}
                  onChange={(e) => setFormValues({ ...formValues, deadZoneCm: parseFloat(e.target.value) || 0 })}
                  className="field"
                  style={{ width: "100%", marginTop: "2px" }}
                />
                {fieldErrors.deadZoneCm && <div style={{ color: "var(--err-tx)", fontSize: "11px" }}>{fieldErrors.deadZoneCm}</div>}
              </div>

              <div style={{ background: "var(--bg-subtle)", padding: "var(--sp-3)", borderRadius: "var(--r-md)", fontSize: "13px" }}>
                Estimated Capacity: <strong>{estimatedCapacity.toLocaleString()} Litres</strong>
              </div>
            </div>
          </details>

          {/* Section 3: Thresholds */}
          <details>
            <summary style={{ fontSize: "14px", fontWeight: 700, color: "var(--tx-head)", cursor: "pointer", marginBottom: "var(--sp-3)" }}>
              3. Alert Thresholds
            </summary>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-3)", paddingLeft: "var(--sp-4)" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Warn (%)</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={formValues.warnPct}
                  onChange={(e) => setFormValues({ ...formValues, warnPct: parseFloat(e.target.value) || 0 })}
                  className="field"
                  style={{ width: "100%", marginTop: "2px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Crit (%)</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={formValues.critPct}
                  onChange={(e) => setFormValues({ ...formValues, critPct: parseFloat(e.target.value) || 0 })}
                  className="field"
                  style={{ width: "100%", marginTop: "2px" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Empty (%)</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={formValues.emptyPct}
                  onChange={(e) => setFormValues({ ...formValues, emptyPct: parseFloat(e.target.value) || 0 })}
                  className="field"
                  style={{ width: "100%", marginTop: "2px" }}
                />
              </div>
            </div>
          </details>
        </div>
      </Dialog>

      {/* Modal M5 */}
      <Dialog
        open={m5Open}
        onClose={() => setM5Open(false)}
        title="Confirm Dimension Changes"
        eyebrow={{ icon: ICON.warn, text: "MODAL M5" }}
        size="md"
        footer={
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-3)", width: "100%" }}>
            <Button variant="outline" onClick={() => setM5Open(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="primary" onClick={executeSave} loading={busy}>
              Apply change
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
          <p style={{ margin: 0, color: "var(--tx-body)", fontSize: "14px" }}>
            Changing the tank dimensions recomputes level and volume for the entire history. Continue?
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-3)", background: "var(--bg-subtle)", padding: "var(--sp-4)", borderRadius: "var(--r-md)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
              <input type="radio" name="edit_m5_recompute" defaultChecked readOnly />
              Recompute the whole history
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", fontSize: "13px", color: "var(--tx-quiet)", opacity: 0.6 }}>
              <input type="radio" name="edit_m5_recompute" disabled />
              Apply from now on only <PhaseChip phase={2} />
            </label>
          </div>

          <p style={{ margin: 0, fontSize: "12px", color: "var(--tx-quiet)", fontStyle: "italic" }}>
            Readings are stored as distance, so history is recalculated when displayed.
          </p>
        </div>
      </Dialog>
    </>
  );
}

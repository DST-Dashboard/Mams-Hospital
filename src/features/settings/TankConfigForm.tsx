"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, Banner } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Dialog } from "@/components/ui/Dialog";
import { useToast } from "@/components/ui/Toast";
import { useTanks, useMe } from "@/lib/hooks";
import { patch, tankToInput } from "@/lib/api";
import { canMutateTanks } from "@/lib/roles";
import { capacityLitres, validateTankForm, type TankFormValues } from "@/lib/validation";
import { ICON } from "@/components/ui/icons";
import { PhaseChip } from "@/components/status/badges";

export function TankConfigForm() {
  const toast = useToast();
  const { data: me } = useMe();
  const { data: tanks, isLoading, mutate } = useTanks();

  const [selectedId, setSelectedId] = useState<number>(1);
  const [label, setLabel] = useState("");
  const [shape, setShape] = useState<"cylinder" | "rectangle">("cylinder");
  const [heightCm, setHeightCm] = useState<number>(300);
  const [radiusCm, setRadiusCm] = useState<number>(100);
  const [widthCm, setWidthCm] = useState<number>(100);
  const [lengthCm, setLengthCm] = useState<number>(100);
  const [deadZoneCm, setDeadZoneCm] = useState<number>(25);

  const [m5Open, setM5Open] = useState(false);
  const [busy, setBusy] = useState(false);

  const selectedTank = useMemo(() => {
    return tanks?.find((t) => t.id === selectedId) ?? tanks?.[0];
  }, [tanks, selectedId]);

  useEffect(() => {
    if (selectedTank) {
      setLabel(selectedTank.label);
      const isCyl = selectedTank.geometry?.shape?.kind === "cylinder";
      setShape(isCyl ? "cylinder" : "rectangle");
      setHeightCm(selectedTank.geometry?.heightCm ?? 300);
      setDeadZoneCm(selectedTank.geometry?.deadZoneCm ?? 25);
      if (isCyl) {
        setRadiusCm((selectedTank.geometry?.shape as { radiusCm: number })?.radiusCm ?? 100);
      } else {
        setWidthCm((selectedTank.geometry?.shape as { widthCm: number })?.widthCm ?? 100);
        setLengthCm((selectedTank.geometry?.shape as { lengthCm: number })?.lengthCm ?? 100);
      }
    }
  }, [selectedTank]);

  const isAdmin = canMutateTanks(me?.role);

  // Live capacity preview
  const estimatedCapacity = useMemo(() => {
    return capacityLitres(shape, heightCm, shape === "cylinder" ? radiusCm : widthCm, lengthCm);
  }, [shape, heightCm, radiusCm, widthCm, lengthCm]);

  // Check if dimensions changed
  const dimensionsChanged = useMemo(() => {
    if (!selectedTank) return false;
    const oldH = selectedTank.geometry?.heightCm;
    const oldDz = selectedTank.geometry?.deadZoneCm;
    if (oldH !== heightCm || oldDz !== deadZoneCm) return true;
    if (shape === "cylinder") {
      const oldR = (selectedTank.geometry?.shape as { radiusCm?: number })?.radiusCm;
      return oldR !== radiusCm;
    } else {
      const oldW = (selectedTank.geometry?.shape as { widthCm?: number })?.widthCm;
      const oldL = (selectedTank.geometry?.shape as { lengthCm?: number })?.lengthCm;
      return oldW !== widthCm || oldL !== lengthCm;
    }
  }, [selectedTank, heightCm, deadZoneCm, shape, radiusCm, widthCm, lengthCm]);

  const handlePreSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTank || !isAdmin) return;

    const values: TankFormValues = {
      label,
      status: selectedTank.status,
      shape,
      heightCm,
      radiusCm: shape === "cylinder" ? radiusCm : undefined,
      widthCm: shape === "rectangle" ? widthCm : undefined,
      lengthCm: shape === "rectangle" ? lengthCm : undefined,
      deadZoneCm,
      warnPct: selectedTank.thresholds?.warnPct ?? 40,
      critPct: selectedTank.thresholds?.critPct ?? 20,
      emptyPct: selectedTank.thresholds?.emptyPct ?? 5,
    };

    const res = validateTankForm(values, tanks, selectedTank.id);
    if (!res.ok) {
      const firstErr = Object.values(res.fieldErrors)[0];
      toast.error(firstErr ?? "Invalid dimensions");
      return;
    }

    if (dimensionsChanged) {
      setM5Open(true);
    } else {
      executeSave();
    }
  };

  const executeSave = async () => {
    if (!selectedTank) return;
    try {
      setBusy(true);
      const isCyl = shape === "cylinder";
      const payload = tankToInput(selectedTank, {
        label,
        shape,
        heightCm,
        deadZoneCm,
        dimsConfirmed: true,
        ...(isCyl ? { radiusCm } : { widthCm, lengthCm }),
      });

      await patch(`/api/tanks/${selectedTank.id}`, payload);
      toast.success(`Tank configuration updated for ${label}.`);
      setM5Open(false);
      mutate();
    } catch {
      toast.error("Failed to update tank configuration.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !selectedTank) return null;

  return (
    <>
      <Card
        eyebrow={{ icon: ICON.tank, text: "GEOMETRY & SENSOR" }}
        title="Tank Dimensions & Calibration"
        footnote="Tank height and radius determine the volume calibration curve used to compute stored litres."
      >
        {!isAdmin && (
          <Banner tone="info">
            Changing tank geometry and sensor calibration is restricted to Administrators.
          </Banner>
        )}

        <div style={{ marginBottom: "var(--sp-5)", maxWidth: "300px" }}>
          <label htmlFor="config-tank-select" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--tx-label)", marginBottom: "var(--sp-1)" }}>
            Select Tank
          </label>
          <Select
            id="config-tank-select"
            value={String(selectedTank.id)}
            onChange={(e) => setSelectedId(parseInt(e.target.value, 10))}
            options={(tanks ?? []).map((t) => ({ value: String(t.id), label: t.label }))}
          />
        </div>

        <form onSubmit={handlePreSave} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-5)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
            <div>
              <label htmlFor="tank-label" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tx-label)" }}>
                Tank Label
              </label>
              <input
                id="tank-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={!isAdmin || busy}
                className="field"
                style={{ width: "100%", marginTop: "4px" }}
              />
            </div>

            <div>
              <label htmlFor="tank-shape" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tx-label)" }}>
                Tank Shape
              </label>
              <Select
                id="tank-shape"
                value={shape}
                onChange={(e) => setShape(e.target.value as "cylinder" | "rectangle")}
                disabled={!isAdmin || busy}
                options={[
                  { value: "cylinder", label: "Cylinder (Vertical)" },
                  { value: "rectangle", label: "Rectangular Prism" },
                ]}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-4)" }}>
            <div>
              <label htmlFor="tank-height" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tx-label)" }}>
                Height H (cm)
              </label>
              <input
                id="tank-height"
                type="number"
                min={1}
                value={heightCm}
                onChange={(e) => setHeightCm(parseFloat(e.target.value) || 0)}
                disabled={!isAdmin || busy}
                className="field"
                style={{ width: "100%", marginTop: "4px" }}
              />
            </div>

            {shape === "cylinder" ? (
              <div>
                <label htmlFor="tank-radius" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tx-label)" }}>
                  Radius R (cm)
                </label>
                <input
                  id="tank-radius"
                  type="number"
                  min={1}
                  value={radiusCm}
                  onChange={(e) => setRadiusCm(parseFloat(e.target.value) || 0)}
                  disabled={!isAdmin || busy}
                  className="field"
                  style={{ width: "100%", marginTop: "4px" }}
                />
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="tank-width" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tx-label)" }}>
                    Width W (cm)
                  </label>
                  <input
                    id="tank-width"
                    type="number"
                    min={1}
                    value={widthCm}
                    onChange={(e) => setWidthCm(parseFloat(e.target.value) || 0)}
                    disabled={!isAdmin || busy}
                    className="field"
                    style={{ width: "100%", marginTop: "4px" }}
                  />
                </div>
                <div>
                  <label htmlFor="tank-length" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tx-label)" }}>
                    Length L (cm)
                  </label>
                  <input
                    id="tank-length"
                    type="number"
                    min={1}
                    value={lengthCm}
                    onChange={(e) => setLengthCm(parseFloat(e.target.value) || 0)}
                    disabled={!isAdmin || busy}
                    className="field"
                    style={{ width: "100%", marginTop: "4px" }}
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="tank-deadzone" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tx-label)" }}>
                Dead zone (cm)
              </label>
              <input
                id="tank-deadzone"
                type="number"
                min={0}
                value={deadZoneCm}
                onChange={(e) => setDeadZoneCm(parseFloat(e.target.value) || 0)}
                disabled={!isAdmin || busy}
                className="field"
                style={{ width: "100%", marginTop: "4px" }}
              />
            </div>
          </div>

          {/* Live Capacity Preview Callout */}
          <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--bd-soft)", borderRadius: "var(--r-lg)", padding: "var(--sp-4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--tx-quiet)", textTransform: "uppercase" }}>
                Live Estimated Capacity
              </div>
              <div style={{ fontSize: "20px", fontWeight: 900, color: "var(--tx-head)" }}>
                {estimatedCapacity.toLocaleString()} Litres <span style={{ fontSize: "13px", fontWeight: 400, color: "var(--tx-quiet)" }}>({(estimatedCapacity / 1000).toFixed(1)} kL)</span>
              </div>
            </div>
            <span className="chip chip--info">Calculated from H × Shape</span>
          </div>

          {isAdmin && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-3)" }}>
              <Button variant="primary" type="submit" loading={busy} icon={ICON.edit}>
                Save tank dimensions
              </Button>
            </div>
          )}
        </form>
      </Card>

      {/* Modal M5: Recompute Confirmation */}
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
              <input type="radio" name="m5_recompute" defaultChecked readOnly />
              Recompute the whole history
            </label>

            <label style={{ display: "flex", alignItems: "center", gap: "var(--sp-2)", fontSize: "13px", color: "var(--tx-quiet)", opacity: 0.6 }}>
              <input type="radio" name="m5_recompute" disabled />
              Apply from now on only <PhaseChip phase={2} />
            </label>
          </div>

          <p style={{ margin: 0, fontSize: "12px", color: "var(--tx-quiet)", fontStyle: "italic" }}>
            Readings are stored as raw distance, so history is recalculated whenever displayed.
          </p>
        </div>
      </Dialog>
    </>
  );
}


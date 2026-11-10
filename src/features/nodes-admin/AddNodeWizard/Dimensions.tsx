"use client";

import { useMemo } from "react";
import { Select } from "@/components/ui/Select";
import { capacityLitres, type TankFormValues } from "@/lib/validation";

interface DimensionsStepProps {
  values: TankFormValues;
  onChange: (vals: Partial<TankFormValues>) => void;
  errors?: Record<string, string>;
}

export function DimensionsStep({ values, onChange, errors }: DimensionsStepProps) {
  const h = typeof values.heightCm === "string" ? parseFloat(values.heightCm) || 0 : values.heightCm;
  const r = typeof values.radiusCm === "string" ? parseFloat(values.radiusCm) || 0 : values.radiusCm ?? 0;
  const w = typeof values.widthCm === "string" ? parseFloat(values.widthCm) || 0 : values.widthCm ?? 0;
  const l = typeof values.lengthCm === "string" ? parseFloat(values.lengthCm) || 0 : values.lengthCm ?? 0;

  const estimatedCapacity = useMemo(() => {
    return capacityLitres(values.shape, h, values.shape === "cylinder" ? r : w, l);
  }, [values.shape, h, r, w, l]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div>
        <label htmlFor="wizard-shape" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
          Tank Geometry Shape *
        </label>
        <Select
          id="wizard-shape"
          value={values.shape}
          onChange={(e) => onChange({ shape: e.target.value as "cylinder" | "rectangle" })}
          options={[
            { value: "cylinder", label: "Cylinder (Vertical)" },
            { value: "rectangle", label: "Rectangular Prism" },
          ]}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
        <div>
          <label htmlFor="wizard-height" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
            Height H (cm) *
          </label>
          <input
            id="wizard-height"
            type="number"
            min={1}
            value={values.heightCm}
            onChange={(e) => onChange({ heightCm: parseFloat(e.target.value) || 0 })}
            className="field"
            style={{ width: "100%", marginTop: "4px" }}
          />
          {errors?.heightCm && <div style={{ color: "var(--err-tx)", fontSize: "12px", marginTop: "2px" }}>{errors.heightCm}</div>}
        </div>

        {values.shape === "cylinder" ? (
          <div>
            <label htmlFor="wizard-radius" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
              Radius R (cm) *
            </label>
            <input
              id="wizard-radius"
              type="number"
              min={1}
              value={values.radiusCm ?? ""}
              onChange={(e) => onChange({ radiusCm: parseFloat(e.target.value) || 0 })}
              className="field"
              style={{ width: "100%", marginTop: "4px" }}
            />
            {errors?.radiusCm && <div style={{ color: "var(--err-tx)", fontSize: "12px", marginTop: "2px" }}>{errors.radiusCm}</div>}
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="wizard-width" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
                Width W (cm) *
              </label>
              <input
                id="wizard-width"
                type="number"
                min={1}
                value={values.widthCm ?? ""}
                onChange={(e) => onChange({ widthCm: parseFloat(e.target.value) || 0 })}
                className="field"
                style={{ width: "100%", marginTop: "4px" }}
              />
              {errors?.widthCm && <div style={{ color: "var(--err-tx)", fontSize: "12px", marginTop: "2px" }}>{errors.widthCm}</div>}
            </div>
            <div>
              <label htmlFor="wizard-length" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
                Length L (cm) *
              </label>
              <input
                id="wizard-length"
                type="number"
                min={1}
                value={values.lengthCm ?? ""}
                onChange={(e) => onChange({ lengthCm: parseFloat(e.target.value) || 0 })}
                className="field"
                style={{ width: "100%", marginTop: "4px" }}
              />
              {errors?.lengthCm && <div style={{ color: "var(--err-tx)", fontSize: "12px", marginTop: "2px" }}>{errors.lengthCm}</div>}
            </div>
          </>
        )}
      </div>

      <div>
        <label htmlFor="wizard-deadzone" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
          Sensor Dead Zone (cm) *
        </label>
        <input
          id="wizard-deadzone"
          type="number"
          min={0}
          value={values.deadZoneCm}
          onChange={(e) => onChange({ deadZoneCm: parseFloat(e.target.value) || 0 })}
          className="field"
          style={{ width: "100%", marginTop: "4px" }}
        />
        <div style={{ fontSize: "11px", color: "var(--tx-quiet)", marginTop: "2px" }}>
          Default is 25 cm for standard ultrasonic transceiver models.
        </div>
        {errors?.deadZoneCm && <div style={{ color: "var(--err-tx)", fontSize: "12px", marginTop: "2px" }}>{errors.deadZoneCm}</div>}
      </div>

      <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--bd-soft)", borderRadius: "var(--r-lg)", padding: "var(--sp-4)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--tx-quiet)", textTransform: "uppercase" }}>
            Live Estimated Capacity
          </div>
          <div style={{ fontSize: "18px", fontWeight: 900, color: "var(--tx-head)" }}>
            {estimatedCapacity.toLocaleString()} Litres
          </div>
        </div>
        <span className="chip chip--info">Auto-computed</span>
      </div>
    </div>
  );
}

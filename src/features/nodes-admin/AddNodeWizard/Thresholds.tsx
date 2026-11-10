"use client";

import { useMemo } from "react";
import { validateThresholds, type TankFormValues } from "@/lib/validation";

interface ThresholdsStepProps {
  values: TankFormValues;
  onChange: (vals: Partial<TankFormValues>) => void;
  errors?: Record<string, string>;
}

export function ThresholdsStep({ values, onChange, errors }: ThresholdsStepProps) {
  const warn = typeof values.warnPct === "string" ? parseFloat(values.warnPct) || 0 : values.warnPct;
  const crit = typeof values.critPct === "string" ? parseFloat(values.critPct) || 0 : values.critPct;
  const empty = typeof values.emptyPct === "string" ? parseFloat(values.emptyPct) || 0 : values.emptyPct;
  const dz = typeof values.deadZoneCm === "string" ? parseFloat(values.deadZoneCm) || 0 : values.deadZoneCm;

  const thErrors = useMemo(() => validateThresholds(warn, crit, empty), [warn, crit, empty]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div>
        <label htmlFor="wizard-warn" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
          Warning low threshold (%) *
        </label>
        <input
          id="wizard-warn"
          type="number"
          min={1}
          max={99}
          value={values.warnPct}
          onChange={(e) => onChange({ warnPct: parseFloat(e.target.value) || 0 })}
          className="field"
          style={{ width: "100%", marginTop: "4px" }}
        />
        <div style={{ fontSize: "11px", color: "var(--tx-quiet)", marginTop: "2px" }}>Default 40%</div>
        {(errors?.warnPct || thErrors.warnError) && (
          <div style={{ color: "var(--err-tx)", fontSize: "12px", marginTop: "2px" }}>
            {errors?.warnPct ?? thErrors.warnError}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="wizard-crit" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
          Critical low threshold (%) *
        </label>
        <input
          id="wizard-crit"
          type="number"
          min={1}
          max={99}
          value={values.critPct}
          onChange={(e) => onChange({ critPct: parseFloat(e.target.value) || 0 })}
          className="field"
          style={{ width: "100%", marginTop: "4px" }}
        />
        <div style={{ fontSize: "11px", color: "var(--tx-quiet)", marginTop: "2px" }}>Default 20%</div>
        {(errors?.critPct || thErrors.critError) && (
          <div style={{ color: "var(--err-tx)", fontSize: "12px", marginTop: "2px" }}>
            {errors?.critPct ?? thErrors.critError}
          </div>
        )}
      </div>

      <div>
        <label htmlFor="wizard-empty" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
          Emergency empty threshold (%) *
        </label>
        <input
          id="wizard-empty"
          type="number"
          min={1}
          max={99}
          value={values.emptyPct}
          onChange={(e) => onChange({ emptyPct: parseFloat(e.target.value) || 0 })}
          className="field"
          style={{ width: "100%", marginTop: "4px" }}
        />
        <div style={{ fontSize: "11px", color: "var(--tx-quiet)", marginTop: "2px" }}>Default 5%</div>
        {(errors?.emptyPct || thErrors.emptyError) && (
          <div style={{ color: "var(--err-tx)", fontSize: "12px", marginTop: "2px" }}>
            {errors?.emptyPct ?? thErrors.emptyError}
          </div>
        )}
      </div>

      <div style={{ background: "var(--bg-subtle)", padding: "var(--sp-4)", borderRadius: "var(--r-md)", border: "1px solid var(--bd-soft)" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--tx-quiet)", textTransform: "uppercase" }}>
          Overflow Risk Level (Automatic)
        </div>
        <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--tx-main)", marginTop: "2px" }}>
          {dz + 10} cm <span style={{ fontSize: "11px", fontWeight: 400, color: "var(--tx-quiet)" }}>(dead zone + 10 cm margin)</span>
        </div>
      </div>
    </div>
  );
}

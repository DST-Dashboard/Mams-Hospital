"use client";

import type { TankFormValues } from "@/lib/validation";

interface IdentityStepProps {
  values: TankFormValues;
  onChange: (vals: Partial<TankFormValues>) => void;
  errors?: Record<string, string>;
}

export function IdentityStep({ values, onChange, errors }: IdentityStepProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div>
        <label htmlFor="wizard-label" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
          Node / Tank Label *
        </label>
        <input
          id="wizard-label"
          type="text"
          value={values.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="e.g. Tank 6 · Cardiology Wing"
          className="field"
          style={{ width: "100%", marginTop: "4px" }}
        />
        {errors?.label && <div style={{ color: "var(--err-tx)", fontSize: "12px", marginTop: "2px" }}>{errors.label}</div>}
      </div>

      <div>
        <label htmlFor="wizard-eui" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
          Device EUI (16 hex characters)
        </label>
        <input
          id="wizard-eui"
          type="text"
          maxLength={16}
          value={values.deviceId ?? ""}
          onChange={(e) => onChange({ deviceId: e.target.value.toLowerCase() })}
          placeholder="e.g. 2cf7f1c044300006"
          className="field"
          style={{ width: "100%", marginTop: "4px", fontFamily: "var(--f-mono)" }}
        />
        <div style={{ fontSize: "11px", color: "var(--tx-quiet)", marginTop: "2px" }}>
          Leave blank to save as a draft without hardware linking.
        </div>
        {errors?.deviceId && <div style={{ color: "var(--err-tx)", fontSize: "12px", marginTop: "2px" }}>{errors.deviceId}</div>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)" }}>
        <div>
          <label htmlFor="wizard-zone" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
            Building / Zone
          </label>
          <input
            id="wizard-zone"
            type="text"
            value={values.zone ?? ""}
            onChange={(e) => onChange({ zone: e.target.value })}
            placeholder="e.g. Block A"
            className="field"
            style={{ width: "100%", marginTop: "4px" }}
          />
        </div>

        <div>
          <label htmlFor="wizard-location" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
            Location Detail
          </label>
          <input
            id="wizard-location"
            type="text"
            value={values.location ?? ""}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="e.g. Rooftop, West Tank Bay"
            className="field"
            style={{ width: "100%", marginTop: "4px" }}
          />
        </div>
      </div>
    </div>
  );
}

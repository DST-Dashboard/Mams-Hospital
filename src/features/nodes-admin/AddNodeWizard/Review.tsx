"use client";

import { useMemo } from "react";
import { capacityLitres, type TankFormValues } from "@/lib/validation";

interface ReviewStepProps {
  values: TankFormValues;
}

export function ReviewStep({ values }: ReviewStepProps) {
  const h = typeof values.heightCm === "string" ? parseFloat(values.heightCm) || 0 : values.heightCm;
  const r = typeof values.radiusCm === "string" ? parseFloat(values.radiusCm) || 0 : values.radiusCm ?? 0;
  const w = typeof values.widthCm === "string" ? parseFloat(values.widthCm) || 0 : values.widthCm ?? 0;
  const l = typeof values.lengthCm === "string" ? parseFloat(values.lengthCm) || 0 : values.lengthCm ?? 0;

  const estimatedCapacity = useMemo(() => {
    return capacityLitres(values.shape, h, values.shape === "cylinder" ? r : w, l);
  }, [values.shape, h, r, w, l]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <p style={{ margin: 0, fontSize: "14px", color: "var(--tx-body)" }}>
        Review hardware identity, physical dimensions and thresholds before commissioning.
      </p>

      <div className="ops-dl-grid" style={{ background: "var(--bg-subtle)", padding: "var(--sp-4)", borderRadius: "var(--r-md)" }}>
        <div className="ops-dl-dt">Node Label</div>
        <div className="ops-dl-dd"><strong>{values.label}</strong></div>

        <div className="ops-dl-dt">Device EUI</div>
        <div className="ops-dl-dd" style={{ fontFamily: "var(--f-mono)" }}>
          {values.deviceId || "None (Draft Node)"}
        </div>

        <div className="ops-dl-dt">Zone / Location</div>
        <div className="ops-dl-dd">{values.zone || "—"} / {values.location || "—"}</div>

        <div className="ops-dl-dt">Geometry</div>
        <div className="ops-dl-dd">
          {values.shape === "cylinder" ? `Cylinder (H ${h} cm, R ${r} cm)` : `Rectangle (${w} × ${l} × ${h} cm)`}
        </div>

        <div className="ops-dl-dt">Estimated Capacity</div>
        <div className="ops-dl-dd"><strong>{estimatedCapacity.toLocaleString()} Litres</strong></div>

        <div className="ops-dl-dt">Thresholds</div>
        <div className="ops-dl-dd">
          Warn {values.warnPct}% · Crit {values.critPct}% · Empty {values.emptyPct}%
        </div>
      </div>
    </div>
  );
}

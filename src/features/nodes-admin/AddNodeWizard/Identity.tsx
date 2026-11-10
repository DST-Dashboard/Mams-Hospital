"use client";

import React from "react";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import type { AddNodeWizardData } from "./types";

export function IdentityStep({
  data,
  onChange,
}: {
  data: AddNodeWizardData;
  onChange: (patch: Partial<AddNodeWizardData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ink">Step 1: Node Identification</h3>
        <p className="text-xs text-muted">
          Provide human-readable identification and hardware binding for this water tank node.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        <Field label="Tank Label" hint="Friendly display name (e.g. Tank 6, ICU Buffer Tank)" required>
          <input
            type="text"
            value={data.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="e.g. Tank 6"
            className="field text-sm font-medium"
            required
            autoFocus
          />
        </Field>

        <Field label="Hardware Device ID" hint="The Things Stack Device ID (e.g. wio-e5-node-06)">
          <input
            type="text"
            value={data.deviceId}
            onChange={(e) => onChange({ deviceId: e.target.value })}
            placeholder="e.g. wio-e5-node-06"
            className="field font-mono text-sm"
          />
        </Field>

        <Field label="Hospital Zone" hint="Ward block or section of facility">
          <input
            type="text"
            value={data.zone}
            onChange={(e) => onChange({ zone: e.target.value })}
            placeholder="e.g. Block C / Emergency Wing"
            className="field text-sm"
          />
        </Field>

        <Field label="Physical Location" hint="Specific tank placement on site">
          <input
            type="text"
            value={data.location}
            onChange={(e) => onChange({ location: e.target.value })}
            placeholder="e.g. North Rooftop Tank Tower"
            className="field text-sm"
          />
        </Field>

        <Field label="Initial Operational Status">
          <Select
            value={data.status}
            onChange={(e) => onChange({ status: e.target.value as AddNodeWizardData["status"] })}
            options={[
              { value: "active", label: "Active — Ingesting Live Sensor Telemetry" },
              { value: "draft", label: "Draft — Staging / Initial Configuration" },
              { value: "maintenance", label: "Maintenance — Alarms Temporarily Suppressed" },
            ]}
          />
        </Field>
      </div>
    </div>
  );
}

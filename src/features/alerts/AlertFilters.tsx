"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ICON } from "@/components/ui/icons";
import { PHASE_1_ALERT_TYPES, type Severity } from "./registry";

export interface AlertFilterValues {
  severity?: Severity | "all";
  state?: "all" | "open" | "acknowledged" | "resolved";
  tankId?: number | "all";
  type?: string | "all";
  from?: string;
  to?: string;
}

interface AlertFiltersProps {
  values: AlertFilterValues;
  tanks: { id: number; label: string }[];
  onChange: (vals: AlertFilterValues) => void;
  onReset: () => void;
}

export function AlertFilters({ values, tanks, onChange, onReset }: AlertFiltersProps) {
  const [local, setLocal] = useState<AlertFilterValues>(values);

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onChange(local);
  };

  const handleReset = () => {
    const cleared: AlertFilterValues = {
      severity: "all",
      state: "all",
      tankId: "all",
      type: "all",
      from: "",
      to: "",
    };
    setLocal(cleared);
    onReset();
  };

  return (
    <form onSubmit={handleApply} className="ops-filter-bar" role="search" aria-label="Filter alerts">
      <div className="ops-filter-group">
        <label htmlFor="filter-severity" className="ops-filter-label">
          Level
        </label>
        <Select
          id="filter-severity"
          value={local.severity ?? "all"}
          onChange={(e) => setLocal({ ...local, severity: e.target.value as AlertFilterValues["severity"] })}
          options={[
            { value: "all", label: "All levels" },
            { value: "emergency", label: "Emergency" },
            { value: "critical", label: "Critical" },
            { value: "warning", label: "Warning" },
            { value: "info", label: "Info" },
          ]}
        />
      </div>

      <div className="ops-filter-group">
        <label htmlFor="filter-state" className="ops-filter-label">
          State
        </label>
        <Select
          id="filter-state"
          value={local.state ?? "all"}
          onChange={(e) => setLocal({ ...local, state: e.target.value as AlertFilterValues["state"] })}
          options={[
            { value: "all", label: "All states" },
            { value: "open", label: "Open / Active" },
            { value: "acknowledged", label: "Acknowledged" },
            { value: "resolved", label: "Resolved" },
          ]}
        />
      </div>

      <div className="ops-filter-group">
        <label htmlFor="filter-tank" className="ops-filter-label">
          Tank
        </label>
        <Select
          id="filter-tank"
          value={local.tankId ? String(local.tankId) : "all"}
          onChange={(e) => {
            const v = e.target.value;
            setLocal({ ...local, tankId: v === "all" ? "all" : parseInt(v, 10) });
          }}
          options={[
            { value: "all", label: "All tanks" },
            ...tanks.map((t) => ({ value: String(t.id), label: t.label })),
          ]}
        />
      </div>

      <div className="ops-filter-group">
        <label htmlFor="filter-type" className="ops-filter-label">
          Type
        </label>
        <Select
          id="filter-type"
          value={local.type ?? "all"}
          onChange={(e) => setLocal({ ...local, type: e.target.value })}
          options={[
            { value: "all", label: "All types" },
            ...PHASE_1_ALERT_TYPES.map((t) => ({ value: t.type, label: t.title })),
          ]}
        />
      </div>

      <div style={{ display: "flex", gap: "var(--sp-2)", marginLeft: "auto", alignSelf: "flex-end" }}>
        <Button variant="outline" size="sm" type="button" onClick={handleReset}>
          Reset
        </Button>
        <Button variant="primary" size="sm" type="submit" icon={ICON.filter}>
          Apply filters
        </Button>
      </div>
    </form>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, Banner, Switch } from "@/components/ui/primitives";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { TankSvg } from "@/components/tank/TankSvg";
import { useTanks, useMe } from "@/lib/hooks";
import { patch, tankToInput } from "@/lib/api";
import { canMutateTanks } from "@/lib/roles";
import { validateThresholds } from "@/lib/validation";
import { ICON } from "@/components/ui/icons";


export function ThresholdForm() {
  const toast = useToast();
  const { data: me } = useMe();
  const { data: tanks, isLoading, mutate } = useTanks();

  const [selectedId, setSelectedId] = useState<number>(1);
  const [warnPct, setWarnPct] = useState<number>(40);
  const [critPct, setCritPct] = useState<number>(20);
  const [emptyPct, setEmptyPct] = useState<number>(5);
  const [maintenance, setMaintenance] = useState<boolean>(false);
  const [busy, setBusy] = useState(false);

  const selectedTank = useMemo(() => {
    return tanks?.find((t) => t.id === selectedId) ?? tanks?.[0];
  }, [tanks, selectedId]);

  useEffect(() => {
    if (selectedTank) {
      setWarnPct(selectedTank.thresholds?.warnPct ?? 40);
      setCritPct(selectedTank.thresholds?.critPct ?? 20);
      setEmptyPct(selectedTank.thresholds?.emptyPct ?? 5);
      setMaintenance(selectedTank.status === "maintenance");
    }
  }, [selectedTank]);

  const isAdmin = canMutateTanks(me?.role);

  // Validation
  const errors = useMemo(() => {
    return validateThresholds(warnPct, critPct, emptyPct);
  }, [warnPct, critPct, emptyPct]);

  const handleMaintenanceToggle = async (checked: boolean) => {
    if (!selectedTank || !isAdmin) return;
    setMaintenance(checked);
    try {
      const nextStatus = checked ? "maintenance" : "active";
      const payload = tankToInput(selectedTank, { status: nextStatus });
      await patch(`/api/tanks/${selectedTank.id}`, payload);
      toast.success(`${selectedTank.label} set to ${nextStatus}.`);
      mutate();
    } catch {
      toast.error("Failed to update tank maintenance mode.");
      setMaintenance(!checked);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTank || !isAdmin) return;

    if (errors.general) {
      toast.error(errors.general);
      return;
    }

    try {
      setBusy(true);
      const payload = tankToInput(selectedTank, {
        warnPct,
        critPct,
        emptyPct,
      });
      await patch(`/api/tanks/${selectedTank.id}`, payload);
      toast.success(`Thresholds saved for ${selectedTank.label}.`);
      mutate();
    } catch {
      toast.error("Failed to update thresholds.");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !selectedTank) {
    return (
      <Card title="Alert Thresholds">
        <div style={{ padding: "var(--sp-6)", color: "var(--tx-quiet)" }}>Loading configuration...</div>
      </Card>
    );
  }

  const overflowCm = (selectedTank.geometry?.deadZoneCm ?? 25) + 10;

  return (
    <Card
      id="thresholds"
      eyebrow={{ icon: ICON.bell, text: "SAFETY LIMITS" }}
      title="Alert Thresholds & Limits"
      footnote="Critical fires after 3 consecutive readings (≈ 15 min) and repeats at most every 30 min."
    >
      {!isAdmin && (
        <Banner tone="info">
          Changing thresholds needs Admin permission (backend). You are viewing operational settings as an Operator.
        </Banner>
      )}

      {/* Tank Select */}
      <div style={{ marginBottom: "var(--sp-5)", maxWidth: "300px" }}>
        <label htmlFor="settings-tank-select" style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--tx-label)", marginBottom: "var(--sp-1)" }}>
          Select Tank
        </label>
        <Select
          id="settings-tank-select"
          value={String(selectedTank.id)}
          onChange={(e) => setSelectedId(parseInt(e.target.value, 10))}
          options={(tanks ?? []).map((t) => ({ value: String(t.id), label: t.label }))}
        />
      </div>

      <form onSubmit={handleSave} className="ops-threshold-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
          {/* Warning */}
          <div>
            <label htmlFor="thresh-warn" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tx-label)" }}>
              Warning low threshold (%)
            </label>
            <input
              id="thresh-warn"
              type="number"
              min={1}
              max={99}
              value={warnPct}
              onChange={(e) => setWarnPct(parseFloat(e.target.value) || 0)}
              disabled={!isAdmin || busy}
              className="field"
              style={{ width: "100%", marginTop: "4px" }}
            />
            {errors.warnError && <div style={{ color: "var(--err-tx)", fontSize: "12px", marginTop: "2px" }}>{errors.warnError}</div>}
          </div>

          {/* Critical */}
          <div>
            <label htmlFor="thresh-crit" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tx-label)" }}>
              Critical low threshold (%)
            </label>
            <input
              id="thresh-crit"
              type="number"
              min={1}
              max={99}
              value={critPct}
              onChange={(e) => setCritPct(parseFloat(e.target.value) || 0)}
              disabled={!isAdmin || busy}
              className="field"
              style={{ width: "100%", marginTop: "4px" }}
            />
            {errors.critError && <div style={{ color: "var(--err-tx)", fontSize: "12px", marginTop: "2px" }}>{errors.critError}</div>}
          </div>

          {/* Emergency */}
          <div>
            <label htmlFor="thresh-empty" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tx-label)" }}>
              Emergency empty threshold (%)
            </label>
            <input
              id="thresh-empty"
              type="number"
              min={1}
              max={99}
              value={emptyPct}
              onChange={(e) => setEmptyPct(parseFloat(e.target.value) || 0)}
              disabled={!isAdmin || busy}
              className="field"
              style={{ width: "100%", marginTop: "4px" }}
            />
            {errors.emptyError && <div style={{ color: "var(--err-tx)", fontSize: "12px", marginTop: "2px" }}>{errors.emptyError}</div>}
          </div>

          {/* Read-only system thresholds */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--sp-4)", background: "var(--bg-subtle)", padding: "var(--sp-4)", borderRadius: "var(--r-md)" }}>
            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--tx-quiet)", textTransform: "uppercase" }}>
                Overflow risk (auto)
              </span>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--tx-main)" }}>
                {overflowCm} cm <span style={{ fontSize: "11px", fontWeight: 400, color: "var(--tx-quiet)" }}>(dead zone + 10 cm)</span>
              </div>
            </div>

            <div>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--tx-quiet)", textTransform: "uppercase" }}>
                Persistence / Cooldown
              </span>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--tx-main)" }}>
                3 readings · 30 min
              </div>
            </div>
          </div>

          {/* Maintenance mode switch */}
          <div style={{ borderTop: "1px solid var(--bd-soft)", paddingTop: "var(--sp-4)" }}>
            <Switch
              checked={maintenance}
              onChange={handleMaintenanceToggle}
              disabled={!isAdmin || busy}
              label="Maintenance Mode"
              hint="Suppresses alerts during cleaning or maintenance, while continuing telemetry logging."
            />
          </div>

          {isAdmin && (
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-3)", marginTop: "var(--sp-2)" }}>
              <Button variant="primary" type="submit" loading={busy} icon={ICON.edit}>
                Save thresholds
              </Button>
            </div>
          )}
        </div>

        {/* Live Mini Tank SVG Preview */}
        <div className="ops-mini-tank-preview">
          <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--tx-head)", marginBottom: "var(--sp-3)" }}>
            Live Threshold Preview
          </div>
          <TankSvg
            shape={(selectedTank.geometry?.shape?.kind as "cylinder" | "rectangle") ?? "cylinder"}
            levelPct={50}
            distanceCm={150}
            heightCm={selectedTank.geometry?.heightCm ?? 300}
            deadZoneCm={selectedTank.geometry?.deadZoneCm ?? 25}
            thresholds={{
              warnPct,
              critPct,
              emptyPct,
            }}
            state={maintenance ? "maintenance" : "ok"}
            size="mini"
            label={selectedTank.label}
          />
          <div style={{ fontSize: "11px", color: "var(--tx-quiet)", marginTop: "var(--sp-2)", textAlign: "center" }}>
            Ticks on left update as you adjust thresholds
          </div>
        </div>
      </form>
    </Card>
  );
}

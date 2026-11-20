"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Activity, Database, Droplet, Info, Radio, Ruler, ShieldAlert } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { useApi, useDashboard, useMe } from "@/lib/hooks";
import { post } from "@/lib/api";
import { fmtCm, fmtFill, fmtLitres } from "@/lib/format";
import { volumeLitres, type TankGeometry } from "@/domain";
import { derive } from "@/domain/derive";
import { useUi } from "@/lib/store";

export interface AuthorizedTankSummary {
  id: number;
  label: string;
  deviceId: string | null;
  location: string | null;
  zone: string | null;
  status: string;
  geometry: TankGeometry;
}

export interface ManualDataEntryModalProps {
  open: boolean;
  onClose: () => void;
  preselectedTankId?: number;
  onSuccess?: () => void;
}

function toLocalDatetimeString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yr = date.getFullYear();
  const mo = pad(date.getMonth() + 1);
  const da = pad(date.getDate());
  const hr = pad(date.getHours());
  const mi = pad(date.getMinutes());
  return `${yr}-${mo}-${da}T${hr}:${mi}`;
}

export function ManualDataEntryModal({
  open,
  onClose,
  preselectedTankId,
  onSuccess,
}: ManualDataEntryModalProps) {
  const toast = useToast();
  const tz = useUi((s) => s.tz);
  const { data: me } = useMe();
  const { mutate: mutateDashboard } = useDashboard();
  const { data: authData, isLoading: authLoading } = useApi<{ tanks: AuthorizedTankSummary[] }>(
    open ? "/api/readings?action=authorized-tanks" : null
  );

  const authorizedTanks = useMemo(() => {
    return authData?.tanks ?? [];
  }, [authData]);

  const [tankId, setTankId] = useState<number>(preselectedTankId ?? 1);
  const [datetimeStr, setDatetimeStr] = useState<string>("");
  const [distanceInput, setDistanceInput] = useState<string>("");
  const [levelInput, setLevelInput] = useState<string>("");
  const [batteryInput, setBatteryInput] = useState<string>("100");
  const [rssiInput, setRssiInput] = useState<string>("-80");
  const [snrInput, setSnrInput] = useState<string>("9.0");
  const [notes, setNotes] = useState<string>("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<boolean>(false);

  // Initialize or reset form on open
  useEffect(() => {
    if (open) {
      setDatetimeStr(toLocalDatetimeString(new Date()));
      setDistanceInput("");
      setLevelInput("");
      setBatteryInput("100");
      setRssiInput("-80");
      setSnrInput("9.0");
      setNotes("");
      setFieldErrors({});

      if (preselectedTankId && authorizedTanks.some((t) => t.id === preselectedTankId)) {
        setTankId(preselectedTankId);
      } else if (authorizedTanks.length > 0) {
        setTankId(authorizedTanks[0].id);
      }
    }
  }, [open, preselectedTankId, authorizedTanks]);

  const currentTank = useMemo(() => {
    return authorizedTanks.find((t) => t.id === tankId);
  }, [authorizedTanks, tankId]);

  const geometry: TankGeometry = useMemo(
    () =>
      currentTank?.geometry ?? {
        heightCm: 300,
        deadZoneCm: 25,
        shape: { kind: "cylinder", radiusCm: 100 },
      },
    [currentTank]
  );

  const totalCapacityL = Math.round(volumeLitres(geometry.shape, geometry.heightCm));

  // Interactive bidirectional derivation
  const handleDistanceChange = (valStr: string) => {
    setDistanceInput(valStr);
    const dVal = parseFloat(valStr);
    if (!isNaN(dVal) && dVal >= 0 && dVal <= geometry.heightCm) {
      const derivedLvl = geometry.heightCm - dVal;
      setLevelInput(String(Math.round(derivedLvl * 10) / 10));
      setFieldErrors((prev) => ({ ...prev, distance: "", level: "" }));
    } else {
      setLevelInput("");
    }
  };

  const handleLevelChange = (valStr: string) => {
    setLevelInput(valStr);
    const lVal = parseFloat(valStr);
    if (!isNaN(lVal) && lVal >= 0 && lVal <= geometry.heightCm) {
      const derivedDist = geometry.heightCm - lVal;
      setDistanceInput(String(Math.round(derivedDist * 10) / 10));
      setFieldErrors((prev) => ({ ...prev, distance: "", level: "" }));
    } else {
      setDistanceInput("");
    }
  };

  // Derived preview data
  const derivedMetrics = useMemo(() => {
    const dist = parseFloat(distanceInput);
    if (isNaN(dist) || dist < 0 || dist > geometry.heightCm) {
      return null;
    }
    return derive(dist, geometry);
  }, [distanceInput, geometry]);

  const isViewer = me?.role === "viewer";
  const hasNoAuthorizedTanks = !authLoading && authorizedTanks.length === 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentTank) {
      toast.error("Please select a valid tank.");
      return;
    }

    const errors: Record<string, string> = {};

    const dist = parseFloat(distanceInput);
    if (isNaN(dist)) {
      errors.distance = "Distance or water level is required.";
    } else if (dist < 0) {
      errors.distance = "Distance cannot be negative.";
    } else if (dist > geometry.heightCm) {
      errors.distance = `Distance cannot exceed tank height (${geometry.heightCm} cm).`;
    }

    if (!datetimeStr) {
      errors.datetime = "Measurement time is required.";
    }

    const epochMs = datetimeStr ? new Date(datetimeStr).getTime() : Date.now();
    if (epochMs > Date.now() + 60_000) {
      errors.datetime = "Measurement timestamp cannot be in the future.";
    }

    const battery = batteryInput !== "" ? parseFloat(batteryInput) : null;
    if (battery !== null && (isNaN(battery) || battery < 0 || battery > 100)) {
      errors.battery = "Battery percentage must be between 0 and 100%.";
    }

    const rssi = rssiInput !== "" ? parseFloat(rssiInput) : null;
    if (rssi !== null && (isNaN(rssi) || rssi < -150 || rssi > 0)) {
      errors.rssi = "RSSI must be between -150 and 0 dBm.";
    }

    const snr = snrInput !== "" ? parseFloat(snrInput) : null;
    if (snr !== null && (isNaN(snr) || snr < -30 || snr > 30)) {
      errors.snr = "SNR must be between -30 and 30 dB.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      setBusy(true);
      await post("/api/readings", {
        tankId,
        t: epochMs,
        distanceCm: Math.round(dist * 10) / 10,
        batteryPct: battery != null ? Math.round(battery) : null,
        rssi: rssi != null ? Math.round(rssi) : null,
        snr: snr != null ? Math.round(snr * 10) / 10 : null,
        notes: notes.trim() || undefined,
      });

      toast.success(`Manual reading recorded for ${currentTank.label}.`);
      await mutateDashboard();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "error" in err
          ? String((err as { error: unknown }).error)
          : "Failed to record manual reading.";
      toast.error(errorMsg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Manual Telemetry Data Entry"
      eyebrow={{ icon: Droplet, text: "OHTMS DATA MODULE" }}
      size="lg"
    >
      {isViewer || hasNoAuthorizedTanks ? (
        <div className="p-6 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--warn-bg)] flex items-center justify-center text-[var(--warn-tx)]">
            <ShieldAlert size={24} />
          </div>
          <h4 className="text-[17px] font-bold text-[var(--tx-head)]">Access Restricted</h4>
          <p className="text-[13px] text-[var(--tx-quiet)] max-w-md">
            {isViewer
              ? "Your account role (Viewer) is read-only. Only hospital administrators and assigned tank owners have permission to submit manual sensor entries."
              : "You are not assigned as a tank owner for any water tanks. Contact a hospital administrator to assign tank ownership permissions."}
          </p>
          <Button variant="outline" onClick={onClose} className="mt-2">
            Close
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Section 1: Tank & Association */}
          <div className="space-y-4">
            <div className="border-b border-[var(--bd-soft)] pb-2 flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--accent-500)] flex items-center gap-1.5">
                <Database size={13} />
                <span>1. Tank & Observation Time</span>
              </span>
              <span className="text-[11px] text-[var(--tx-quiet)] font-mono">
                {currentTank?.deviceId ? `Device: ${currentTank.deviceId}` : "No sensor linked"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Target Tank" required hint={currentTank?.location ?? "Hospital Rooftop"}>
                <Select
                  value={String(tankId)}
                  onChange={(e) => setTankId(Number(e.target.value))}
                  options={authorizedTanks.map((t) => ({
                    value: String(t.id),
                    label: `${t.label}${t.location ? ` (${t.location})` : ""}`,
                  }))}
                />
              </Field>

              <Field
                label={`Measurement Time (${tz})`}
                required
                hint="Observation timestamp (cannot be future)"
                error={fieldErrors.datetime}
              >
                <input
                  type="datetime-local"
                  value={datetimeStr}
                  onChange={(e) => {
                    setDatetimeStr(e.target.value);
                    setFieldErrors((prev) => ({ ...prev, datetime: "" }));
                  }}
                  className="input font-mono text-[13px] w-full"
                  required
                />
              </Field>
            </div>
          </div>

          {/* Section 2: Water & Level Measurements (Primary) */}
          <div className="space-y-4">
            <div className="border-b border-[var(--bd-soft)] pb-2 flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--accent-500)] flex items-center gap-1.5">
                <Ruler size={13} />
                <span>2. Water Level & Depth Telemetry</span>
              </span>
              <span className="text-[11px] text-[var(--tx-quiet)]">
                Tank Height: {geometry.heightCm} cm · Dead Zone: {geometry.deadZoneCm} cm
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Distance to water"
                unit="cm"
                required
                hint="Sensor face down to water surface (0 - Height)"
                error={fieldErrors.distance}
              >
                <input
                  type="number"
                  step="any"
                  min={0}
                  max={geometry.heightCm}
                  placeholder={`e.g. 120`}
                  value={distanceInput}
                  onChange={(e) => handleDistanceChange(e.target.value)}
                  className="input font-mono text-[14px] w-full"
                  required
                />
              </Field>

              <Field
                label="Water depth (Level)"
                unit="cm"
                hint="Liquid depth from floor (Level = Height − Distance)"
                error={fieldErrors.level}
              >
                <input
                  type="number"
                  step="any"
                  min={0}
                  max={geometry.heightCm}
                  placeholder={`e.g. 180`}
                  value={levelInput}
                  onChange={(e) => handleLevelChange(e.target.value)}
                  className="input font-mono text-[14px] w-full"
                />
              </Field>
            </div>

            {/* Derived Preview Card mirroring ReadingCard */}
            {derivedMetrics && (
              <div className="p-4 bg-[var(--bg-subtle)] rounded-xl border border-[var(--bd-soft)] space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-[var(--accent-500)]" />
                    <span className="text-[12px] font-bold text-[var(--tx-head)]">
                      DERIVED REAL-TIME TELEMETRY PREVIEW
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      derivedMetrics.quality === "ok"
                        ? "bg-[var(--ok-bg)] text-[var(--ok-tx)]"
                        : "bg-[var(--warn-bg)] text-[var(--warn-tx)]"
                    }`}
                  >
                    {derivedMetrics.quality === "ok" ? "Valid Reading" : "Sensor Dead Zone"}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[var(--tx-quiet)] font-medium">Usable Fill %</span>
                    <span className="num text-[18px] font-black text-[var(--tx-head)] mt-0.5">
                      {fmtFill(derivedMetrics.levelPct)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[var(--tx-quiet)] font-medium">Water Depth</span>
                    <span className="num text-[18px] font-bold text-[var(--tx-head)] mt-0.5">
                      {fmtCm(derivedMetrics.levelCm)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[var(--tx-quiet)] font-medium">Water Volume</span>
                    <span className="num text-[18px] font-bold text-[var(--brand-800)] mt-0.5">
                      {fmtLitres(derivedMetrics.volumeL)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-[var(--tx-quiet)] font-medium">Total Capacity</span>
                    <span className="num text-[18px] font-bold text-[var(--tx-head)] mt-0.5">
                      {fmtLitres(totalCapacityL)}
                    </span>
                  </div>
                </div>

                {derivedMetrics.quality === "dead_zone" && (
                  <div className="flex items-center gap-2 text-[11.5px] text-[var(--warn-tx)] bg-[var(--warn-bg)]/40 p-2 rounded-lg">
                    <Info size={14} className="flex-shrink-0" />
                    <span>
                      Reading is inside the {geometry.deadZoneCm} cm sensor dead zone. High-water or overflow condition possible.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Telemetry & RF Signal (Secondary/Optional) */}
          <div className="space-y-4">
            <div className="border-b border-[var(--bd-soft)] pb-2 flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--accent-500)] flex items-center gap-1.5">
                <Radio size={13} />
                <span>3. Transmitter & Environmental Health (Optional)</span>
              </span>
              <span className="text-[11px] text-[var(--tx-quiet)]">RF & Battery Telemetry</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field
                label="Battery Level"
                unit="%"
                hint="Node battery percentage (0 - 100)"
                error={fieldErrors.battery}
              >
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={batteryInput}
                  onChange={(e) => setBatteryInput(e.target.value)}
                  className="input font-mono text-[13px] w-full"
                />
              </Field>

              <Field
                label="RSSI Signal"
                unit="dBm"
                hint="Gateway signal strength (-120 to -30)"
                error={fieldErrors.rssi}
              >
                <input
                  type="number"
                  min={-150}
                  max={0}
                  value={rssiInput}
                  onChange={(e) => setRssiInput(e.target.value)}
                  className="input font-mono text-[13px] w-full"
                />
              </Field>

              <Field
                label="Signal-to-Noise (SNR)"
                unit="dB"
                hint="Link SNR ratio (-20 to 15)"
                error={fieldErrors.snr}
              >
                <input
                  type="number"
                  step="any"
                  min={-30}
                  max={30}
                  value={snrInput}
                  onChange={(e) => setSnrInput(e.target.value)}
                  className="input font-mono text-[13px] w-full"
                />
              </Field>
            </div>
          </div>

          {/* Section 4: Operational Audit Notes */}
          <div className="space-y-2">
            <Field
              label="Operator Audit Notes / Reason"
              hint="Audit log explanation (e.g. routine physical dipstick verification, sensor recalibration)"
            >
              <textarea
                rows={2}
                maxLength={500}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Manual dipstick reading taken during shift handover; cross-checked against ultrasonic node."
                className="input text-[13px] w-full resize-none"
              />
            </Field>
          </div>

          {/* Footer Controls */}
          <div className="pt-4 border-t border-[var(--bd-soft)] flex items-center justify-between">
            <span className="text-[11px] text-[var(--tx-quiet)] flex items-center gap-1">
              <Info size={12} />
              <span>Record will be tagged with source: <strong>manual</strong>.</span>
            </span>

            <div className="flex items-center gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={busy} disabled={busy}>
                Submit Reading
              </Button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
}

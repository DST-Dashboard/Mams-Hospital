"use client";

import React, { useState, useEffect } from "react";
import { PlusCircle, Calendar, AlertCircle, Droplets } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, Input } from "@/components/ui/Field";
import { Select } from "@/components/ui/Select";
import { get, post, ApiError } from "@/lib/api";
import { useDashboard } from "@/lib/hooks";
import { useToast } from "@/components/ui/Toast";

interface PermittedTank {
  id: number;
  label: string;
  deviceId: string | null;
  heightCm: number;
  deadZoneCm: number;
  status: string;
}

interface ManualEntryResponse {
  permittedTanks: PermittedTank[];
  canSubmit: boolean;
  role: string;
}

interface ManualEntryDialogProps {
  open: boolean;
  onClose: () => void;
  defaultTankId?: number;
}

export function ManualEntryDialog({ open, onClose, defaultTankId }: ManualEntryDialogProps) {
  const { mutate: refreshDashboard } = useDashboard();
  const toast = useToast();

  const [tanks, setTanks] = useState<PermittedTank[]>([]);
  const [canSubmit, setCanSubmit] = useState(false);
  const [loadingTanks, setLoadingTanks] = useState(true);

  const [selectedTankId, setSelectedTankId] = useState<number>(defaultTankId ?? 1);
  const [distanceCm, setDistanceCm] = useState<string>("");
  const [batteryPct, setBatteryPct] = useState<string>("");
  const [customTime, setCustomTime] = useState<boolean>(false);
  const [timestampStr, setTimestampStr] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Load permitted tanks for the current user
  useEffect(() => {
    if (!open) return;
    setLoadingTanks(true);
    setErrorMsg(null);

    get<ManualEntryResponse>("/api/readings/manual")
      .then((res) => {
        setTanks(res.permittedTanks || []);
        setCanSubmit(res.canSubmit);
        if (res.permittedTanks.length > 0) {
          const match = res.permittedTanks.find((t) => t.id === defaultTankId);
          setSelectedTankId(match ? match.id : res.permittedTanks[0].id);
        }
      })
      .catch(() => {
        setErrorMsg("Failed to load permitted tanks. Please ensure you are signed in.");
        setCanSubmit(false);
      })
      .finally(() => {
        setLoadingTanks(false);
      });
  }, [open, defaultTankId]);

  const selectedTank = tanks.find((t) => t.id === selectedTankId);

  // Live preview calculations based on tank geometry
  const numDist = distanceCm.trim() !== "" ? Number(distanceCm) : null;
  const numBattery = batteryPct.trim() !== "" ? Number(batteryPct) : null;

  let calculatedLevelCm: number | null = null;
  let calculatedLevelPct: number | null = null;

  if (selectedTank && numDist !== null && !isNaN(numDist) && numDist >= 0) {
    calculatedLevelCm = Math.max(0, Math.round((selectedTank.heightCm - numDist) * 10) / 10);
    const usableHeight = selectedTank.heightCm - selectedTank.deadZoneCm;
    if (usableHeight > 0) {
      const usableDepth = selectedTank.heightCm - Math.max(numDist, selectedTank.deadZoneCm);
      calculatedLevelPct = Math.max(0, Math.min(100, Math.round((usableDepth / usableHeight) * 100)));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTank) return;

    if (numDist === null || isNaN(numDist) || numDist < 0) {
      setErrorMsg("Distance must be a valid positive number in centimeters.");
      return;
    }

    if (numBattery !== null && (isNaN(numBattery) || numBattery < 0 || numBattery > 100)) {
      setErrorMsg("Battery percentage must be between 0 and 100.");
      return;
    }

    let t: number | undefined;
    if (customTime && timestampStr) {
      const parsedTime = new Date(timestampStr).getTime();
      if (isNaN(parsedTime)) {
        setErrorMsg("Invalid custom timestamp format.");
        return;
      }
      t = parsedTime;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await post("/api/readings/manual", {
        tankId: selectedTankId,
        distanceCm: Math.round(numDist),
        batteryPct: numBattery !== null ? Math.round(numBattery) : undefined,
        t,
        notes: notes.trim() || undefined,
      });

      toast.success(`Saved ${Math.round(numDist)} cm reading for ${selectedTank.label}`);

      // Refresh SWR caches
      await refreshDashboard();

      // Reset form & close
      setDistanceCm("");
      setBatteryPct("");
      setNotes("");
      setCustomTime(false);
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("Failed to submit manual reading. Please check your connection.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const footerContent = (
    <div className="flex items-center justify-end gap-2 w-full">
      <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
        Cancel
      </Button>
      {canSubmit && tanks.length > 0 && (
        <Button
          type="button"
          variant="primary"
          disabled={submitting || !distanceCm.trim()}
          onClick={handleSubmit}
        >
          {submitting ? "Saving..." : "Record Reading"}
        </Button>
      )}
    </div>
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Manual Sensor Data Entry"
      eyebrow={{ icon: PlusCircle, text: "OPERATIONS" }}
      footer={footerContent}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMsg && (
          <div role="alert" className="banner banner--error text-[13px] flex items-center gap-2 p-3 rounded-lg">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loadingTanks ? (
          <div className="py-6 text-center text-[13px] text-[var(--tx-muted)]">
            Checking tank permissions...
          </div>
        ) : !canSubmit || tanks.length === 0 ? (
          <div className="py-4 text-center space-y-2">
            <p className="text-[14px] text-[var(--tx-head)] font-medium">
              No tanks assigned for manual data entry
            </p>
            <p className="text-[12px] text-[var(--tx-muted)]">
              You must be an administrator or an assigned Tank Owner to enter sensor readings.
            </p>
          </div>
        ) : (
          <>
            {/* Tank Selector */}
            <Field label="Target Tank" htmlFor="tank-select" required hint="Admin: all tanks · Owner: assigned tanks">
              <Select
                id="tank-select"
                value={String(selectedTankId)}
                onChange={(val) => setSelectedTankId(Number(val))}
                options={tanks.map((t) => ({
                  value: String(t.id),
                  label: `${t.label} (H: ${t.heightCm} cm)`,
                }))}
              />
            </Field>

            {/* Distance to Water (Golden Rule) */}
            <Field
              label="Distance to Water Surface (cm)"
              htmlFor="distance-cm"
              required
              hint="Physical measurement from sensor lip to water level"
            >
              <div className="relative">
                <Input
                  id="distance-cm"
                  type="number"
                  step="1"
                  min="0"
                  max={selectedTank ? selectedTank.heightCm + 50 : 3000}
                  placeholder="e.g. 142"
                  value={distanceCm}
                  onChange={(e) => setDistanceCm(e.target.value)}
                  required
                  autoFocus
                />
                <span className="absolute right-3 top-2.5 text-[12px] font-mono text-[var(--tx-muted)]">
                  cm
                </span>
              </div>
            </Field>

            {/* Derived Preview Card */}
            {selectedTank && calculatedLevelPct !== null && (
              <div className="p-3 bg-[var(--bg-subtle)] rounded-xl border border-[var(--bd-soft)] flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2">
                  <Droplets size={18} className="text-[var(--brand-600)]" />
                  <div>
                    <span className="font-bold text-[var(--tx-head)]">{calculatedLevelPct}% Fill</span>
                    <p className="text-[11px] text-[var(--tx-muted)]">
                      Water depth: {calculatedLevelCm} cm
                    </p>
                  </div>
                </div>
                <span className="badge badge--success text-[11px]">Valid Value</span>
              </div>
            )}

            {/* Optional Battery Level */}
            <Field label="Node Battery Level (%)" htmlFor="battery-pct" hint="Optional, 0 to 100%">
              <div className="relative">
                <Input
                  id="battery-pct"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 95"
                  value={batteryPct}
                  onChange={(e) => setBatteryPct(e.target.value)}
                />
                <span className="absolute right-3 top-2.5 text-[12px] font-mono text-[var(--tx-muted)]">
                  %
                </span>
              </div>
            </Field>

            {/* Custom Timestamp Toggle */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setCustomTime(!customTime)}
                className="text-[12px] text-[var(--brand-700)] hover:underline flex items-center gap-1 font-medium"
              >
                <Calendar size={13} />
                <span>{customTime ? "Use Current Time (Now)" : "Specify Historical Timestamp"}</span>
              </button>

              {customTime && (
                <div className="mt-2">
                  <Input
                    type="datetime-local"
                    value={timestampStr}
                    onChange={(e) => setTimestampStr(e.target.value)}
                    required={customTime}
                  />
                </div>
              )}
            </div>

            {/* Notes */}
            <Field label="Observation Notes" htmlFor="reading-notes" hint="Optional maintenance or inspection note">
              <Input
                id="reading-notes"
                type="text"
                placeholder="e.g. Cleaned sensor lens, manual tape check"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={255}
              />
            </Field>
          </>
        )}
      </form>
    </Dialog>
  );
}

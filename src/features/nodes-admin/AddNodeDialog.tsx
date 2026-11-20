"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { post, ApiError } from "@/lib/api";
import { validateTankForm, formToTankInput, type TankFormValues } from "@/lib/validation";
import { ICON } from "@/components/ui/icons";

interface AddNodeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_FORM_VALUES: TankFormValues = {
  label: "",
  deviceId: "",
  zone: "",
  location: "",
  status: "active",
  shape: "cylinder",
  heightCm: 300,
  radiusCm: 100,
  widthCm: 100,
  lengthCm: 100,
  deadZoneCm: 25,
  warnPct: 40,
  critPct: 20,
  emptyPct: 5,
  dimsConfirmed: true,
};

export function AddNodeDialog({ open, onClose, onSuccess }: AddNodeDialogProps) {
  const toast = useToast();
  const [step, setStep] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formValues, setFormValues] = useState<TankFormValues>(DEFAULT_FORM_VALUES);

  // Recipient checkboxes
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySms, setNotifySms] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState("");

  const update = (patch: Partial<TankFormValues>) => {
    setFormValues((prev) => ({ ...prev, ...patch }));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formValues.label.trim()) {
        setFieldErrors({ label: "Enter a tank label." });
        return;
      }
      setFieldErrors({});
    }
    if (step === 2) {
      const h = typeof formValues.heightCm === "string" ? parseFloat(formValues.heightCm) : formValues.heightCm;
      if (!h || h <= 0) {
        setFieldErrors({ heightCm: "Height must be greater than 0 cm." });
        return;
      }
      setFieldErrors({});
    }
    setStep((s) => Math.min(s + 1, 5));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleClose = () => {
    setStep(1);
    setFormValues(DEFAULT_FORM_VALUES);
    setFieldErrors({});
    onClose();
  };

  const handleSubmit = async (desiredStatus: "active" | "draft") => {
    const finalValues: TankFormValues = { ...formValues, status: desiredStatus };
    const valid = validateTankForm(finalValues);
    if (!valid.ok) {
      setFieldErrors(valid.fieldErrors);
      toast.error("Please correct the form errors before activating.");
      return;
    }

    try {
      setBusy(true);
      const payload = formToTankInput(finalValues);
      await post("/api/tanks", payload);
      toast.success(`${finalValues.label} successfully created (${desiredStatus}).`);
      onSuccess();
      handleClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 500) {
        toast.error("The device isn't registered yet. Please check device configuration.");
      } else if (err instanceof ApiError && err.status === 400) {
        const errs = err.fieldErrors();
        setFieldErrors(errs);
        toast.error("Validation error: " + (Object.values(errs)[0] ?? err.message));
      } else {
        toast.error("Failed to commission tank node. Try saving as draft.");
      }
    } finally {
      setBusy(false);
    }
  };

  const stepTitles = ["Identity", "Tank Dimensions", "Thresholds", "Alert Recipients", "Review and Activate"];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Add Rooftop Node (Modal M2)"
      eyebrow={{ icon: ICON.add, text: "HARDWARE COMMISSIONING" }}
      size="lg"
      footer={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
          <div>
            {step > 1 && (
              <Button variant="outline" onClick={handleBack} disabled={busy}>
                Back
              </Button>
            )}
          </div>

          <div style={{ display: "flex", gap: "var(--sp-2)" }}>
            <Button variant="outline" onClick={handleClose} disabled={busy}>
              Cancel
            </Button>

            {step < 5 ? (
              <Button variant="primary" onClick={handleNext}>
                Next: {stepTitles[step]}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleSubmit("draft")} loading={busy}>
                  Save as draft
                </Button>
                <Button variant="primary" onClick={() => handleSubmit("active")} loading={busy} icon={ICON.ok}>
                  Activate now
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const finalValues: TankFormValues = { ...formValues, status: "active" };
                    const valid = validateTankForm(finalValues);
                    if (!valid.ok) {
                      setFieldErrors(valid.fieldErrors);
                      toast.error("Please correct the form errors before activating.");
                      return;
                    }
                    setBusy(true);
                    post("/api/tanks", formToTankInput(finalValues))
                      .then(() => {
                        toast.success(`${finalValues.label} successfully created.`);
                        onSuccess();
                        handleClose();
                      })
                      .catch(() => toast.error("Failed to commission simulated node."))
                      .finally(() => setBusy(false));
                  }}
                  loading={busy}
                >
                  Activate with simulation
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-6)" }}>
        {/* Wizard Stepper Progress */}
        <div className="ops-wizard-stepper">
          {stepTitles.map((t, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            return (
              <div key={t} className={`ops-wizard-step ${isActive ? "ops-wizard-step--active" : ""}`}>
                <div className="ops-wizard-step-num">{stepNum}</div>
                <span>{t}</span>
              </div>
            );
          })}
        </div>

        {/* Step 1: Identity */}
        {step === 1 && (
          <div className="space-y-4">
            <Field label="Tank Label" hint="Friendly display name (e.g. Tank 6, ICU Buffer Tank)" error={fieldErrors.label} required>
              <input
                id="wizard-label"
                type="text"
                value={formValues.label}
                onChange={(e) => update({ label: e.target.value })}
                placeholder="e.g. Tank 6"
                className="field text-sm font-medium w-full"
                required
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Hardware Device ID" hint="Hardware Identifier / Node ID (e.g. node-06)">
                <input
                  type="text"
                  value={formValues.deviceId ?? ""}
                  onChange={(e) => update({ deviceId: e.target.value })}
                  placeholder="e.g. wio-e5-node-06"
                  className="field font-mono text-sm w-full"
                />
              </Field>

              <Field label="Hospital Zone" hint="Ward block or section of facility">
                <input
                  type="text"
                  value={formValues.zone ?? ""}
                  onChange={(e) => update({ zone: e.target.value })}
                  placeholder="e.g. Block A"
                  className="field text-sm w-full"
                />
              </Field>
            </div>

            <Field label="Physical Location" hint="Specific rooftop or plant room location">
              <input
                type="text"
                value={formValues.location ?? ""}
                onChange={(e) => update({ location: e.target.value })}
                placeholder="e.g. Main Hospital Block Rooftop (West Wing)"
                className="field text-sm w-full"
              />
            </Field>
          </div>
        )}

        {/* Step 2: Tank Dimensions */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1.5">Tank Shape</label>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => update({ shape: "cylinder" })}
                  className={`flex items-center justify-center gap-2 rounded-md border p-3 text-xs font-semibold transition-all ${
                    formValues.shape === "cylinder" ? "border-tide bg-tide/15 text-tide" : "border-line/60 bg-raised/40 text-muted"
                  }`}
                >
                  Cylinder
                </button>
                <button
                  type="button"
                  onClick={() => update({ shape: "rectangle" })}
                  className={`flex items-center justify-center gap-2 rounded-md border p-3 text-xs font-semibold transition-all ${
                    formValues.shape === "rectangle" ? "border-tide bg-tide/15 text-tide" : "border-line/60 bg-raised/40 text-muted"
                  }`}
                >
                  Rectangle
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Total Height (H)" hint="Distance from sensor to tank floor (cm)" error={fieldErrors.heightCm} required>
                <input
                  id="wizard-height"
                  type="number"
                  min={20}
                  max={2000}
                  value={formValues.heightCm}
                  onChange={(e) => update({ heightCm: Number(e.target.value) })}
                  className="field font-mono text-sm w-full"
                  required
                />
              </Field>

              <Field label="Dead Zone" hint="Sensor blind spot offset at top (cm)" required>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={formValues.deadZoneCm}
                  onChange={(e) => update({ deadZoneCm: Number(e.target.value) })}
                  className="field font-mono text-sm w-full"
                  required
                />
              </Field>

              {formValues.shape === "cylinder" ? (
                <Field label="Internal Radius (R)" hint="Radius of cylindrical tank (cm)" required>
                  <input
                    type="number"
                    min={10}
                    max={2000}
                    value={formValues.radiusCm ?? 100}
                    onChange={(e) => update({ radiusCm: Number(e.target.value) })}
                    className="field font-mono text-sm w-full"
                    required
                  />
                </Field>
              ) : (
                <>
                  <Field label="Internal Width (W)" hint="Width of rectangular tank (cm)" required>
                    <input
                      type="number"
                      min={10}
                      max={2000}
                      value={formValues.widthCm ?? 100}
                      onChange={(e) => update({ widthCm: Number(e.target.value) })}
                      className="field font-mono text-sm w-full"
                      required
                    />
                  </Field>
                  <Field label="Internal Length (L)" hint="Length of rectangular tank (cm)" required>
                    <input
                      type="number"
                      min={10}
                      max={2000}
                      value={formValues.lengthCm ?? 100}
                      onChange={(e) => update({ lengthCm: Number(e.target.value) })}
                      className="field font-mono text-sm w-full"
                      required
                    />
                  </Field>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Thresholds */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="Warning Level (%)" hint="Level % to trigger Warning alert" required>
                <input
                  id="wizard-warn"
                  type="number"
                  min={1}
                  max={99}
                  value={formValues.warnPct}
                  onChange={(e) => update({ warnPct: Number(e.target.value) })}
                  className="field font-mono text-sm w-full"
                  required
                />
              </Field>

              <Field label="Critical Level (%)" hint="Level % to trigger Critical alert" required>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={formValues.critPct}
                  onChange={(e) => update({ critPct: Number(e.target.value) })}
                  className="field font-mono text-sm w-full"
                  required
                />
              </Field>

              <Field label="Empty Threshold (%)" hint="Level % considered empty" required>
                <input
                  type="number"
                  min={0}
                  max={50}
                  value={formValues.emptyPct}
                  onChange={(e) => update({ emptyPct: Number(e.target.value) })}
                  className="field font-mono text-sm w-full"
                  required
                />
              </Field>
            </div>
          </div>
        )}

        {/* Step 4: Alert Recipients */}
        {step === 4 && (
          <div className="space-y-4">
            <Field label="Recipient Email Addresses" hint="Comma-separated emails of facility operators">
              <input
                type="text"
                value={recipientEmails}
                onChange={(e) => setRecipientEmails(e.target.value)}
                placeholder="facilities@mams.local, nurse@mams.local"
                className="field text-sm w-full"
              />
            </Field>

            <div className="rounded-lg border p-4 space-y-3 bg-[var(--bg-card)]">
              <div className="text-xs font-semibold text-ink">Enabled Channels for this Tank</div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyInApp}
                  onChange={(e) => setNotifyInApp(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-medium block">In-App Webhooks & Browser Banner</span>
                  <span className="text-xs text-muted block">Visual banner and bell alerts on dashboard and kiosk screens</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-medium block">Email Dispatch</span>
                  <span className="text-xs text-muted block">Direct email sent on critical and warning threshold breaches</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifySms}
                  onChange={(e) => setNotifySms(e.target.checked)}
                />
                <div>
                  <span className="text-sm font-medium block">SMS / WhatsApp Emergency Escalation</span>
                  <span className="text-xs text-muted block">Urgent escalation if unacknowledged after 15 minutes</span>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step 5: Review and Activate */}
        {step === 5 && (
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-ink">Summary & Activation</h3>
            <p className="text-xs text-muted">Review configured parameters before commissioning the new hospital tank node.</p>

            <div className="rounded-lg border p-4 space-y-2 text-sm bg-[var(--bg-card)]">
              <div className="flex justify-between">
                <span className="text-muted">Label:</span>
                <span className="font-semibold">{formValues.label || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Device ID:</span>
                <span className="font-mono">{formValues.deviceId || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Zone:</span>
                <span>{formValues.zone || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Shape & Dimensions:</span>
                <span>{formValues.shape}, {formValues.heightCm} cm height</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Thresholds:</span>
                <span>Warn: {formValues.warnPct}%, Crit: {formValues.critPct}%, Empty: {formValues.emptyPct}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { post, ApiError } from "@/lib/api";
import { validateTankForm, formToTankInput, type TankFormValues } from "@/lib/validation";
import { ICON } from "@/components/ui/icons";
import { PhaseChip } from "@/components/status/badges";
import { IdentityStep } from "./AddNodeWizard/Identity";
import { DimensionsStep } from "./AddNodeWizard/Dimensions";
import { ThresholdsStep } from "./AddNodeWizard/Thresholds";
import { RecipientsStep } from "./AddNodeWizard/Recipients";
import { ReviewStep } from "./AddNodeWizard/Review";

interface AddNodeDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddNodeDialog({ open, onClose, onSuccess }: AddNodeDialogProps) {
  const toast = useToast();
  const [step, setStep] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [formValues, setFormValues] = useState<TankFormValues>({
    label: "",
    deviceId: "",
    zone: "",
    location: "",
    status: "active",
    shape: "cylinder",
    heightCm: 300,
    radiusCm: 100,
    deadZoneCm: 25,
    warnPct: 40,
    critPct: 20,
    emptyPct: 5,
    dimsConfirmed: true,
  });

  const updateValues = (vals: Partial<TankFormValues>) => {
    setFormValues((prev) => ({ ...prev, ...vals }));
    setFieldErrors({});
  };

  const handleNext = () => {
    if (step === 1) {
      if (!formValues.label.trim()) {
        setFieldErrors({ label: "Enter a tank label." });
        return;
      }
      if (formValues.deviceId && !/^[0-9a-fA-F]{16}$/.test(formValues.deviceId.trim())) {
        setFieldErrors({ deviceId: "Enter the 16-character Device EUI." });
        return;
      }
    }
    if (step === 2) {
      const h = typeof formValues.heightCm === "string" ? parseFloat(formValues.heightCm) : formValues.heightCm;
      if (!h || h <= 0) {
        setFieldErrors({ heightCm: "Height must be greater than 0 cm." });
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 5));
  };

  const handleBack = () => {
    setStep((s) => Math.max(s - 1, 1));
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
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 500) {
        toast.error("The device isn't registered yet. Save as draft; the backend links hardware in Phase 2.");
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
      onClose={onClose}
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
            <Button variant="outline" onClick={onClose} disabled={busy}>
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
                <Button variant="outline" lock={2} title="Simulation seeding available in Phase 2">
                  Activate with simulation <PhaseChip phase={2} />
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

        {/* Step Content */}
        {step === 1 && <IdentityStep values={formValues} onChange={updateValues} errors={fieldErrors} />}
        {step === 2 && <DimensionsStep values={formValues} onChange={updateValues} errors={fieldErrors} />}
        {step === 3 && <ThresholdsStep values={formValues} onChange={updateValues} errors={fieldErrors} />}
        {step === 4 && <RecipientsStep />}
        {step === 5 && <ReviewStep values={formValues} />}
      </div>
    </Dialog>
  );
}


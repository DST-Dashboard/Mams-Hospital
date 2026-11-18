"use client";

import clsx from "clsx";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { IdentityStep } from "./Identity";
import { DimensionsStep } from "./Dimensions";
import { ThresholdsStep } from "./Thresholds";
import { RecipientsStep } from "./Recipients";
import { ReviewStep } from "./Review";
import { INITIAL_WIZARD_DATA, type AddNodeWizardData } from "./types";

const STEPS = [
  { id: "identity", label: "1. Identity" },
  { id: "dimensions", label: "2. Dimensions" },
  { id: "thresholds", label: "3. Thresholds" },
  { id: "recipients", label: "4. Recipients" },
  { id: "review", label: "5. Review" },
] as const;

export function AddNodeWizard() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [data, setData] = useState<AddNodeWizardData>(INITIAL_WIZARD_DATA);
  const [loading, setLoading] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const updateData = (patch: Partial<AddNodeWizardData>) => {
    setData((prev) => ({ ...prev, ...patch }));
    setStepError(null);
  };

  const validateCurrentStep = (): boolean => {
    setStepError(null);
    if (currentStep === 0) {
      if (!data.label.trim()) {
        setStepError("Tank label is required.");
        return false;
      }
    } else if (currentStep === 1) {
      if (data.heightCm < 20 || data.heightCm > 2000) {
        setStepError("Height must be between 20 cm and 2000 cm.");
        return false;
      }
      if (data.deadZoneCm >= data.heightCm) {
        setStepError("Dead zone must be less than height.");
        return false;
      }
    } else if (currentStep === 2) {
      if (!(data.warnPct > data.critPct && data.critPct > data.emptyPct)) {
        setStepError("Thresholds must follow Warning % > Critical % > Empty %.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1));
  };

  const handleBack = () => {
    setStepError(null);
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const payload = {
        label: data.label.trim(),
        deviceId: data.deviceId.trim() || null,
        zone: data.zone.trim() || null,
        location: data.location.trim() || null,
        status: data.status,
        shape: data.shape,
        heightCm: data.heightCm,
        deadZoneCm: data.deadZoneCm,
        radiusCm: data.shape === "cylinder" ? data.radiusCm : undefined,
        widthCm: data.shape === "rectangle" ? data.widthCm : undefined,
        lengthCm: data.shape === "rectangle" ? data.lengthCm : undefined,
        warnPct: data.warnPct,
        critPct: data.critPct,
        emptyPct: data.emptyPct,
        dimsConfirmed: data.dimsConfirmed,
      };

      const res = await fetch("/api/tanks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to create tank node");
      }

      success(`Tank node "${data.label}" successfully commissioned!`);
      router.push("/admin/nodes");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating node";
      setStepError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Step Indicator Progress Bar */}
      <div className="border-b hairline pb-4">
        <nav aria-label="Wizard Steps" className="flex items-center justify-between">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStep;
            const isCurrent = idx === currentStep;

            return (
              <button
                key={step.id}
                type="button"
                disabled={idx > currentStep && !validateCurrentStep}
                onClick={() => {
                  if (idx <= currentStep || validateCurrentStep()) setCurrentStep(idx);
                }}
                className={clsx(
                  "flex items-center gap-2 text-xs font-semibold transition-colors pb-2 -mb-4 border-b-2",
                  isCurrent
                    ? "border-tide text-tide font-bold"
                    : isCompleted
                    ? "border-ok/60 text-ok hover:text-ok"
                    : "border-transparent text-muted hover:text-ink cursor-not-allowed opacity-60"
                )}
              >
                <span
                  className={clsx(
                    "flex h-5 w-5 items-center justify-center rounded-full text-[10px]",
                    isCurrent
                      ? "bg-tide text-bg"
                      : isCompleted
                      ? "bg-ok text-bg"
                      : "bg-raised text-muted"
                  )}
                >
                  {isCompleted ? <Check size={10} /> : idx + 1}
                </span>
                <span className="hidden sm:inline">{step.label.replace(/^\d+\.\s*/, "")}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Error Alert */}
      {stepError ? (
        <div role="alert" className="rounded-lg border border-crit/40 bg-crit/10 p-4 text-xs text-crit">
          {stepError}
        </div>
      ) : null}

      {/* Step Content Container */}
      <div className="rounded-xl border hairline bg-surface p-6 sm:p-8 min-h-[380px]">
        {currentStep === 0 && <IdentityStep data={data} onChange={updateData} />}
        {currentStep === 1 && <DimensionsStep data={data} onChange={updateData} />}
        {currentStep === 2 && <ThresholdsStep data={data} onChange={updateData} />}
        {currentStep === 3 && <RecipientsStep data={data} onChange={updateData} />}
        {currentStep === 4 && (
          <ReviewStep
            data={data}
            onGoToStep={(stepIdx) => setCurrentStep(stepIdx)}
            onSubmit={handleSubmit}
            loading={loading}
          />
        )}
      </div>

      {/* Step Navigation Buttons */}
      {currentStep < 4 ? (
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleBack}
            disabled={currentStep === 0}
            icon={ArrowLeft}
          >
            Back
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleNext}
            icon={ArrowRight}

          >
            Next Step
          </Button>
        </div>
      ) : null}
    </div>
  );
}

"use client";

import clsx from "clsx";
import React from "react";
import { Field } from "@/components/ui/Field";
import { litres } from "@/lib/format";
import type { AddNodeWizardData } from "./types";

export function DimensionsStep({
  data,
  onChange,
}: {
  data: AddNodeWizardData;
  onChange: (patch: Partial<AddNodeWizardData>) => void;
}) {
  const baseAreaCm2 =
    data.shape === "cylinder"
      ? Math.PI * Math.max(0, data.radiusCm) ** 2
      : Math.max(0, data.widthCm) * Math.max(0, data.lengthCm);
  const capacityL = Math.round((baseAreaCm2 * Math.max(0, data.heightCm)) / 1000);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-ink">Step 2: Physical Dimensions</h3>
          <p className="text-xs text-muted">
            Configure vessel geometry to calculate volume, height, and water level percentages.
          </p>
        </div>
        <span className="text-xs font-mono font-bold text-tide bg-tide/10 px-2.5 py-1 rounded">
          Capacity: {litres(capacityL)}
        </span>
      </div>

      <div>
        <label className="block text-xs font-medium text-ink mb-1.5">Tank Shape</label>
        <div className="grid grid-cols-2 gap-3 max-w-md">
          <button
            type="button"
            onClick={() => onChange({ shape: "cylinder" })}
            className={clsx(
              "flex items-center justify-center gap-2 rounded-md border p-3 text-xs font-semibold transition-all",
              data.shape === "cylinder"
                ? "border-tide bg-tide/15 text-tide"
                : "border-line/60 bg-raised/40 text-muted hover:bg-raised"
            )}
          >
            Cylinder
          </button>
          <button
            type="button"
            onClick={() => onChange({ shape: "rectangle" })}
            className={clsx(
              "flex items-center justify-center gap-2 rounded-md border p-3 text-xs font-semibold transition-all",
              data.shape === "rectangle"
                ? "border-tide bg-tide/15 text-tide"
                : "border-line/60 bg-raised/40 text-muted hover:bg-raised"
            )}
          >
            Rectangle
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Total Height (H)" hint="Distance from ultrasonic sensor to tank floor (cm)" required>
          <div className="relative">
            <input
              type="number"
              min={20}
              max={2000}
              value={data.heightCm}
              onChange={(e) => onChange({ heightCm: Number(e.target.value) })}
              className="field font-mono text-sm pr-10"
              required
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">cm</span>
          </div>
        </Field>

        <Field label="Dead Zone" hint="Sensor blind spot offset at top of tank (cm)" required>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={100}
              value={data.deadZoneCm}
              onChange={(e) => onChange({ deadZoneCm: Number(e.target.value) })}
              className="field font-mono text-sm pr-10"
              required
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">cm</span>
          </div>
        </Field>

        {data.shape === "cylinder" ? (
          <Field label="Internal Radius (R)" hint="Radius of cylindrical tank (cm)" required>
            <div className="relative">
              <input
                type="number"
                min={10}
                max={1000}
                value={data.radiusCm}
                onChange={(e) => onChange({ radiusCm: Number(e.target.value) })}
                className="field font-mono text-sm pr-10"
                required
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">cm</span>
            </div>
          </Field>
        ) : (
          <>
            <Field label="Internal Width (W)" hint="Width in cm" required>
              <div className="relative">
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={data.widthCm}
                  onChange={(e) => onChange({ widthCm: Number(e.target.value) })}
                  className="field font-mono text-sm pr-10"
                  required
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">cm</span>
              </div>
            </Field>

            <Field label="Internal Length (L)" hint="Length in cm" required>
              <div className="relative">
                <input
                  type="number"
                  min={10}
                  max={5000}
                  value={data.lengthCm}
                  onChange={(e) => onChange({ lengthCm: Number(e.target.value) })}
                  className="field font-mono text-sm pr-10"
                  required
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">cm</span>
              </div>
            </Field>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 pt-2">
        <input
          type="checkbox"
          id="wizardDimsConfirmed"
          checked={data.dimsConfirmed}
          onChange={(e) => onChange({ dimsConfirmed: e.target.checked })}
          className="rounded border hairline text-tide focus:ring-tide"
        />
        <label htmlFor="wizardDimsConfirmed" className="text-xs font-medium text-ink cursor-pointer">
          Confirm that dimensions were physically verified by facilities engineer
        </label>
      </div>
    </div>
  );
}

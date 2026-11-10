"use client";

import React from "react";
import { Field } from "@/components/ui/Field";
import type { AddNodeWizardData } from "./types";

export function ThresholdsStep({
  data,
  onChange,
}: {
  data: AddNodeWizardData;
  onChange: (patch: Partial<AddNodeWizardData>) => void;
}) {
  const isValid = data.warnPct > data.critPct && data.critPct > data.emptyPct;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ink">Step 3: Alert & Alarm Thresholds</h3>
        <p className="text-xs text-muted">
          Define water percentage setpoints for dispatching alarms. Threshold hierarchy must be:
          Warning &gt; Critical &gt; Empty.
        </p>
      </div>

      {!isValid ? (
        <div role="alert" className="rounded-md border border-crit/40 bg-crit/10 p-3 text-xs text-crit">
          Invalid Thresholds: Warning % ({data.warnPct}%) must be strictly greater than Critical % ({data.critPct}%),
          which must be strictly greater than Empty % ({data.emptyPct}%).
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <Field label="Warning Low Threshold" hint="Yellow alarm trigger (e.g. 40%)" required>
          <div className="relative">
            <input
              type="number"
              min={1}
              max={99}
              value={data.warnPct}
              onChange={(e) => onChange({ warnPct: Number(e.target.value) })}
              className="field font-mono text-sm pr-8"
              required
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
          </div>
        </Field>

        <Field label="Critical Low Threshold" hint="Red urgent alarm trigger (e.g. 20%)" required>
          <div className="relative">
            <input
              type="number"
              min={1}
              max={99}
              value={data.critPct}
              onChange={(e) => onChange({ critPct: Number(e.target.value) })}
              className="field font-mono text-sm pr-8"
              required
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
          </div>
        </Field>

        <Field label="Empty / Dry Run Cutoff" hint="Emergency cutoff trigger (e.g. 5%)" required>
          <div className="relative">
            <input
              type="number"
              min={0}
              max={50}
              value={data.emptyPct}
              onChange={(e) => onChange({ emptyPct: Number(e.target.value) })}
              className="field font-mono text-sm pr-8"
              required
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
          </div>
        </Field>
      </div>

      {/* Visual threshold gauge preview */}
      <div className="rounded-lg border hairline bg-raised/30 p-4 space-y-2 mt-4">
        <div className="text-xs font-semibold text-muted">Threshold Visual Preview</div>
        <div className="h-4 w-full rounded-full bg-raised overflow-hidden flex">
          <div style={{ width: `${data.emptyPct}%` }} className="bg-emerg h-full" title={`Empty: ${data.emptyPct}%`} />
          <div
            style={{ width: `${Math.max(0, data.critPct - data.emptyPct)}%` }}
            className="bg-crit h-full"
            title={`Critical: ${data.critPct}%`}
          />
          <div
            style={{ width: `${Math.max(0, data.warnPct - data.critPct)}%` }}
            className="bg-warn h-full"
            title={`Warning: ${data.warnPct}%`}
          />
          <div
            style={{ width: `${Math.max(0, 100 - data.warnPct)}%` }}
            className="bg-ok h-full"
            title="Normal Range"
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted font-mono">
          <span>0% (Empty)</span>
          <span>{data.emptyPct}%</span>
          <span>{data.critPct}%</span>
          <span>{data.warnPct}%</span>
          <span>100% (Full)</span>
        </div>
      </div>
    </div>
  );
}

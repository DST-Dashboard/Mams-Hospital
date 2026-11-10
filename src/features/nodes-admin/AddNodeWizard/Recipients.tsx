"use client";

import React from "react";
import { Field } from "@/components/ui/Field";
import type { AddNodeWizardData } from "./types";

export function RecipientsStep({
  data,
  onChange,
}: {
  data: AddNodeWizardData;
  onChange: (patch: Partial<AddNodeWizardData>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-ink">Step 4: Notification Channels & Escalation</h3>
        <p className="text-xs text-muted">
          Specify who receives alert dispatches and which communication channels are enabled for this tank.
        </p>
      </div>

      <div className="space-y-4 pt-2">
        <Field
          label="Recipient Email Addresses"
          hint="Comma-separated emails of on-duty facility operators and managers"
        >
          <input
            type="text"
            value={data.recipientEmails}
            onChange={(e) => onChange({ recipientEmails: e.target.value })}
            placeholder="facilities@mams.local, duty-nurse@mams.local"
            className="field text-sm"
          />
        </Field>

        <div className="rounded-lg border hairline bg-surface p-4 space-y-3">
          <div className="text-xs font-semibold text-ink">Enabled Channels for this Tank</div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.notifyInApp}
              onChange={(e) => onChange({ notifyInApp: e.target.checked })}
              className="rounded border hairline text-tide focus:ring-tide"
            />
            <div>
              <span className="text-sm font-medium text-ink block">In-App Dashboard Alerts</span>
              <span className="text-xs text-muted block">
                Visual alarm banner and bell notification on dashboard and kiosk screens
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.notifyEmail}
              onChange={(e) => onChange({ notifyEmail: e.target.checked })}
              className="rounded border hairline text-tide focus:ring-tide"
            />
            <div>
              <span className="text-sm font-medium text-ink block">Email Dispatch</span>
              <span className="text-xs text-muted block">
                Direct email sent on critical and warning threshold breaches
              </span>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={data.notifySms}
              onChange={(e) => onChange({ notifySms: e.target.checked })}
              className="rounded border hairline text-tide focus:ring-tide"
            />
            <div>
              <span className="text-sm font-medium text-ink block">SMS / WhatsApp Emergency Escalation</span>
              <span className="text-xs text-muted block">
                Urgent SMS message dispatched if unacknowledged after 15 minutes
              </span>
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}

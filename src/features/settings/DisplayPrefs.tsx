"use client";

import { Card, Segmented } from "@/components/ui/primitives";
import { useUi } from "@/lib/store";
import { ICON } from "@/components/ui/icons";

export function DisplayPrefs() {
  const { theme, setTheme, tz, setTz, textSize, setTextSize } = useUi();

  return (
    <Card
      eyebrow={{ icon: ICON.theme, text: "UI PERSONALIZATION" }}
      title="Display & Regional Preferences"
      footnote="Preferences apply immediately and persist in your browser across sessions."
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "var(--sp-6)" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--tx-label)", marginBottom: "var(--sp-2)" }}>
            Theme
          </label>
          <Segmented
            value={theme}
            onChange={(v: string) => setTheme(v as "light" | "dark")}
            ariaLabel="Theme selector"
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--tx-label)", marginBottom: "var(--sp-2)" }}>
            Time Zone
          </label>
          <Segmented
            value={tz}
            onChange={(v: string) => setTz(v as "IST" | "UTC")}
            ariaLabel="Time zone selector"
            options={[
              { value: "IST", label: "IST (UTC+5:30)" },
              { value: "UTC", label: "UTC" },
            ]}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--tx-label)", marginBottom: "var(--sp-2)" }}>
            Text Size
          </label>
          <Segmented
            value={String(textSize)}
            onChange={(v: string) => setTextSize(parseInt(v, 10) as 15 | 16 | 18)}
            ariaLabel="Text size selector"
            options={[
              { value: "15", label: "Compact (15px)" },
              { value: "16", label: "Default (16px)" },
              { value: "18", label: "Large (18px)" },
            ]}
          />
        </div>
      </div>
    </Card>
  );
}

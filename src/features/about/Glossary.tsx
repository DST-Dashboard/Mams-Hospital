"use client";

import { Card } from "@/components/ui/primitives";
import { ICON } from "@/components/ui/icons";

export function Glossary() {
  const terms: { term: string; def: string }[] = [
    {
      term: "Distance to Water",
      def: "The physical distance measured by the ultrasonic transceiver from the sensor lid down to the liquid surface. As the tank fills, this distance decreases.",
    },
    {
      term: "Water Level",
      def: "Calculated height of the liquid column: Level = Tank Height − Distance to Water.",
    },
    {
      term: "Percent Full",
      def: "The ratio of current water level to total tank height, expressed as a percentage: Level % = (Level / Height) × 100%.",
    },
    {
      term: "Volume (Litres)",
      def: "The derived volume of liquid stored in the tank, computed from water level and tank cross-sectional geometry (cylinder or rectangle).",
    },
    {
      term: "Dead Zone",
      def: "The blind distance immediately below the ultrasonic transceiver face (typically 25 cm) where sonic echoes cannot be accurately resolved. Telemetry inside this zone indicates near-overflow.",
    },
    {
      term: "Warning Threshold",
      def: "The high-level advisory threshold (default 40%). Crossing below this signals that pump replenishment should be scheduled.",
    },
    {
      term: "Critical Threshold",
      def: "The urgent refill threshold (default 20%). Crossing below this requires active intervention by hospital engineering.",
    },
    {
      term: "Emergency Empty",
      def: "The critical reserve threshold (default 5%). At this level, patient care wards and operating theatres risk immediate water disruption.",
    },
    {
      term: "Overflow Risk",
      def: "Triggered when distance falls below Dead Zone + 10 cm margin, preventing rooftop water spillage and structural damage.",
    },
    {
      term: "Inferred Pump State",
      def: "Operational pump status derived by analyzing positive level rate-of-rise: 'Filling' if a rise cycle occurred within the last 15 minutes, otherwise 'Idle'.",
    },
    {
      term: "Persistence",
      def: "The number of consecutive telemetry packets (default 3 readings ≈ 15 minutes) that must cross a threshold before an alarm fires, eliminating transient ripples.",
    },
    {
      term: "Cooldown",
      def: "The minimum time window (default 30 minutes) before an alarm of the same type can repeat, preventing operator notification fatigue.",
    },
    {
      term: "Hysteresis",
      def: "The safety reset delta (+2% above trigger threshold) required before an alert auto-resolves, preventing state toggling near boundaries.",
    },
    {
      term: "Data Completeness",
      def: "The percentage of expected 5-minute uplinks successfully captured over a time window. ≥95% is considered optimal hospital radio coverage.",
    },
    {
      term: "RSSI (Received Signal Strength Indicator)",
      def: "Radio signal power measured in dBm. Values above −90 dBm are good; −90 to −110 dBm fair; below −110 dBm weak.",
    },
    {
      term: "SNR (Signal-to-Noise Ratio)",
      def: "Radio signal clarity measured in dB. Values above +5 dB indicate clean reception; negative values indicate heavy RF interference.",
    },
    {
      term: "Flapping Signal",
      def: "A rapid oscillation between alternating distance readings caused by sensor aim misalignment, internal ladder reflections, or liquid foaming.",
    },
    {
      term: "Anchored Clock",
      def: "A static timestamp anchor used in demonstration mode, tying current time to the newest dataset reading (30 Oct 11:13 IST) for reliable evaluation.",
    },
    {
      term: "LoRaWAN",
      def: "Long Range Wide Area Network protocol operating at 868 MHz in Europe and India, providing multi-kilometer rooftop battery penetration.",
    },
  ];

  return (
    <Card
      id="glossary"
      eyebrow={{ icon: ICON.glossary, text: "TERMINOLOGY & STANDARDS" }}
      title="Technical Glossary (19 Standard Terms)"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--sp-5)",
          marginTop: "var(--sp-2)",
        }}
      >
        {terms.map((t) => (
          <div
            key={t.term}
            style={{
              background: "var(--bg-subtle)",
              border: "1px solid var(--bd-soft)",
              borderRadius: "var(--r-lg)",
              padding: "var(--sp-4)",
            }}
          >
            <div style={{ fontWeight: 800, fontSize: "14px", color: "var(--brand-800)", marginBottom: "var(--sp-1)" }}>
              {t.term}
            </div>
            <div style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--tx-body)" }}>
              {t.def}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

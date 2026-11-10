export const DASHBOARD_GUIDE = {
  question: "How do hospital operators use this rooftop water monitoring overview?",
  description:
    "The Overview screen combines high-frequency 24-hour telemetry with an always-visible 7-day pattern view to prevent clinical water shortages, detect overflows, and monitor telemetry health across all 5 hospital storage nodes.",
  steps: [
    "Check tank fill percentages and threshold ticks on the live vessel cards.",
    "Inspect the last 24-hour overlaid trend to identify morning and evening hospital consumption peaks.",
    "Review the 7-day heatmap and signal quality to confirm network health and gateway connectivity.",
  ] as [string, string, string],
  howToRead:
    "Water levels are derived server-side from ultrasonic distance down to liquid surface. A falling line indicates consumption; a rapid upward slope indicates active borehole/municipal pump inflow. Missing data periods are rendered honestly as gaps, never as zero.",
};

export const DASHBOARD_GLOSSARY = [
  {
    term: "Level (cm)",
    def: "The vertical depth of water in the vessel, derived as total tank height minus sensor distance.",
  },
  {
    term: "Fill Percentage (%)",
    def: "Usable water volume relative to effective capacity (above the dead zone and below the sensor lip).",
  },
  {
    term: "Dead Zone",
    def: "The minimum separation distance required directly beneath the ultrasonic sensor (typically 25 cm) where readings cannot be resolved reliably.",
  },
  {
    term: "Flapping Signal",
    def: "Rapidly alternating distance measurements caused by surface turbulence or sensor bouncing (>40 events), rendering consumption volume unreliable.",
  },
  {
    term: "Completeness",
    def: "The proportion of scheduled 5-minute LoRaWAN telemetry frames successfully delivered and stored.",
  },
  {
    term: "Anchored Clock",
    def: "Demonstration mode operating on a frozen historical telemetry snapshot, where 'now' corresponds to the newest recorded timestamp.",
  },
  {
    term: "LoRaWAN RSSI",
    def: "Received Signal Strength Indicator in dBm. Values between -60 and -100 dBm represent excellent signal.",
  },
  {
    term: "SNR (Signal-to-Noise)",
    def: "Signal-to-noise ratio in dB. Higher values denote clearer radio reception above background RF noise.",
  },
];


export const TANK_DETAIL_GUIDE = {
  question: "How do hospital operators analyze individual water tank telemetry?",
  description:
    "This deep-dive view provides engineering telemetry and hydraulic analytics for a single rooftop vessel, comparing high-resolution 24-hour sensor data directly alongside 7-day cyclical patterns.",
  steps: [
    "Verify water depth and usable volume against configured physical thresholds (Warning, Critical, Emergency).",
    "Inspect the stacked Day (24-hour) and Week (7-day) trend plots to correlate pump cycles with consumption drawdowns.",
    "Review detected fill and drain events to evaluate automated pump runtimes and detect unexpected overnight drain episodes.",
  ] as [string, string, string],
  howToRead:
    "Distance is measured from the ceiling lidar sensor down to liquid. Liquid depth is calculated as height minus distance. In the raw inspector, distance uses an inverted axis so the visual trajectory corresponds directly to water movement.",
};


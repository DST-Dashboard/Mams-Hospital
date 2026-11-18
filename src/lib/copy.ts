/**
 * OHTMS Master Copy & Terminology Dictionary (spec §5, §14, §19)
 */

export const BRAND = {
  hospital: "MAMS Hospital",
  system: "Overhead Tank Management System",
  tagline: "Real-time rooftop water monitoring",
  short: "",
  gateway: "SenseCap gateway",
};

export const HERO_COPY = {
  badgeLive: "LIVE WATER MONITORING",
  badgeDemo: "DEMONSTRATION MODE",
  headline: "MAMS Hospital",
  subheadline: "Know every tank's level before a tap runs dry.",
  description:
    "Ultrasonic sensors on each rooftop tank report over LoRaWAN about every 5 minutes. The monitoring system turns each distance into level, litres and alerts within 1–2 seconds.",
  viewTanks: "View tanks",
  howItWorks: "How it works",
  stats: [
    { label: "5 rooftop tanks monitored", icon: "tank" },
    { label: "1 live node · 4 simulated", icon: "signal" },
    { label: "~5 min between readings", icon: "clock" },
    { label: "1–2 s from sensor to screen", icon: "live" },
  ],
};

export const GLOSSARY_TERMS: { term: string; def: string }[] = [
  {
    term: "Distance",
    def: "Millimetres or centimetres measured by the ultrasonic sensor from the tank lid down to the water surface.",
  },
  {
    term: "Level",
    def: "Water height inside the tank, derived as tank height minus measured distance.",
  },
  {
    term: "Fill %",
    def: "Percentage of operational capacity filled with water, accounting for the top dead zone.",
  },
  {
    term: "Dead zone",
    def: "The minimum blind distance (typically 25 cm) directly below the sensor where echoes cannot be resolved.",
  },
  {
    term: "Threshold",
    def: "Percentage limits (Warning 40%, Critical 20%, Empty 5%) that trigger automated alarms.",
  },
  {
    term: "Uplink",
    def: "A periodic telemetry transmission from the sensor node through LoRaWAN to the SenseCap gateway.",
  },
  {
    term: "RSSI / SNR",
    def: "Received Signal Strength Indicator (dBm) and Signal-to-Noise Ratio (dB) representing LoRa radio quality.",
  },
  {
    term: "f_cnt",
    def: "Uplink frame counter from the sensor node, used to track message sequence and packet loss.",
  },
  {
    term: "Persistence",
    def: "The number of consecutive readings required before an alert triggers, preventing false alarms from waves.",
  },
  {
    term: "Cooldown",
    def: "Minimum quiet duration in minutes before repeating an alert notification.",
  },
  {
    term: "Device EUI",
    def: "Globally unique 16-hex-digit IEEE identifier for the sensor node hardware.",
  },
  {
    term: "Maintenance",
    def: "Operational state that pauses automated alert generation while a tank is being cleaned or inspected.",
  },
  {
    term: "Acknowledge",
    def: "Sign-off by an operator confirming an alert has been seen and is actively being handled.",
  },
];


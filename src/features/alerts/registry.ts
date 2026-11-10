import type { z } from "zod";
import type { SeveritySchema } from "@/contracts/common";

export type Severity = z.infer<typeof SeveritySchema>;

export interface AlertTypeDefinition {
  type: string;
  trigger: string;
  level: Severity;
  title: string;
  example: string;
  phase: 1 | 2 | "FULL";
}

export const ALERT_TYPE_REGISTRY: Record<string, AlertTypeDefinition> = {
  LOW_LEVEL: {
    type: "LOW_LEVEL",
    trigger: "level < warning threshold",
    level: "warning",
    title: "Low Level",
    example: "Tank 1 at 33 % — below 40 % threshold",
    phase: 1,
  },
  CRITICAL_LOW: {
    type: "CRITICAL_LOW",
    trigger: "level < critical threshold",
    level: "critical",
    title: "Critical Low",
    example: "Tank 2 at 18 % — refill needed",
    phase: 1,
  },
  EMPTY: {
    type: "EMPTY",
    trigger: "level < 5 %",
    level: "emergency",
    title: "Tank Empty",
    example: "Tank 2 nearly empty — immediate action",
    phase: 1,
  },
  OVERFLOW_RISK: {
    type: "OVERFLOW_RISK",
    trigger: "distance < dead zone + 10 cm",
    level: "critical",
    title: "Overflow Risk",
    example: "Tank 4 near sensor dead zone — possible overflow",
    phase: 1,
  },
  SENSOR_FAULT: {
    type: "SENSOR_FAULT",
    trigger: "distance < 0, > H, or spike > 3σ",
    level: "critical",
    title: "Sensor Fault",
    example: "Tank 5 sensor reporting invalid value",
    phase: 1,
  },
  NO_DATA: {
    type: "NO_DATA",
    trigger: "no uplink > 15 min",
    level: "warning",
    title: "No Data",
    example: "Tank 4 silent for 18 min — check device",
    phase: 1,
  },
  BATTERY_LOW: {
    type: "BATTERY_LOW",
    trigger: "battery < 20 %",
    level: "warning",
    title: "Battery Low",
    example: "Tank 5 battery at 18 % — plan battery change",
    phase: 2,
  },
  RAPID_DRAIN: {
    type: "RAPID_DRAIN",
    trigger: "level drop > X cm in Y min without a pump",
    level: "warning",
    title: "Rapid Drain",
    example: "Tank 2 dropped 15 cm in 10 min — possible leak",
    phase: 2,
  },
  PREDICTED_EMPTY: {
    type: "PREDICTED_EMPTY",
    trigger: "forecast < 60 min to empty",
    level: "warning",
    title: "Predicted Empty",
    example: "Tank 1 predicted to empty in 45 min at current rate",
    phase: 2,
  },
  GATEWAY_OFFLINE: {
    type: "GATEWAY_OFFLINE",
    trigger: "gateway check fails",
    level: "critical",
    title: "Gateway Offline",
    example: "SenseCap gateway offline — all nodes affected",
    phase: "FULL",
  },
  FLATLINE: {
    type: "FLATLINE",
    trigger: "no level change > 6 h and not full",
    level: "info",
    title: "Sensor Flatline",
    example: "Tank 2 readings unchanged for 6 h — check sensor",
    phase: "FULL",
  },
  PUMP_STUCK: {
    type: "PUMP_STUCK",
    trigger: "pump on, no rise in 20 min",
    level: "critical",
    title: "Pump Fault",
    example: "Tank 1 pump on but no level rise — pump or valve fault",
    phase: "FULL",
  },
  DATA_GAP: {
    type: "DATA_GAP",
    trigger: "f_cnt skip",
    level: "info",
    title: "Data Gap",
    example: "Tank 3 missed 1 reading (f_cnt gap)",
    phase: "FULL",
  },
};

export const PHASE_1_ALERT_TYPES = Object.values(ALERT_TYPE_REGISTRY).filter((a) => a.phase === 1);

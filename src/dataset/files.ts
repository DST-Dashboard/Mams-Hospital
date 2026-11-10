import fs from "node:fs";
import path from "node:path";
import type { DeviceMeta } from "./normalize";

/** Compact on-disk format: one file per device, columnar rows, ascending by time (~80 KB per week). */
export const READING_COLUMNS = ["t", "d", "fc", "rssi", "snr", "bat"] as const;
export interface ReadingsFile {
  schema: 1; deviceId: string; count: number; columns: typeof READING_COLUMNS;
  rows: (number | null)[][]; // [t, distance_cm, f_cnt, rssi, snr, battery_pct]
}
export interface DeviceRecord extends DeviceMeta { nodeNo: number; label: string; simulated: boolean }
export interface Manifest {
  schema: 1; generatedAt: string; devices: string[];
  startT: number; endT: number; cadenceS: number; totalReadings: number;
  rawFiles: { file: string; sha256: string; bytes: number }[]; validation: unknown[];
}

export const DATA_DIR = path.resolve(process.cwd(), "data");
export const RAW_DIR = path.join(DATA_DIR, "raw");
export const PROCESSED_DIR = path.join(DATA_DIR, "processed");

export const readJson = <T,>(p: string): T => JSON.parse(fs.readFileSync(p, "utf8")) as T;
export const loadDevices = () => readJson<DeviceRecord[]>(path.join(PROCESSED_DIR, "devices.json"));
export const loadManifest = () => readJson<Manifest>(path.join(PROCESSED_DIR, "manifest.json"));
export const loadReadings = (deviceId: string) => readJson<ReadingsFile>(path.join(PROCESSED_DIR, "readings", `${deviceId}.json`));

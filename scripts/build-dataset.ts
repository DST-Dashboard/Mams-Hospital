/**
 * raw TTS exports  →  data/processed/{devices.json, readings/*.json, manifest.json}
 * Fails loudly on anything unexpected. Re-runnable and deterministic.
 *   npm run data:build            (skips quietly if raw files are absent but processed data exists)
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PROCESSED_DIR, RAW_DIR, READING_COLUMNS, type DeviceRecord, type Manifest, type ReadingsFile } from "../src/dataset/files";
import { normalizeUplink, type DeviceMeta, type NormalizedUplink } from "../src/dataset/normalize";
import { validateSeries } from "../src/dataset/validate";

const rawFiles = fs.existsSync(RAW_DIR) ? fs.readdirSync(RAW_DIR).filter((f) => f.endsWith(".json")).sort() : [];
if (rawFiles.length === 0) {
  if (fs.existsSync(path.join(PROCESSED_DIR, "manifest.json"))) {
    console.log("data:build — no raw files in data/raw/, keeping existing data/processed/. (Drop the TTS exports there to rebuild.)");
    process.exit(0);
  }
  console.error("data:build — data/raw/ is empty and nothing is processed yet. Copy mams-hospital_n*_week.json into data/raw/.");
  process.exit(1);
}

const byDevice = new Map<string, NormalizedUplink[]>();
const meta = new Map<string, DeviceMeta>();
const manifestRaw: Manifest["rawFiles"] = [];

for (const f of rawFiles) {
  const buf = fs.readFileSync(path.join(RAW_DIR, f));
  manifestRaw.push({ file: f, sha256: crypto.createHash("sha256").update(buf).digest("hex"), bytes: buf.length });
  const arr = JSON.parse(buf.toString("utf8")) as unknown[];
  arr.forEach((rec, i) => {
    try {
      const { reading, device } = normalizeUplink(rec);
      (byDevice.get(reading.deviceId) ?? byDevice.set(reading.deviceId, []).get(reading.deviceId)!).push(reading);
      meta.set(device.deviceId, device);
    } catch (e) {
      throw new Error(`${f}[${i}]: ${(e as Error).message}`);
    }
  });
}

fs.mkdirSync(path.join(PROCESSED_DIR, "readings"), { recursive: true });
const reports = [];
const devices: DeviceRecord[] = [];
let total = 0, startT = Infinity, endT = 0;

for (const deviceId of [...byDevice.keys()].sort()) {
  const rows = byDevice.get(deviceId)!.sort((a, b) => a.t - b.t); // raw exports are newest-first
  const dedup = rows.filter((r, i) => i === 0 || r.t !== rows[i - 1]!.t);
  const rep = validateSeries(deviceId, dedup);
  reports.push(rep);
  const out: ReadingsFile = {
    schema: 1, deviceId, count: dedup.length, columns: READING_COLUMNS,
    rows: dedup.map((r) => [r.t, r.distanceCm, r.fCnt, r.rssi, r.snr, r.batteryPct]),
  };
  fs.writeFileSync(path.join(PROCESSED_DIR, "readings", `${deviceId}.json`), JSON.stringify(out));
  total += dedup.length; startT = Math.min(startT, rep.startT); endT = Math.max(endT, rep.endT);

  const nodeNo = Number(/(\d+)$/.exec(deviceId)![1]);
  devices.push({
    ...meta.get(deviceId)!, nodeNo, label: `Tank ${nodeNo}`,
    // ASSUMPTION from the project definition: Node 1 is real hardware, Nodes 2–5 are simulated.
    // The raw files carry no marker either way — CONFIRM and edit here, then `npm run db:reset`.
    simulated: nodeNo !== 1,
  });
  console.log(`${rep.ok ? "✔" : "✘"} ${deviceId}  ${rep.count} rows  ${new Date(rep.startT).toISOString()} → ${new Date(rep.endT).toISOString()}  cadence ${rep.medianCadenceS}s  dist ${rep.minDistanceCm}–${rep.maxDistanceCm} cm${rep.problems.length ? "  ⚠ " + rep.problems.join("; ") : ""}`);
}

fs.writeFileSync(path.join(PROCESSED_DIR, "devices.json"), JSON.stringify(devices, null, 2));
const manifest: Manifest = {
  schema: 1, generatedAt: new Date().toISOString(), devices: devices.map((d) => d.deviceId),
  startT, endT, cadenceS: 300, totalReadings: total, rawFiles: manifestRaw, validation: reports,
};
fs.writeFileSync(path.join(PROCESSED_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
if (reports.some((r) => !r.ok)) { console.error("\nValidation problems found — review data/processed/manifest.json"); process.exit(2); }
console.log(`\nOK — ${total} readings across ${devices.length} devices.`);

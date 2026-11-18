import { NormalizeError, normalizeUplink } from "@/dataset/normalize";
import { upsertMany } from "@/server/repos/readings";
import { isActiveIngestDevice, updateDeviceMetadata } from "@/server/repos/devices";
import { evaluateAll } from "@/server/services/alert-engine";

export class UnknownIngestDeviceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnknownIngestDeviceError";
  }
}

export function ingestUplink(raw: unknown): number {
  const { reading, device } = normalizeUplink(raw);
  if (!isActiveIngestDevice(reading.deviceId)) {
    throw new UnknownIngestDeviceError(`Unknown device ${reading.deviceId}`);
  }

  const inserted = upsertMany([{
    deviceId: reading.deviceId,
    t: reading.t,
    distanceCm: reading.distanceCm,
    fCnt: reading.fCnt,
    rssi: reading.rssi,
    snr: reading.snr,
    batteryPct: reading.batteryPct,
  }]);
  if (inserted) {
    updateDeviceMetadata(device);
    evaluateAll();
  }
  return inserted;
}

export { NormalizeError };

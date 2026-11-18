import type { DeviceMeta } from "@/dataset/normalize";
import { db } from "../db";

export function updateDeviceMetadata(device: DeviceMeta): boolean {
  const result = db().prepare(`
    UPDATE devices
    SET dev_eui = COALESCE(?, dev_eui),
        dev_addr = COALESCE(?, dev_addr),
        gateway_id = COALESCE(?, gateway_id),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        model = COALESCE(?, model)
    WHERE device_id = ?
  `).run(
    device.devEui,
    device.devAddr,
    device.gatewayId,
    device.latitude,
    device.longitude,
    device.model,
    device.deviceId
  );
  return result.changes === 1;
}

export function isActiveIngestDevice(deviceId: string): boolean {
  return Boolean(db().prepare(
    "SELECT 1 FROM devices WHERE device_id = ? AND deleted_at IS NULL"
  ).get(deviceId));
}

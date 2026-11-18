import type { DeviceMeta } from "@/dataset/normalize";
import { q, q1 } from "../db";

export async function updateDeviceMetadata(device: DeviceMeta): Promise<boolean> {
  const rows = await q(
    `UPDATE devices
     SET dev_eui = COALESCE($1, dev_eui),
         dev_addr = COALESCE($2, dev_addr),
         gateway_id = COALESCE($3, gateway_id),
         latitude = COALESCE($4, latitude),
         longitude = COALESCE($5, longitude),
         model = COALESCE($6, model)
     WHERE device_id = $7
     RETURNING device_id`,
    [
      device.devEui ?? null,
      device.devAddr ?? null,
      device.gatewayId ?? null,
      device.latitude ?? null,
      device.longitude ?? null,
      device.model ?? null,
      device.deviceId,
    ]
  );
  return rows.length === 1;
}

export async function isActiveIngestDevice(deviceId: string): Promise<boolean> {
  const row = await q1<{ device_id: string }>(
    "SELECT device_id FROM devices WHERE device_id = $1 AND deleted_at IS NULL",
    [deviceId]
  );
  return Boolean(row);
}

/** Set simulated = false for device and its tank when a real uplink arrives */
export async function markReal(deviceId: string): Promise<void> {
  await q("UPDATE devices SET simulated = FALSE WHERE device_id = $1 AND simulated = TRUE", [deviceId]);
}

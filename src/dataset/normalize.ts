import { TtsBodySchema } from "./schema";

/** The one canonical row stored for every uplink — identical for file seed, SQLite, and the live webhook. */
export interface NormalizedUplink {
  deviceId: string;
  t: number; // epoch ms UTC (TTS event time)
  distanceCm: number;
  fCnt: number | null;
  rssi: number | null;
  snr: number | null;
  batteryPct: number | null;
  gatewayId: string | null;
  spreadingFactor: number | null;
  payloadMatches: boolean | null; // cross-check: raw bytes vs decoded distance
}

export interface DeviceMeta {
  deviceId: string; devEui: string | null; devAddr: string | null; gatewayId: string | null;
  latitude: number | null; longitude: number | null; model: string | null;
}

export class NormalizeError extends Error {}

/** JS Date only reads 3 fractional digits; TTS sends 9. Truncate, don't round. */
export const parseTs = (s: string): number => {
  const ms = Date.parse(s.replace(/(\.\d{3})\d+/, "$1"));
  if (Number.isNaN(ms)) throw new NormalizeError(`bad timestamp: ${s}`);
  return ms;
};

/**
 * TTS decodes ALL five node slots into every uplink (Node1…Node5_distance_cm) and only the
 * sending node's slot is non-null. We require EXACTLY ONE non-null slot and that it matches the device.
 */
export function normalizeUplink(raw: unknown): { reading: NormalizedUplink; device: DeviceMeta } {
  const r = raw as Record<string, unknown>;
  const body = TtsBodySchema.parse((r.data as unknown) ?? r);
  const um = body.uplink_message;

  const slots = Object.entries(um.decoded_payload).filter(([k, v]) => /^Node\d+_distance_cm$/.test(k) && v != null);
  if (slots.length !== 1) throw new NormalizeError(`expected exactly 1 non-null distance slot, got ${slots.length} (${body.end_device_ids.device_id})`);
  const [slotKey, distance] = slots[0]! as [string, number];

  const deviceId = body.end_device_ids.device_id;
  const slotNo = Number(/Node(\d+)/.exec(slotKey)![1]);
  const devNo = Number(/(\d+)$/.exec(deviceId)?.[1]);
  if (Number.isFinite(devNo) && devNo !== slotNo) throw new NormalizeError(`${deviceId} reported in slot Node${slotNo}`);

  const rx = um.rx_metadata?.[0];
  const timeStr = (r.time as string | undefined) ?? body.received_at ?? um.received_at;
  if (!timeStr) throw new NormalizeError("no timestamp");

  let payloadMatches: boolean | null = null;
  if (um.frm_payload) {
    const b = Buffer.from(um.frm_payload, "base64");
    if (b.length >= 7) payloadMatches = b.readUInt16BE(5) === distance; // bytes 5–6 carry the distance in this firmware
  }

  return {
    reading: {
      deviceId, t: parseTs(timeStr), distanceCm: distance,
      fCnt: um.f_cnt ?? null, rssi: rx?.rssi ?? null, snr: rx?.snr ?? null,
      batteryPct: um.last_battery_percentage?.value ?? null,
      gatewayId: rx?.gateway_ids?.gateway_id ?? null,
      spreadingFactor: um.settings?.data_rate?.lora?.spreading_factor ?? null,
      payloadMatches,
    },
    device: {
      deviceId, devEui: body.end_device_ids.dev_eui ?? null, devAddr: body.end_device_ids.dev_addr ?? null,
      gatewayId: rx?.gateway_ids?.gateway_id ?? null,
      latitude: um.locations?.user?.latitude ?? null, longitude: um.locations?.user?.longitude ?? null,
      model: um.version_ids?.model_id ?? null,
    },
  };
}

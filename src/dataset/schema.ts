import { z } from "zod";

/**
 * Minimal contract for a The Things Stack uplink. Accepts BOTH shapes:
 *  1. Event-stream / storage export  → { name:"as.up.data.forward", time, data:{ end_device_ids, uplink_message } }
 *  2. Live webhook body              → { end_device_ids, received_at, uplink_message }
 * Unknown fields are kept (looseObject) so we never reject a record for extra TTS metadata.
 */
const UplinkMessage = z.looseObject({
  f_cnt: z.number().int().optional(),
  frm_payload: z.string().optional(),
  decoded_payload: z.record(z.string(), z.number().nullable()),
  received_at: z.string().optional(),
  rx_metadata: z
    .array(z.looseObject({
      gateway_ids: z.looseObject({ gateway_id: z.string().optional() }).optional(),
      rssi: z.number().optional(),
      snr: z.number().optional(),
    }))
    .optional(),
  settings: z.looseObject({ data_rate: z.looseObject({ lora: z.looseObject({ spreading_factor: z.number().optional() }).optional() }).optional() }).optional(),
  last_battery_percentage: z.looseObject({ value: z.number() }).optional(),
  locations: z.looseObject({ user: z.looseObject({ latitude: z.number(), longitude: z.number() }).optional() }).optional(),
  version_ids: z.looseObject({ model_id: z.string().optional() }).optional(),
});

const Body = z.looseObject({
  end_device_ids: z.looseObject({ device_id: z.string(), dev_eui: z.string().optional(), dev_addr: z.string().optional() }),
  received_at: z.string().optional(),
  uplink_message: UplinkMessage,
});

export const TtsUplinkSchema = z.looseObject({ time: z.string().optional(), data: Body.optional() }).superRefine((v, ctx) => {
  if (!v.data && !("end_device_ids" in v)) ctx.addIssue({ code: "custom", message: "not a TTS uplink (no data / end_device_ids)" });
});
export type TtsBody = z.infer<typeof Body>;
export { Body as TtsBodySchema };

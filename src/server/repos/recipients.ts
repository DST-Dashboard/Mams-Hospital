import { ChannelSchema } from "@/contracts/common";
import { z } from "zod";
import { q } from "../db";

const Channels = z.array(ChannelSchema).min(1).max(6);
type Channel = z.infer<typeof ChannelSchema>;

export interface AlertRecipient {
  userId: number;
  channels: Channel[];
  tier?: number;
}

export async function listForTank(tankId: number): Promise<AlertRecipient[]> {
  const rows = await q<{ user_id: number; channels: unknown; tier: number }>(
    "SELECT user_id, channels, tier FROM alert_recipients WHERE tank_id = $1 ORDER BY tier ASC, user_id ASC",
    [tankId]
  );
  return rows.map((row) => ({
    userId: Number(row.user_id),
    channels: Channels.parse(row.channels),
    tier: Number(row.tier ?? 1),
  }));
}

export async function setForTank(
  tankId: number,
  userId: number,
  channels: Channel[],
  tier = 1
): Promise<void> {
  const validated = Channels.parse(channels);
  await q(
    `INSERT INTO alert_recipients (tank_id, user_id, channels, tier, created_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tank_id, user_id)
     DO UPDATE SET channels = EXCLUDED.channels, tier = EXCLUDED.tier`,
    [tankId, userId, JSON.stringify(validated), tier, Date.now()]
  );
}

export async function removeForTank(tankId: number, userId: number): Promise<boolean> {
  const rows = await q(
    "DELETE FROM alert_recipients WHERE tank_id = $1 AND user_id = $2 RETURNING user_id",
    [tankId, userId]
  );
  return rows.length > 0;
}

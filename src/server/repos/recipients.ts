import { ChannelSchema } from "@/contracts/common";
import { z } from "zod";
import { db } from "../db";

const Channels = z.array(ChannelSchema).min(1).max(6);
type Channel = z.infer<typeof ChannelSchema>;
export interface AlertRecipient { userId: number; channels: z.infer<typeof Channels> }

export function listForTank(tankId: number): AlertRecipient[] {
  const rows = db().prepare("SELECT user_id, channels FROM alert_recipients WHERE tank_id = ?").all(tankId) as
    Array<{ user_id: number; channels: string }>;
  return rows.map((row) => ({ userId: row.user_id, channels: Channels.parse(JSON.parse(row.channels)) }));
}

export function setForTank(tankId: number, userId: number, channels: Channel[]): void {
  const validated = Channels.parse(channels);
  db().prepare(`
    INSERT INTO alert_recipients (tank_id, user_id, channels, created_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(tank_id, user_id) DO UPDATE SET channels=excluded.channels
  `).run(tankId, userId, JSON.stringify(validated), Date.now());
}

export function removeForTank(tankId: number, userId: number): boolean {
  return db().prepare("DELETE FROM alert_recipients WHERE tank_id = ? AND user_id = ?").run(tankId, userId).changes > 0;
}

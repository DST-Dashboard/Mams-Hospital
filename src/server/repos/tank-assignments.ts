import { q, q1 } from "../db";
import { byId } from "./users";

export interface TankAssignment {
  tankId: number;
  userId: number;
  assignedAt: number;
}

export async function isUserPermittedForTank(userId: number, tankId: number): Promise<boolean> {
  const user = await byId(userId);
  if (!user || user.disabled) return false;
  if (user.role === "admin") return true;
  if (user.role !== "operator") return false;
  const assigned = await q1<{ tank_id: number }>(
    "SELECT tank_id FROM tank_assignments WHERE tank_id = $1 AND user_id = $2",
    [tankId, userId]
  );
  return assigned != null;
}

export async function getAssignedTankIdsForUser(userId: number): Promise<number[] | "all"> {
  const user = await byId(userId);
  if (!user || user.disabled) return [];
  if (user.role === "admin") return "all";

  const rows = await q<{ tank_id: number }>(
    "SELECT tank_id FROM tank_assignments WHERE user_id = $1",
    [userId]
  );
  return rows.map((r) => r.tank_id);
}

export async function assignUserToTank(tankId: number, userId: number): Promise<void> {
  await q(
    `INSERT INTO tank_assignments (tank_id, user_id, assigned_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (tank_id, user_id) DO NOTHING`,
    [tankId, userId, Date.now()]
  );
}

export async function unassignUserFromTank(tankId: number, userId: number): Promise<void> {
  await q(
    "DELETE FROM tank_assignments WHERE tank_id = $1 AND user_id = $2",
    [tankId, userId]
  );
}

export async function listTankAssignments(tankId?: number): Promise<TankAssignment[]> {
  const sql = tankId != null
    ? "SELECT tank_id, user_id, assigned_at FROM tank_assignments WHERE tank_id = $1 ORDER BY user_id ASC"
    : "SELECT tank_id, user_id, assigned_at FROM tank_assignments ORDER BY tank_id ASC, user_id ASC";
  const params = tankId != null ? [tankId] : [];
  const rows = await q<{ tank_id: number; user_id: number; assigned_at: number }>(sql, params);
  return rows.map((r) => ({
    tankId: r.tank_id,
    userId: r.user_id,
    assignedAt: Number(r.assigned_at),
  }));
}

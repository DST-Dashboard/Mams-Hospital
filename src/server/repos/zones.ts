import { db, tx } from "../db";
import type { ZoneDTO, ZoneInput } from "@/contracts/tanks";

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const map = (r: Raw): ZoneDTO => ({
  id: r.id,
  name: r.name,
  description: r.description ?? null,
  createdAt: r.created_at,
  tankCount: r.tank_count != null ? Number(r.tank_count) : 0,
});

export function listZones(): ZoneDTO[] {
  const sql = `
    SELECT z.*, COUNT(t.id) as tank_count
    FROM zones z
    LEFT JOIN tanks t ON t.zone = z.name AND t.deleted_at IS NULL
    GROUP BY z.id
    ORDER BY z.name ASC
  `;
  const rows = db().prepare(sql).all() as Raw[];
  return rows.map(map);
}

export function getZone(id: number): ZoneDTO | undefined {
  const sql = `
    SELECT z.*, COUNT(t.id) as tank_count
    FROM zones z
    LEFT JOIN tanks t ON t.zone = z.name AND t.deleted_at IS NULL
    WHERE z.id = ?
    GROUP BY z.id
  `;
  const row = db().prepare(sql).get(id) as Raw | undefined;
  return row ? map(row) : undefined;
}

export function getZoneByName(name: string): ZoneDTO | undefined {
  const sql = `
    SELECT z.*, COUNT(t.id) as tank_count
    FROM zones z
    LEFT JOIN tanks t ON t.zone = z.name AND t.deleted_at IS NULL
    WHERE z.name = ?
    GROUP BY z.id
  `;
  const row = db().prepare(sql).get(name) as Raw | undefined;
  return row ? map(row) : undefined;
}

export function createZone(input: ZoneInput): number {
  const existing = getZoneByName(input.name);
  if (existing) {
    throw new Error(`Zone '${input.name}' already exists`);
  }
  const r = db()
    .prepare("INSERT INTO zones (name, description, created_at) VALUES (?, ?, ?)")
    .run(input.name, input.description ?? null, Date.now());
  return Number(r.lastInsertRowid);
}

export function updateZone(id: number, input: ZoneInput): void {
  const before = getZone(id);
  if (!before) throw new Error("Zone not found");

  if (input.name !== before.name) {
    const duplicate = getZoneByName(input.name);
    if (duplicate && duplicate.id !== id) {
      throw new Error(`Zone '${input.name}' already exists`);
    }
  }

  tx(() => {
    db()
      .prepare("UPDATE zones SET name = ?, description = ? WHERE id = ?")
      .run(input.name, input.description ?? null, id);

    // If name changed, update tanks referencing the old name
    if (input.name !== before.name) {
      db()
        .prepare("UPDATE tanks SET zone = ? WHERE zone = ?")
        .run(input.name, before.name);
    }
  });
}

export function deleteZone(id: number, force = false): void {
  const zone = getZone(id);
  if (!zone) throw new Error("Zone not found");

  if (zone.tankCount && zone.tankCount > 0 && !force) {
    throw new Error(`Cannot delete zone '${zone.name}' with ${zone.tankCount} active tanks. Reassign tanks or use force.`);
  }

  tx(() => {
    // Unassign tanks from this zone
    db().prepare("UPDATE tanks SET zone = NULL WHERE zone = ?").run(zone.name);
    // Delete zone
    db().prepare("DELETE FROM zones WHERE id = ?").run(id);
  });
}

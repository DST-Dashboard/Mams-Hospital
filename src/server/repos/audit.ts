import { q, q1 } from "../db";
import type { AuditEntryDTO, AuditQuery } from "@/contracts/audit";
import type { z } from "zod";

type QueryParams = z.infer<typeof AuditQuery>;

/** Every state-changing action goes through here. before/after are JSONB snapshots. */
export async function audit(e: {
  userId: number | null;
  action: string;
  entity: string;
  entityId?: string | number;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}): Promise<void> {
  await q(
    `INSERT INTO audit_log (t, user_id, action, entity, entity_id, before_json, after_json, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      Date.now(),
      e.userId,
      e.action,
      e.entity,
      e.entityId == null ? null : String(e.entityId),
      e.before != null ? JSON.stringify(e.before) : null,
      e.after != null ? JSON.stringify(e.after) : null,
      e.ip ?? null,
    ]
  );
}

export async function listAudit(params: QueryParams): Promise<{
  items: AuditEntryDTO[];
  total: number;
  page: number;
  pageSize: number;
}> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const queryArgs: unknown[] = [];
  let pIdx = 1;

  if (params.entity) {
    conditions.push(`a.entity = $${pIdx++}`);
    queryArgs.push(params.entity);
  }
  if (params.userId != null) {
    conditions.push(`a.user_id = $${pIdx++}`);
    queryArgs.push(params.userId);
  }
  if (params.action) {
    conditions.push(`a.action = $${pIdx++}`);
    queryArgs.push(params.action);
  }
  if (params.from != null) {
    conditions.push(`a.t >= $${pIdx++}`);
    queryArgs.push(params.from);
  }
  if (params.to != null) {
    conditions.push(`a.t <= $${pIdx++}`);
    queryArgs.push(params.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count total
  const countSql = `SELECT COUNT(*)::int as count FROM audit_log a ${whereClause}`;
  const totalRow = await q1<{ count: number }>(countSql, queryArgs);
  const total = totalRow?.count ? Number(totalRow.count) : 0;

  // Query page
  queryArgs.push(pageSize);
  const limitPlaceholder = `$${pIdx++}`;
  queryArgs.push(offset);
  const offsetPlaceholder = `$${pIdx++}`;

  const dataSql = `
    SELECT a.*, u.name as user_name
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.user_id
    ${whereClause}
    ORDER BY a.t DESC, a.id DESC
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
  `;

  interface AuditRow {
    id: number;
    t: number;
    user_id: number | null;
    user_name: string | null;
    action: string;
    entity: string;
    entity_id: string | null;
    before_json: unknown;
    after_json: unknown;
    ip: string | null;
  }

  const rows = await q<AuditRow>(dataSql, queryArgs);

  const items: AuditEntryDTO[] = rows.map((r) => ({
    id: Number(r.id),
    t: Number(r.t),
    user: r.user_id != null ? { id: Number(r.user_id), name: r.user_name ?? `User #${r.user_id}` } : null,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    before: r.before_json,
    after: r.after_json,
    ip: r.ip,
  }));

  return {
    items,
    total,
    page,
    pageSize,
  };
}

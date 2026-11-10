import { db } from "../db";
import type { AuditEntryDTO, AuditQuery } from "@/contracts/audit";
import type { z } from "zod";

type QueryParams = z.infer<typeof AuditQuery>;

/** Every state-changing action goes through here (§11.3). before/after are JSON snapshots. */
export function audit(e: {
  userId: number | null;
  action: string;
  entity: string;
  entityId?: string | number;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
}) {
  db()
    .prepare(
      "INSERT INTO audit_log (t,user_id,action,entity,entity_id,before_json,after_json,ip) VALUES (?,?,?,?,?,?,?,?)"
    )
    .run(
      Date.now(),
      e.userId,
      e.action,
      e.entity,
      e.entityId == null ? null : String(e.entityId),
      e.before == null ? null : JSON.stringify(e.before),
      e.after == null ? null : JSON.stringify(e.after),
      e.ip ?? null
    );
}

function safeParseJson(json: string | null): unknown {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function listAudit(params: QueryParams): {
  items: AuditEntryDTO[];
  total: number;
  page: number;
  pageSize: number;
} {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, params.pageSize ?? 50));
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const queryArgs: (string | number)[] = [];

  if (params.entity) {
    conditions.push("a.entity = ?");
    queryArgs.push(params.entity);
  }
  if (params.userId != null) {
    conditions.push("a.user_id = ?");
    queryArgs.push(params.userId);
  }
  if (params.action) {
    conditions.push("a.action = ?");
    queryArgs.push(params.action);
  }
  if (params.from != null) {
    conditions.push("a.t >= ?");
    queryArgs.push(params.from);
  }
  if (params.to != null) {
    conditions.push("a.t <= ?");
    queryArgs.push(params.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  // Count total
  const countSql = `SELECT COUNT(*) as count FROM audit_log a ${whereClause}`;
  const totalRow = db().prepare(countSql).get(...queryArgs) as { count: number } | undefined;
  const total = totalRow?.count ?? 0;

  // Query page
  const dataSql = `
    SELECT a.*, u.name as user_name
    FROM audit_log a
    LEFT JOIN users u ON u.id = a.user_id
    ${whereClause}
    ORDER BY a.t DESC, a.id DESC
    LIMIT ? OFFSET ?
  `;
  const rows = db().prepare(dataSql).all(...queryArgs, pageSize, offset) as Array<{
    id: number;
    t: number;
    user_id: number | null;
    user_name: string | null;
    action: string;
    entity: string;
    entity_id: string | null;
    before_json: string | null;
    after_json: string | null;
    ip: string | null;
  }>;

  const items: AuditEntryDTO[] = rows.map((r) => ({
    id: r.id,
    t: r.t,
    user: r.user_id != null ? { id: r.user_id, name: r.user_name ?? `User #${r.user_id}` } : null,
    action: r.action,
    entity: r.entity,
    entityId: r.entity_id,
    before: safeParseJson(r.before_json),
    after: safeParseJson(r.after_json),
    ip: r.ip,
  }));

  return {
    items,
    total,
    page,
    pageSize,
  };
}

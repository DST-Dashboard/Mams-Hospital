import { db } from "../db";
/** Every state-changing action goes through here (§11.3). before/after are JSON snapshots. */
export function audit(e: { userId: number | null; action: string; entity: string; entityId?: string | number; before?: unknown; after?: unknown; ip?: string | null }) {
  db().prepare("INSERT INTO audit_log (t,user_id,action,entity,entity_id,before_json,after_json,ip) VALUES (?,?,?,?,?,?,?,?)")
    .run(Date.now(), e.userId, e.action, e.entity, e.entityId == null ? null : String(e.entityId), e.before == null ? null : JSON.stringify(e.before), e.after == null ? null : JSON.stringify(e.after), e.ip ?? null);
}

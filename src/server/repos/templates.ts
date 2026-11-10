import { db } from "../db";
import type { ThresholdTemplateDTO, ThresholdTemplateInput } from "@/contracts/tanks";

type Raw = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const map = (r: Raw): ThresholdTemplateDTO => ({
  id: r.id,
  name: r.name,
  description: r.description ?? null,
  warnPct: r.warn_pct,
  critPct: r.crit_pct,
  emptyPct: r.empty_pct,
  overflowMarginCm: r.overflow_margin_cm,
  persistence: r.persistence,
  cooldownMin: r.cooldown_min,
  hysteresisPct: r.hysteresis_pct,
  noDataMin: r.no_data_min,
  spikeCm: r.spike_cm,
  createdAt: r.created_at,
});

export function listTemplates(): ThresholdTemplateDTO[] {
  const rows = db().prepare("SELECT * FROM threshold_templates ORDER BY name ASC").all() as Raw[];
  return rows.map(map);
}

export function getTemplate(id: number): ThresholdTemplateDTO | undefined {
  const row = db().prepare("SELECT * FROM threshold_templates WHERE id = ?").get(id) as Raw | undefined;
  return row ? map(row) : undefined;
}

export function getTemplateByName(name: string): ThresholdTemplateDTO | undefined {
  const row = db().prepare("SELECT * FROM threshold_templates WHERE name = ?").get(name) as Raw | undefined;
  return row ? map(row) : undefined;
}

export function createTemplate(input: ThresholdTemplateInput): number {
  const existing = getTemplateByName(input.name);
  if (existing) {
    throw new Error(`Template '${input.name}' already exists`);
  }
  const r = db()
    .prepare(`
      INSERT INTO threshold_templates (
        name, description, warn_pct, crit_pct, empty_pct,
        overflow_margin_cm, persistence, cooldown_min,
        hysteresis_pct, no_data_min, spike_cm, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.name,
      input.description ?? null,
      input.warnPct,
      input.critPct,
      input.emptyPct,
      input.overflowMarginCm,
      input.persistence,
      input.cooldownMin,
      input.hysteresisPct,
      input.noDataMin,
      input.spikeCm,
      Date.now()
    );
  return Number(r.lastInsertRowid);
}

export function updateTemplate(id: number, input: ThresholdTemplateInput): void {
  const before = getTemplate(id);
  if (!before) throw new Error("Template not found");

  if (input.name !== before.name) {
    const duplicate = getTemplateByName(input.name);
    if (duplicate && duplicate.id !== id) {
      throw new Error(`Template '${input.name}' already exists`);
    }
  }

  db()
    .prepare(`
      UPDATE threshold_templates SET
        name = ?, description = ?, warn_pct = ?, crit_pct = ?, empty_pct = ?,
        overflow_margin_cm = ?, persistence = ?, cooldown_min = ?,
        hysteresis_pct = ?, no_data_min = ?, spike_cm = ?
      WHERE id = ?
    `)
    .run(
      input.name,
      input.description ?? null,
      input.warnPct,
      input.critPct,
      input.emptyPct,
      input.overflowMarginCm,
      input.persistence,
      input.cooldownMin,
      input.hysteresisPct,
      input.noDataMin,
      input.spikeCm,
      id
    );
}

export function deleteTemplate(id: number): void {
  const before = getTemplate(id);
  if (!before) throw new Error("Template not found");
  db().prepare("DELETE FROM threshold_templates WHERE id = ?").run(id);
}

export function applyTemplateToTank(templateId: number, tankId: number): void {
  const tmpl = getTemplate(templateId);
  if (!tmpl) throw new Error("Template not found");

  db()
    .prepare(`
      UPDATE tanks SET
        warn_pct = ?, crit_pct = ?, empty_pct = ?,
        overflow_margin_cm = ?, persistence = ?, cooldown_min = ?,
        hysteresis_pct = ?, no_data_min = ?, spike_cm = ?,
        updated_at = ?
      WHERE id = ?
    `)
    .run(
      tmpl.warnPct,
      tmpl.critPct,
      tmpl.emptyPct,
      tmpl.overflowMarginCm,
      tmpl.persistence,
      tmpl.cooldownMin,
      tmpl.hysteresisPct,
      tmpl.noDataMin,
      tmpl.spikeCm,
      Date.now(),
      tankId
    );
}

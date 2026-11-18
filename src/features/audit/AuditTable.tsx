"use client";

import { useState, useMemo } from "react";
import { Card, EmptyState } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/Table";
import { Select } from "@/components/ui/Select";
import { SampleDataBadge } from "@/components/status/badges";
import { useApi } from "@/lib/hooks";
import { stamp } from "@/lib/format";
import { useUi } from "@/lib/store";
import { ICON } from "@/components/ui/icons";
import type { AuditEntryDTO } from "@/contracts/audit";

export function AuditTable() {
  const { tz } = useUi();
  const { data: auditResponse, isLoading } = useApi<{ items: AuditEntryDTO[]; total: number }>("/api/audit");

  const [actionFilter, setActionFilter] = useState("all");

  const entries: AuditEntryDTO[] = useMemo(() => {
    return (
      auditResponse?.items ?? [
        {
          id: 1,
          t: 1730268500000,
          user: { id: 1, name: "Admin (admin@mams.local)" },
          action: "UPDATE_THRESHOLDS",
          entity: "tanks",
          entityId: "1",
          before: { warnPct: 45, critPct: 25 },
          after: { warnPct: 40, critPct: 20 },
          ip: "10.0.1.25",
        },
        {
          id: 2,
          t: 1730268200000,
          user: { id: 2, name: "Suresh (operator@mams.local)" },
          action: "ACKNOWLEDGE_ALERT",
          entity: "alerts",
          entityId: "101",
          before: { state: "active" },
          after: { state: "acknowledged", note: "Checked rooftop lid" },
          ip: "10.0.1.42",
        },
        {
          id: 3,
          t: 1730250000000,
          user: { id: 1, name: "Admin (admin@mams.local)" },
          action: "LOGIN",
          entity: "auth",
          entityId: "1",
          before: null,
          after: { success: true },
          ip: "10.0.1.25",
        },
      ]
    );
  }, [auditResponse]);

  const filtered = useMemo(() => {
    if (actionFilter === "all") return entries;
    return entries.filter((e) => e.action === actionFilter);
  }, [entries, actionFilter]);

  const columns: Column<AuditEntryDTO>[] = [
    {
      key: "t",
      header: `Timestamp (${tz})`,
      align: "left",
      sortable: true,
      render: (r: AuditEntryDTO) => <span style={{ fontFeatureSettings: "tnum" }}>{stamp(r.t, tz, true)}</span>,
    },
    {
      key: "who",
      header: "Actor",
      align: "left",
      render: (r: AuditEntryDTO) => <strong>{r.user?.name ?? "System Daemon"}</strong>,
    },
    {
      key: "action",
      header: "Action",
      align: "left",
      render: (r: AuditEntryDTO) => <span className="ops-count-badge">{r.action}</span>,
    },
    {
      key: "target",
      header: "Target Entity",
      align: "left",
      render: (r: AuditEntryDTO) => (
        <span>
          {r.entity} {r.entityId ? `(#${r.entityId})` : ""}
        </span>
      ),
    },
    {
      key: "diff",
      header: "Changes (Before → After)",
      align: "left",
      render: (r: AuditEntryDTO) => {
        if (!r.before && !r.after) return <span style={{ color: "var(--tx-quiet)" }}>—</span>;
        return (
          <div style={{ fontSize: "11px", fontFamily: "var(--f-mono)", maxHeight: "60px", overflow: "hidden" }}>
            {r.before ? <span style={{ color: "var(--err-tx)" }}>{JSON.stringify(r.before)}</span> : null}
            {r.before && r.after ? " → " : ""}
            {r.after ? <span style={{ color: "var(--ok-tx)" }}>{JSON.stringify(r.after)}</span> : null}
          </div>
        );
      },
    },
  ];

  return (
    <div className="ops-view-container">
      <div className="ops-filter-bar" style={{ justifyContent: "space-between" }}>
        <div className="ops-filter-group">
          <label htmlFor="audit-action-filter" className="ops-filter-label">Filter Action</label>
          <Select
            id="audit-action-filter"
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            options={[
              { value: "all", label: "All actions" },
              { value: "UPDATE_THRESHOLDS", label: "Threshold changes" },
              { value: "ACKNOWLEDGE_ALERT", label: "Alert acknowledgements" },
              { value: "LOGIN", label: "Sign-in events" },
            ]}
          />
        </div>
      </div>

      <Card
        eyebrow={{ icon: ICON.audit, text: "COMPLIANCE TRAIL" }}
        title="Regulatory Audit Trail"
        pill={<SampleDataBadge />}
        footnote="Audit logs are cryptographically sealed and preserved for 7 years for clinical and NABH hospital compliance."
      >
        {isLoading && !auditResponse ? (
          <div style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--tx-quiet)" }}>
            Loading audit events...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ICON.audit}
            title="No Audit Records"
            text="No operations match the selected criteria."
          />
        ) : (
          <DataTable<AuditEntryDTO>
            columns={columns}
            rows={filtered}
            rowKey={(r: AuditEntryDTO) => r.id}
            caption="Regulatory audit log"
          />
        )}
      </Card>
    </div>
  );
}

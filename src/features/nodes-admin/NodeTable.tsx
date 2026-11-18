"use client";

import { useState, useMemo } from "react";
import { Card, EmptyState } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { NodeStatusChip, SourceChip } from "@/components/status/badges";
import { useToast } from "@/components/ui/Toast";
import { useTanks, useDashboard, useMe } from "@/lib/hooks";
import { del } from "@/lib/api";
import { ago } from "@/lib/format";
import { canMutateTanks } from "@/lib/roles";
import { ICON } from "@/components/ui/icons";
import { StatusMenu } from "./StatusMenu";
import { DeleteNodeDialog } from "./DeleteNodeDialog";
import { EditNodeForm } from "./EditNodeForm";
import { AddNodeDialog } from "./AddNodeDialog";
import type { TankRow } from "@/lib/types";

export function NodeTable() {
  const toast = useToast();
  const { data: me } = useMe();
  const { data: dashboard } = useDashboard();
  const { data: allTanks, isLoading, mutate } = useTanks({ deleted: true });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const [addOpen, setAddOpen] = useState(false);
  const [editingTank, setEditingTank] = useState<TankRow | null>(null);
  const [deletingTank, setDeletingTank] = useState<TankRow | null>(null);

  const isAdmin = canMutateTanks(me?.role);

  // Active / non-deleted tanks
  const activeTanks = useMemo(() => {
    return (allTanks ?? []).filter((t) => !t.deletedAt);
  }, [allTanks]);

  // Soft-deleted tanks
  const deletedTanks = useMemo(() => {
    return (allTanks ?? []).filter((t) => !!t.deletedAt);
  }, [allTanks]);

  // Filtered active tanks
  const filteredTanks = useMemo(() => {
    return activeTanks.filter((t) => {
      if (statusFilter !== "all" && t.status !== statusFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesLabel = t.label.toLowerCase().includes(q);
        const matchesEui = t.deviceId?.toLowerCase().includes(q);
        if (!matchesLabel && !matchesEui) return false;
      }
      return true;
    });
  }, [activeTanks, statusFilter, searchQuery]);

  // Restore deleted tank
  const handleRestore = async (tank: TankRow) => {
    try {
      await del(`/api/tanks/${tank.id}?restore=1`);
      toast.success(`${tank.label} restored successfully.`);
      mutate();
    } catch {
      toast.error("Failed to restore node.");
    }
  };

  const asOf = dashboard?.asOf ?? Date.now();

  const columns: Column<TankRow>[] = [
    {
      key: "label",
      header: "Node / Tank",
      align: "left",
      sortable: true,
      render: (r: TankRow) => (
        <div>
          <strong>{r.label}</strong>
          {r.status === "draft" && (
            <span style={{ display: "block", fontSize: "11px", color: "var(--tx-quiet)" }}>
              Awaiting first reading · 5:00
            </span>
          )}
        </div>
      ),
    },
    {
      key: "deviceId",
      header: "Device EUI",
      align: "left",
      render: (r: TankRow) => (
        <span style={{ fontFamily: "var(--f-mono)", fontSize: "12px" }}>
          {r.deviceId || "—"}
        </span>
      ),
    },
    {
      key: "location",
      header: "Location",
      align: "left",
      render: (r: TankRow) => (
        <span>
          {r.zone ? `${r.zone} · ` : ""}
          {r.location || "Rooftop"}
        </span>
      ),
    },
    {
      key: "dimensions",
      header: "Dimensions (cm)",
      align: "left",
      render: (r: TankRow) => {
        const h = r.geometry?.heightCm ?? 300;
        const isCyl = r.geometry?.shape?.kind === "cylinder";
        if (isCyl) {
          const rad = (r.geometry?.shape as { radiusCm?: number })?.radiusCm ?? 100;
          return <span>H {h} × R {rad}</span>;
        }
        const w = (r.geometry?.shape as { widthCm?: number })?.widthCm ?? 100;
        const l = (r.geometry?.shape as { lengthCm?: number })?.lengthCm ?? 100;
        return <span>{w} × {l} × {h}</span>;
      },
    },
    {
      key: "status",
      header: "Status",
      align: "left",
      sortable: true,
      render: (r: TankRow) => <NodeStatusChip status={r.status} />,
    },
    {
      key: "lastUplink",
      header: "Last Uplink",
      align: "left",
      render: (r: TankRow) => {
        const liveCard = dashboard?.tanks?.find((dt) => dt.id === r.id);
        const lastT = liveCard?.current?.t;
        return <span>{lastT ? ago(lastT, asOf) : "Never"}</span>;
      },
    },
    {
      key: "source",
      header: "Source",
      align: "left",
      render: (r: TankRow) => <SourceChip simulated={r.simulated} />,
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r: TankRow) => (
        <div className="ops-table-action-cell" onClick={(e) => e.stopPropagation()}>
          <StatusMenu tank={r} onSuccess={mutate} />
          <Button
            variant="outline"
            size="sm"
            icon={ICON.edit}
            onClick={() => setEditingTank(r)}
            title="Edit node dimensions and metadata"
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={ICON.remove}
            onClick={() => setDeletingTank(r)}
            title="Soft delete node"
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (!isAdmin) {
    return (
      <EmptyState
        icon={ICON.lock}
        title="Admin Privilege Required"
        text="Hardware node administration, physical calibration and provisioning require Administrator credentials."
      />
    );
  }

  return (
    <div className="ops-view-container">
      {/* Filters and Add Action Bar */}
      <div className="ops-filter-bar" style={{ justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "var(--sp-4)", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div className="ops-filter-group">
            <label htmlFor="node-search" className="ops-filter-label">Search</label>
            <input
              id="node-search"
              type="text"
              placeholder="Search by label or EUI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="field"
              style={{ minWidth: "220px" }}
            />
          </div>

          <div className="ops-filter-group">
            <label htmlFor="node-status-filter" className="ops-filter-label">Status</label>
            <Select
              id="node-status-filter"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: "all", label: "All statuses" },
                { value: "active", label: "Active" },
                { value: "maintenance", label: "Maintenance" },
                { value: "offline", label: "Offline" },
                { value: "draft", label: "Draft" },
              ]}
            />
          </div>
        </div>

        <Button variant="primary" icon={ICON.add} onClick={() => setAddOpen(true)}>
          Add node
        </Button>
      </div>

      {/* Nodes Table Card */}
      <Card
        eyebrow={{ icon: ICON.gateway, text: "HARDWARE FLEET" }}
        title="Provisioned Sensor Nodes"
        pill={<span>{filteredTanks.length} nodes</span>}
        footnote="Nodes report telemetry over LoRaWAN at ~5 min cadence. Soft-deleted nodes can be restored within 90 days."
      >
        {isLoading ? (
          <div style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--tx-quiet)" }}>
            Loading nodes...
          </div>
        ) : filteredTanks.length === 0 ? (
          <EmptyState
            icon={ICON.gateway}
            title="No nodes match your filter"
            text="Clear your filter criteria or provision a new hardware sensor node."
            action={
              <Button variant="outline" size="sm" onClick={() => { setStatusFilter("all"); setSearchQuery(""); }}>
                Reset filter
              </Button>
            }
          />
        ) : (
          <DataTable<TankRow>
            columns={columns}
            rows={filteredTanks}
            rowKey={(r: TankRow) => r.id}
            caption="Provisioned hospital rooftop nodes"
          />
        )}
      </Card>

      {/* Collapsed Deleted Nodes Section */}
      {deletedTanks.length > 0 && (
        <details
          style={{
            background: "var(--bg-subtle)",
            border: "1px solid var(--bd-soft)",
            borderRadius: "var(--r-xl)",
            padding: "var(--sp-4) var(--sp-6)",
          }}
        >
          <summary style={{ fontSize: "14px", fontWeight: 700, color: "var(--tx-quiet)", cursor: "pointer" }}>
            Deleted nodes ({deletedTanks.length} archived) · Restorable for 90 days
          </summary>

          <div style={{ marginTop: "var(--sp-4)" }}>
            <table className="table" style={{ width: "100%", fontSize: "13px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Node</th>
                  <th style={{ textAlign: "left" }}>Device EUI</th>
                  <th style={{ textAlign: "left" }}>Retention</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {deletedTanks.map((dt) => (
                  <tr key={dt.id}>
                    <td><strong>{dt.label}</strong></td>
                    <td style={{ fontFamily: "var(--f-mono)" }}>{dt.deviceId || "—"}</td>
                    <td style={{ color: "var(--tx-quiet)" }}>Restorable for 90 more days</td>
                    <td style={{ textAlign: "right" }}>
                      <Button variant="outline" size="sm" icon={ICON.restore} onClick={() => handleRestore(dt)}>
                        Restore
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}

      {/* Modals */}
      <AddNodeDialog open={addOpen} onClose={() => setAddOpen(false)} onSuccess={mutate} />

      {editingTank && (
        <EditNodeForm
          open={!!editingTank}
          tank={editingTank}
          allTanks={allTanks ?? []}
          onClose={() => setEditingTank(null)}
          onSuccess={mutate}
        />
      )}

      {deletingTank && (
        <DeleteNodeDialog
          open={!!deletingTank}
          tank={deletingTank}
          onClose={() => setDeletingTank(null)}
          onSuccess={mutate}
        />
      )}
    </div>
  );
}

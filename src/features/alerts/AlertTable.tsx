"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, EmptyState, Banner } from "@/components/ui/primitives";
import { DataTable, type Column, Pagination } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { SeverityChip, AlertStateChip } from "@/components/status/badges";
import { useToast } from "@/components/ui/Toast";
import { useAlerts, useDashboard, useMe } from "@/lib/hooks";
import { post } from "@/lib/api";
import { ago, stamp } from "@/lib/format";
import { useUi } from "@/lib/store";
import { canAcknowledgeAlerts } from "@/lib/roles";
import { ICON } from "@/components/ui/icons";
import { normalizeAlert, type NormalizedAlert } from "./adapter";
import { AlertFilters, type AlertFilterValues } from "./AlertFilters";
import { AckDialog } from "./AckDialog";
import "@/styles/views-ops.css";

export function AlertTable() {
  const router = useRouter();
  const toast = useToast();
  const { tz } = useUi();
  const { data: me } = useMe();
  const { data: dashboard } = useDashboard();
  const { data: rawAlerts, isLoading, mutate } = useAlerts({ state: "all" });

  const [page, setPage] = useState(1);
  const pageSize = 25;

  const [filters, setFilters] = useState<AlertFilterValues>({
    severity: "all",
    state: "all",
    tankId: "all",
    type: "all",
  });

  const [ackModalAlert, setAckModalAlert] = useState<NormalizedAlert | null>(null);

  // Build tank label map
  const tankLabelMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (dashboard?.tanks) {
      dashboard.tanks.forEach((t) => {
        map[t.id] = t.label;
      });
    }
    return map;
  }, [dashboard]);

  const tanksList = useMemo(() => {
    return dashboard?.tanks ? dashboard.tanks.map((t) => ({ id: t.id, label: t.label })) : [];
  }, [dashboard]);

  const hasUnconfirmed = useMemo(() => {
    return dashboard?.tanks?.some((t) => !t.dimsConfirmed) ?? false;
  }, [dashboard]);

  // Normalize alerts
  const normalized = useMemo(() => {
    if (!rawAlerts) return [];
    return (rawAlerts as unknown[]).map((a) => normalizeAlert(a as Record<string, unknown>, tankLabelMap));
  }, [rawAlerts, tankLabelMap]);

  // Filter alerts
  const filtered = useMemo(() => {
    return normalized.filter((a) => {
      if (filters.severity && filters.severity !== "all" && a.severity !== filters.severity) {
        return false;
      }
      if (filters.state && filters.state !== "all") {
        if (filters.state === "open" && a.state !== "active") return false;
        if (filters.state === "acknowledged" && a.state !== "acknowledged") return false;
        if (filters.state === "resolved" && a.state !== "resolved") return false;
      }
      if (filters.tankId && filters.tankId !== "all" && a.tankId !== filters.tankId) {
        return false;
      }
      if (filters.type && filters.type !== "all" && a.type !== filters.type) {
        return false;
      }
      return true;
    });
  }, [normalized, filters]);

  const pageCount = Math.ceil(filtered.length / pageSize) || 1;
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // Quick one-click Acknowledge for Operator / Admin
  const handleDirectAck = async (e: React.MouseEvent, alert: NormalizedAlert) => {
    e.stopPropagation();
    try {
      await post(`/api/alerts/${alert.id}/ack`);
      toast.success(`Alert #${alert.id} acknowledged.`);
      await mutate();
    } catch {
      toast.error("Failed to acknowledge alert.");
      await mutate();
    }
  };

  const asOf = dashboard?.asOf ?? Date.now();
  const canAck = canAcknowledgeAlerts(me?.role);

  const columns: Column<NormalizedAlert>[] = [
    {
      key: "severity",
      header: "Level",
      align: "left",
      sortable: true,
      render: (r: NormalizedAlert) => <SeverityChip severity={r.severity} />,
    },
    {
      key: "tank",
      header: "Tank",
      align: "left",
      sortable: true,
      render: (r: NormalizedAlert) => <strong>{r.tankLabel}</strong>,
    },
    {
      key: "type",
      header: "Type",
      align: "left",
      render: (r: NormalizedAlert) => <span className="ops-count-badge">{r.type}</span>,
    },
    {
      key: "message",
      header: "Message",
      align: "left",
      render: (r: NormalizedAlert) => <span>{r.message}</span>,
    },
    {
      key: "openedAt",
      header: "Fired",
      align: "left",
      sortable: true,
      render: (r: NormalizedAlert) => <span title={stamp(r.openedAt, tz, true)}>{ago(r.openedAt, asOf)}</span>,
    },
    {
      key: "state",
      header: "State",
      align: "left",
      sortable: true,
      render: (r: NormalizedAlert) => <AlertStateChip state={r.state} />,
    },
    {
      key: "ackBy",
      header: "Acknowledged by",
      align: "left",
      render: (r: NormalizedAlert) => <span>{r.acknowledgedByName ?? "—"}</span>,
    },
    {
      key: "resolvedAt",
      header: "Resolved",
      align: "left",
      render: (r: NormalizedAlert) => <span>{r.resolvedAt ? ago(r.resolvedAt, asOf) : "—"}</span>,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      render: (r: NormalizedAlert) => {
        if (!canAck || r.state !== "active") return null;
        return (
          <div className="ops-table-action-cell" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="outline"
              size="sm"
              icon={ICON.ok}
              onClick={(e) => handleDirectAck(e, r)}
              title="Acknowledge alert"
            >
              Acknowledge
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="ops-view-container">
      {hasUnconfirmed && (
        <Banner tone="info">
          Level alerts are paused until tank dimensions are confirmed by an administrator.
        </Banner>
      )}

      <AlertFilters
        values={filters}
        tanks={tanksList}
        onChange={(newVals) => {
          setFilters(newVals);
          setPage(1);
        }}
        onReset={() => {
          setFilters({ severity: "all", state: "all", tankId: "all", type: "all" });
          setPage(1);
        }}
      />

      <Card
        eyebrow={{ icon: ICON.bell, text: "ACTIVE & HISTORICAL ALERTS" }}
        title="Alert History & Actions"
        pill={<span>{filtered.length} total</span>}
      >
        {isLoading ? (
          <div style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--tx-quiet)" }}>
            Loading alerts...
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ICON.bell}
            title="No alerts match these filters"
            text="Clear a filter or widen the date range."
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({ severity: "all", state: "all", tankId: "all", type: "all" })}
              >
                Clear all filters
              </Button>
            }
          />
        ) : (
          <>
            <DataTable<NormalizedAlert>
              columns={columns}
              rows={pageRows}
              rowKey={(r: NormalizedAlert) => r.id}
              onRowClick={(r: NormalizedAlert) => router.push(`/alerts/${r.id}`)}
              caption="Hospital water alerts table"
            />
            {pageCount > 1 && (
              <div style={{ marginTop: "var(--sp-4)" }}>
                <Pagination page={page} pageCount={pageCount} onPage={(p: number) => setPage(p)} />
              </div>
            )}
          </>
        )}
      </Card>

      {ackModalAlert && (
        <AckDialog
          open={!!ackModalAlert}
          onClose={() => setAckModalAlert(null)}
          alertId={ackModalAlert.id}
          alertTitle={ackModalAlert.message}
          onSuccess={() => mutate()}
        />
      )}
    </div>
  );
}

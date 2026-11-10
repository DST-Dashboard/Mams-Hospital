"use client";

import clsx from "clsx";
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Edit,
  ExternalLink,
  Plus,
  Server,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { litres } from "@/lib/format";
import { StatusMenu } from "./StatusMenu";
import { DimensionsModal } from "./DimensionsModal";
import { DeleteNodeDialog } from "./DeleteNodeDialog";
import type { TankRow } from "@/server/repos/tanks";

export function NodeTable({
  tanks,
  loading,
  onRefresh,
}: {
  tanks: TankRow[];
  loading?: boolean;
  onRefresh?: () => void;
}) {
  const [calibratingTank, setCalibratingTank] = useState<TankRow | null>(null);
  const [deletingTank, setDeletingTank] = useState<TankRow | null>(null);

  if (!loading && tanks.length === 0) {
    return (
      <EmptyState
        icon={<Server size={28} />}
        title="No Tank Nodes Configured"
        description="No active water tank telemetry nodes found in the system database."
        action={{
          label: "Commission First Tank Node",
          onClick: () => {},
        }}
      >
        <Link href="/admin/nodes/new">
          <Button variant="primary" icon={<Plus size={16} />}>
            Commission First Tank
          </Button>
        </Link>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <Table containerClassName="shadow-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Tank Node</TableHead>
              <TableHead>Device ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Shape & Geometry</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Dimensions State</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-sm text-muted">
                  Loading tank telemetry nodes...
                </TableCell>
              </TableRow>
            ) : (
              tanks.map((t) => {
                const g = t.geometry;
                const baseAreaCm2 =
                  g.shape.kind === "cylinder"
                    ? Math.PI * (g.shape.radiusCm ?? 100) ** 2
                    : (g.shape.widthCm ?? 100) * (g.shape.lengthCm ?? 100);
                const capacityL = Math.round((baseAreaCm2 * g.heightCm) / 1000);

                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <Link
                          href={`/tanks/${t.id}`}
                          className="font-semibold text-ink hover:text-tide transition-colors flex items-center gap-1.5"
                        >
                          <span>{t.label}</span>
                          <ExternalLink size={12} className="text-muted" />
                        </Link>
                        <span className="text-xs text-muted">
                          {t.zone ? `${t.zone} · ` : ""}
                          {t.location || "Rooftop Tank"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      {t.deviceId ? (
                        <span className="font-mono text-xs text-ink bg-raised px-2 py-0.5 rounded border hairline">
                          {t.deviceId}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <StatusMenu tank={t} onUpdated={onRefresh} />
                    </TableCell>

                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        <span className="capitalize font-medium text-ink">{g.shape.kind}</span>
                        <div className="text-muted font-mono text-[11px]">
                          H: {g.heightCm} cm ·{" "}
                          {g.shape.kind === "cylinder"
                            ? `R: ${g.shape.radiusCm} cm`
                            : `${g.shape.widthCm}×${g.shape.lengthCm} cm`}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-xs font-semibold text-ink">
                        {litres(capacityL)}
                      </span>
                    </TableCell>

                    <TableCell>
                      {t.dimsConfirmed ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-ok">
                          <CheckCircle2 size={14} />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setCalibratingTank(t)}
                          className="inline-flex items-center gap-1.5 rounded bg-warn/15 border border-warn/30 px-2 py-0.5 text-xs font-medium text-warn hover:bg-warn/25 transition-colors"
                        >
                          <AlertTriangle size={13} />
                          <span>Provisional (Confirm)</span>
                        </button>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={() => setCalibratingTank(t)}
                          title="Calibrate dimensions"
                          icon={<Calculator size={14} />}
                        />

                        <Link href={`/admin/nodes/${t.id}`}>
                          <Button
                            variant="quiet"
                            size="sm"
                            title="Edit tank configuration"
                            icon={<Edit size={14} />}
                          />
                        </Link>

                        <Button
                          variant="quiet"
                          size="sm"
                          onClick={() => setDeletingTank(t)}
                          title="Decommission tank"
                          className="text-crit hover:bg-crit/10"
                          icon={<Trash2 size={14} />}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dimensions Modal */}
      <DimensionsModal
        open={calibratingTank !== null}
        onClose={() => setCalibratingTank(null)}
        tank={calibratingTank}
        onSuccess={onRefresh}
      />

      {/* Delete Dialog */}
      <DeleteNodeDialog
        open={deletingTank !== null}
        onClose={() => setDeletingTank(null)}
        tank={deletingTank}
        onSuccess={onRefresh}
      />
    </>
  );
}

"use client";

import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import Link from "next/link";
import React, { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/primitives";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { fetcher } from "@/lib/api";
import { ago, litres } from "@/lib/format";
import type { TankRow } from "@/server/repos/tanks";

export default function DeletedNodesPage() {
  const { data: allTanks, error, isLoading, mutate } = useSWR<TankRow[]>("/api/tanks?deleted=1", fetcher);
  const { success, error: toastError } = useToast();
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const deletedTanks = (allTanks ?? []).filter((t) => t.deletedAt !== null);

  const handleRestore = async (tank: TankRow) => {
    try {
      setRestoringId(tank.id);
      const res = await fetch(`/api/tanks/${tank.id}?restore=1`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Failed to restore tank");
      }
      success(`Tank "${tank.label}" successfully restored to active inventory.`);
      mutate();
    } catch (err: unknown) {
      toastError(err instanceof Error ? err.message : "Error restoring tank");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <Link
          href="/admin/nodes"
          className="text-xs font-medium text-muted hover:text-ink flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Active Nodes
        </Link>
      </div>

      <PageHeader
        title="Decommissioned & Deleted Nodes"
        sub="Tanks soft-deleted from active monitoring. You can restore them to restore live telemetry and historical records."
      />

      {error ? (
        <div role="alert" className="rounded-lg border border-crit/40 bg-crit/10 p-4 text-sm text-crit">
          Failed to load archived nodes: {error.message}
        </div>
      ) : null}

      {!isLoading && deletedTanks.length === 0 ? (
        <EmptyState
          icon={<Trash2 size={24} />}
          title="Archive Empty"
          description="There are no decommissioned or soft-deleted tank nodes in the archive."
        />
      ) : (
        <Table containerClassName="shadow-xs">
          <TableHeader>
            <TableRow>
              <TableHead>Decommissioned Tank</TableHead>
              <TableHead>Device ID</TableHead>
              <TableHead>Dimensions</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Decommissioned</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-sm text-muted">
                  Loading archive...
                </TableCell>
              </TableRow>
            ) : (
              deletedTanks.map((t) => {
                const g = t.geometry;
                const baseAreaCm2 =
                  g.shape.kind === "cylinder"
                    ? Math.PI * (g.shape.radiusCm ?? 100) ** 2
                    : (g.shape.widthCm ?? 100) * (g.shape.lengthCm ?? 100);
                const capacityL = Math.round((baseAreaCm2 * g.heightCm) / 1000);

                return (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <span className="text-ink font-semibold">{t.label}</span>
                      <span className="block text-xs text-muted">
                        {t.zone ? `${t.zone} · ` : ""}
                        {t.location || "Rooftop Tank"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="font-mono text-xs text-muted">
                        {t.deviceId || "—"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-muted font-mono">
                        {g.shape.kind} ({g.heightCm} cm)
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs font-mono font-medium text-ink">
                        {litres(capacityL)}
                      </span>
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-muted">
                        {t.deletedAt ? ago(t.deletedAt, Date.now()) : "Archived"}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        loading={restoringId === t.id}
                        onClick={() => handleRestore(t)}
                        icon={<RotateCcw size={14} />}
                      >
                        Restore Node
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

"use client";

import { Archive, Plus, RefreshCw } from "lucide-react";
import Link from "next/link";
import React from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/primitives";
import { fetcher } from "@/lib/api";
import { NodeTable } from "@/features/nodes-admin/NodeTable";
import type { TankRow } from "@/server/repos/tanks";

export default function NodesAdminPage() {
  const { data: tanks, error, isLoading, mutate } = useSWR<TankRow[]>("/api/tanks", fetcher);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospital Tank Nodes"
        sub="Monitor, calibrate physical geometry, and configure LoRaWAN hardware telemetry bindings."
      >
        <button
          type="button"
          onClick={() => mutate()}
          aria-label="Refresh node list"
          className="btn-quiet h-9 px-3 text-xs"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
          <span>Refresh</span>
        </button>

        <Link href="/admin/nodes/deleted">
          <Button variant="quiet" size="sm" icon={<Archive size={14} />}>
            Archive / Deleted
          </Button>
        </Link>

        <Link href="/admin/nodes/new">
          <Button variant="primary" size="sm" icon={<Plus size={16} />}>
            Add Tank Node
          </Button>
        </Link>
      </PageHeader>

      {error ? (
        <div role="alert" className="rounded-lg border border-crit/40 bg-crit/10 p-4 text-sm text-crit">
          Failed to load tank nodes: {error.message}
        </div>
      ) : null}

      <NodeTable tanks={tanks ?? []} loading={isLoading} onRefresh={() => mutate()} />
    </div>
  );
}

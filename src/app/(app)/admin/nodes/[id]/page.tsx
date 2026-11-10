"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import useSWR from "swr";
import { PageHeader } from "@/components/ui/primitives";
import { fetcher } from "@/lib/api";
import { EditNodeForm } from "@/features/nodes-admin/EditNodeForm";
import type { TankRow } from "@/server/repos/tanks";

export default function EditNodePage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: tank, error, isLoading, mutate } = useSWR<TankRow>(
    id ? `/api/tanks/${id}` : null,
    fetcher
  );

  return (
    <div className="space-y-6">
      <div className="mb-2">
        <Link
          href="/admin/nodes"
          className="text-xs font-medium text-muted hover:text-ink flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Nodes List
        </Link>
      </div>

      <PageHeader
        title={tank ? `Edit Node: ${tank.label}` : "Edit Tank Node"}
        sub="Update physical dimensions, LoRaWAN bindings, and alert threshold setpoints."
      />

      {isLoading ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted gap-2">
          <Loader2 className="animate-spin h-5 w-5 text-tide" />
          <span>Loading tank configuration...</span>
        </div>
      ) : error || !tank ? (
        <div role="alert" className="rounded-lg border border-crit/40 bg-crit/10 p-6 text-sm text-crit">
          Failed to load node: {error?.message ?? "Tank node not found."}
        </div>
      ) : (
        <EditNodeForm tank={tank} onSaved={() => mutate()} />
      )}
    </div>
  );
}

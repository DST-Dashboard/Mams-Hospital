"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import React from "react";
import { PageHeader } from "@/components/ui/primitives";
import { AddNodeWizard } from "@/features/nodes-admin/AddNodeWizard";

export default function NewNodePage() {
  return (
    <div className="space-y-6">
      <div className="mb-2">
        <Link
          href="/admin/nodes"
          className="text-xs font-medium text-muted hover:text-ink flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft size={14} /> Back to Nodes Management
        </Link>
      </div>

      <PageHeader
        title="Commission New Tank Node"
        sub="Follow the 5-step wizard to bind LoRaWAN sensors, calibrate dimensions, and set alert thresholds."
      />

      <AddNodeWizard />
    </div>
  );
}

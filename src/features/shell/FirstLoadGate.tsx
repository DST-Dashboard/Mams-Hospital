"use client";

import React, { useState } from "react";
import { Info } from "lucide-react";
import { useDashboard, useMe, useTanks } from "@/lib/hooks";
import { DimensionsModal } from "@/features/nodes-admin/DimensionsModal";

export function FirstLoadGate() {
  const { data: me } = useMe();
  const { data: dashboard, mutate: refreshDashboard } = useDashboard();
  const { data: tanks = [], mutate: refreshTanks } = useTanks();

  const [modalDismissed, setModalDismissed] = useState(false);

  const unconfirmedTanks = tanks.filter((t) => !t.dimsConfirmed);
  const hasUnconfirmed = unconfirmedTanks.length > 0 || (dashboard?.summary?.unconfirmed ?? 0) > 0;
  const isAdmin = me?.role === "admin";

  const handleSuccess = async () => {
    await Promise.all([refreshTanks(), refreshDashboard()]);
    setModalDismissed(true);
  };

  if (!hasUnconfirmed) return null;

  if (isAdmin && !modalDismissed && unconfirmedTanks.length > 0) {
    return (
      <DimensionsModal
        open={true}
        tanks={unconfirmedTanks}
        onSuccess={handleSuccess}
      />
    );
  }

  // Non-admins (or when admin dismissed modal if not mandatory) see an info banner
  return (
    <div className="max-w-[1600px] mx-auto px-6 md:px-10 mt-4 mb-2">
      <div className="banner banner--info text-[13px]">
        <div className="flex items-center gap-2">
          <Info size={16} aria-hidden />
          <span>
            <strong>Provisional monitoring:</strong> Rooftop tank physical dimensions have not
            been confirmed by an administrator. Level alerts are paused until dimensions are
            verified.
          </span>
        </div>
      </div>
    </div>
  );
}


"use client";

import React from "react";
import type { TankCardData } from "@/lib/types";
import { TankTile } from "./TankTile";
import { Skeleton } from "@/components/ui/primitives";
import "@/styles/views-monitoring.css";

export interface TankGridProps {
  tanks?: TankCardData[];
  asOf: number;
  loading?: boolean;
}

export function TankGrid({ tanks, asOf, loading = false }: TankGridProps) {
  if (loading || !tanks) {
    return (
      <div className="mon-tank-grid">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="mon-tile flex flex-col gap-3 p-5 min-h-[440px]"
          >
            <div className="flex justify-between items-center">
              <Skeleton className="w-24 h-5" />
              <Skeleton className="w-8 h-4 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="w-12 h-4 rounded-full" />
              <Skeleton className="w-16 h-4 rounded-full" />
            </div>
            <div className="flex justify-center my-4">
              <Skeleton className="w-36 h-44 rounded-lg" />
            </div>
            <Skeleton className="w-20 h-8" />
            <Skeleton className="w-32 h-4" />
            <Skeleton className="w-28 h-4" />
            <div className="mt-auto pt-3 border-t border-[var(--bd-soft)]">
              <Skeleton className="w-full h-7" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (tanks.length === 0) {
    return (
      <div className="card p-8 text-center text-[var(--tx-muted)]">
        No active tanks found. Contact the hospital administrator to configure water storage nodes.
      </div>
    );
  }

  return (
    <div className="mon-tank-grid" role="region" aria-label="Rooftop overhead water tanks status grid">
      {tanks.map((tank) => (
        <TankTile key={tank.id} tank={tank} asOf={asOf} />
      ))}
    </div>
  );
}


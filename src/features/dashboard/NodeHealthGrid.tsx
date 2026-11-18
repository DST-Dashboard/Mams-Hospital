"use client";

import React from "react";
import Link from "next/link";
import { Cpu, ChevronRight } from "lucide-react";
import type { TankCardData } from "@/lib/types";
import { BatteryIcon } from "@/components/status/BatteryIcon";
import { NodeStatusChip, SourceChip, FreshnessPill } from "@/components/status/badges";

export interface NodeHealthGridProps {
  tanks: TankCardData[];
  className?: string;
}

export function NodeHealthGrid({ tanks, className }: NodeHealthGridProps) {
  return (
    <div className={className}>
      <div className="card p-6 flex flex-col gap-4">
        {/* Card Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="eyebrow flex items-center gap-1.5 text-[11px] font-bold text-[var(--accent-500)] uppercase">
              <Cpu size={13} aria-hidden />
              <span>HARDWARE TELEMETRY</span>
            </div>
            <h2 className="card-title text-[20px] font-bold text-[var(--tx-head)] font-['Merriweather',serif]">
              Node health
            </h2>
          </div>
          <span className="text-[12px] font-semibold text-[var(--tx-quiet)]">
            5 nodes registered
          </span>
        </div>

        {/* Node Tiles / Rows */}
        <div className="divide-y divide-[var(--bd-soft)]">
          {tanks.map((t) => {
            const cur = t.current;
            return (
              <Link
                key={t.id}
                href={`/tanks/${t.id}`}
                className="flex items-center justify-between py-3 hover:bg-[var(--bg-subtle)] px-2 rounded-lg transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-bold text-[14px] text-[var(--tx-head)] group-hover:text-[var(--brand-800)] transition-colors">
                      {t.label}
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <SourceChip simulated={t.simulated} />
                      <NodeStatusChip status={t.status} />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Battery */}
                  <div className="flex items-center gap-1.5 text-[12px] font-mono font-semibold">
                    <BatteryIcon pct={cur?.batteryPct ?? null} />
                    <span>{cur?.batteryPct != null ? `${cur.batteryPct}%` : "—"}</span>
                  </div>

                  {/* Freshness */}
                  <div className="w-24 flex justify-end">
                    <FreshnessPill ageMin={cur?.ageMin ?? null} snapshot={true} />
                  </div>

                  <ChevronRight size={16} className="text-[var(--tx-quiet)] group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

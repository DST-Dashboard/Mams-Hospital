"use client";

import React from "react";
import { HospitalMark } from "@/components/ui/Logos";
import { useDashboard } from "@/lib/hooks";
import { useUi } from "@/lib/store";

export function Footer() {
  const { data: dashboard } = useDashboard();
  const { tz } = useUi();

  const isDemo = dashboard?.clockMode === "anchored";

  return (
    <footer className="footer mt-[50px] pt-[30px] pb-[40px] border-t border-[var(--bd)] select-none">
      <div className="flex items-center justify-between flex-wrap gap-4 text-[14px]">
        {/* Left Cluster */}
        <div className="flex items-center gap-4">
          <div className="grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300">
            <HospitalMark size={40} />
          </div>

          <div>
            <p className="font-bold text-[var(--tx-head)] m-0 leading-tight">
              OHTMS
            </p>
            <p className="text-[12px] font-bold uppercase tracking-wider text-[var(--tx-faint)] m-0 mt-0.5">
              {isDemo ? "Demonstration Dataset" : "Live Hardware Stream"}
            </p>
          </div>
        </div>

        {/* Right Info */}
        <div className="text-[13px] md:text-[14.4px] font-medium text-[var(--tx-faint)]">
          Built for MAMS Hospital · OHTMS v1.0 · Times shown in {tz}
        </div>
      </div>
    </footer>
  );
}


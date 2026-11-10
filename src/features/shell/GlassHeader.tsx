"use client";

import React from "react";
import Link from "next/link";
import { HospitalMark, OhtmsMark } from "@/components/ui/Logos";

export function GlassHeader() {
  return (
    <header className="glass-header sticky top-0 z-[var(--z-header)] bg-[var(--bg-glass)] backdrop-blur-[20px] shadow-[var(--sh-header)] border-b border-[var(--bd-soft)]">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-3.5 flex items-center justify-between gap-4">
        {/* Left cluster: Hospital Mark + 3-line branding */}
        <Link
          href="/dashboard"
          className="flex items-center gap-5 group text-decoration-none"
          aria-label="MAMS Hospital Overhead Tank Management System"
        >
          <div className="transition-transform duration-300 group-hover:scale-105 flex-shrink-0">
            <HospitalMark size={75} />
          </div>

          <div className="flex flex-col justify-center">
            <h1 className="font-display font-black text-[17.6px] leading-tight text-[var(--tx-head)] m-0">
              MAMS Hospital
            </h1>
            <p className="font-display font-bold text-[17.6px] leading-tight text-[var(--tx-head)] mt-1 m-0">
              Overhead Tank Management System
            </p>
            <p className="font-sans font-normal text-[13.6px] text-[var(--tx-muted)] mt-1 m-0">
              Real-time rooftop water monitoring
            </p>
          </div>
        </Link>

        {/* Right: OHTMS Mark */}
        <div className="hidden sm:block flex-shrink-0">
          <OhtmsMark size={65} wordmark={true} />
        </div>
      </div>
    </header>
  );
}


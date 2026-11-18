"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

export function GlassHeader() {
  return (
    <header className="glass-header bg-[var(--bg-glass)] backdrop-blur-[20px] shadow-[var(--sh-header)] border-b border-[var(--bd-soft)]">
      <div className="max-w-[1600px] mx-auto px-6 md:px-10 py-3.5 flex items-center justify-between gap-4">
        {/* Left cluster: Official MAMS Hospital Logo + 3-line branding */}
        <Link
          href="/dashboard"
          className="flex items-center gap-5 group no-underline"
          aria-label="MAMS Hospital Overhead Tank Management System"
        >
          <div className="transition-transform duration-300 group-hover:scale-105 flex-shrink-0">
            <Image
              src="/assets/mams-logo.png"
              alt="MAMS Hospital"
              width={68}
              height={68}
              priority
              className="rounded-2xl flex-shrink-0 object-contain"
            />
          </div>

          <div className="flex flex-col justify-center">
            <span className="font-display font-black text-[17.6px] leading-tight text-[var(--tx-head)] m-0 block">
              MAMS Hospital
            </span>
            <p className="font-display font-bold text-[17.6px] leading-tight text-[var(--tx-head)] mt-1 m-0">
              Overhead Tank Management System
            </p>
            <p className="font-sans font-normal text-[13.6px] text-[var(--tx-muted)] mt-1 m-0">
              Real-time rooftop water monitoring
            </p>
          </div>
        </Link>
      </div>
    </header>
  );
}


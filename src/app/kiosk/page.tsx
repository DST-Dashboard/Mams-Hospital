"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Clock, ShieldAlert, Wifi } from "lucide-react";
import { useDashboard } from "@/lib/hooks";
import { useUi } from "@/lib/store";
import { TankTile } from "@/features/dashboard/TankTile";
import { SeverityIcon } from "@/components/status/badges";
import { stamp, stampSeconds } from "@/lib/format";
import "@/styles/views-monitoring.css";

export default function KioskPage() {
  const router = useRouter();
  const tz = useUi((s) => s.tz);
  const { data: dashboard } = useDashboard();

  // Clock ticker
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Exit on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        router.push("/dashboard");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  const tanks = dashboard?.tanks || [];
  const asOf = dashboard?.asOf || now;
  const alerts = dashboard?.alerts || [];

  return (
    <div className="mon-kiosk-page">
      {/* Top Kiosk Header Bar */}
      <header className="flex items-center justify-between gap-4 pb-4 border-b border-[var(--bd)] mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="btn btn-outline btn-sm inline-flex items-center gap-1.5"
            aria-label="Exit kiosk mode (Escape)"
          >
            <ArrowLeft size={14} />
            <span>Exit Kiosk (Esc)</span>
          </Link>

          <div>
            <h1 className="text-[20px] font-bold text-[var(--tx-head)] font-['Merriweather',serif]">
              MAMS Hospital Overhead Water Storage
            </h1>
            <p className="text-[12px] text-[var(--tx-quiet)]">
              Continuous Control-Room Kiosk View · Auto-refreshing every 15 seconds
            </p>
          </div>
        </div>

        {/* Live Clock & Gateway Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-[var(--bg-card)] border border-[var(--bd)] rounded-full text-[12px] font-mono text-[var(--tx-main)]">
            <Clock size={13} className="text-[var(--accent-500)]" />
            <span>{stampSeconds(now, tz)} ({tz})</span>
          </div>

          <div className="flex items-center gap-1.5 text-[12px] font-bold text-[var(--ok-tx)] bg-[var(--ok-bg)] border border-[var(--ok-bd)] px-3 py-1 rounded-full">
            <Wifi size={13} />
            <span>SenseCap gateway online</span>
          </div>
        </div>
      </header>

      {/* Non-sticky Alert Banner */}
      {alerts.length > 0 && (
        <aside
          role="alert"
          className="mb-6 p-4 rounded-xl bg-[var(--err-bg)] text-[var(--err-tx)] border border-[var(--err-bd)] flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="flex-shrink-0" />
            <div>
              <strong className="block text-[14px]">
                {alerts.length} Active System Alert{alerts.length > 1 ? "s" : ""}
              </strong>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px] mt-0.5">
                {alerts.slice(0, 3).map((a) => (
                  <span key={a.id} className="flex items-center gap-1.5">
                    <SeverityIcon severity={a.severity} size={12} />
                    <span>{a.tankLabel ? `${a.tankLabel}: ` : ""}{a.message}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <Link
            href="/alerts"
            className="btn btn-sm btn-outline bg-white/20 text-[var(--err-tx)] border-[var(--err-bd)]"
          >
            Review Alerts
          </Link>
        </aside>
      )}

      {/* 1.25x Scaled Kiosk Grid */}
      <main className="flex-grow flex flex-col justify-center">
        <div className="mon-kiosk-grid">
          {tanks.map((tank) => (
            <TankTile key={tank.id} tank={tank} asOf={asOf} />
          ))}
        </div>
      </main>

      {/* Kiosk Footer */}
      <footer className="pt-6 mt-6 border-t border-[var(--bd)] flex items-center justify-between text-[11px] text-[var(--tx-quiet)]">
        <span>MAMS Hospital Overhead Tank Management System (OHTMS)</span>
        <span>Snapshot as of {stamp(asOf, tz)} · Press ESC or click exit to return</span>
      </footer>
    </div>
  );
}

"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { WifiOff } from "lucide-react";
import { UtilityStrip } from "./UtilityStrip";
import { GlassHeader } from "./GlassHeader";
import { MegaNav } from "./MegaNav";
import { GlobalAlertBanner } from "./GlobalAlertBanner";
import { FirstLoadGate } from "./FirstLoadGate";
import { SessionGate } from "./SessionGate";
import { PageFrame } from "./PageFrame";
import { Footer } from "./Footer";
import { BackToTop } from "./BackToTop";
import { useOnline } from "@/lib/hooks";
import { useUi } from "@/lib/store";

interface ShellProps {
  children: React.ReactNode;
}

export function Shell({ children }: ShellProps) {
  const pathname = usePathname();
  const isOnline = useOnline();
  const initFromStorage = useUi((s) => s.initFromStorage);
  const chromeGroupRef = useRef<HTMLDivElement>(null);

  // Synchronize persisted preferences upon client mount
  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  // Dynamically measure chrome height (GlassHeader + MegaNav) and write back to --chrome-h
  useEffect(() => {
    const el = chromeGroupRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = Math.round(entry.contentRect.height);
        if (height > 0) {
          document.documentElement.style.setProperty("--chrome-h", `${height}px`);
        }
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Determine active tab
  const getTab = (): "overview" | "tank" | "analytics" | "alerts" | "settings" | "admin" => {
    if (pathname.startsWith("/tanks")) return "tank";
    if (pathname.startsWith("/analytics")) return "analytics";
    if (pathname.startsWith("/alerts")) return "alerts";
    if (pathname.startsWith("/settings")) return "settings";
    if (pathname.startsWith("/admin")) return "admin";
    return "overview";
  };

  const isAbout = pathname === "/about";
  const tab = getTab();

  return (
    <div className="ohtms-app min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--tx-main)]">
      {/* M6 Session Expiry Modal Gate */}
      <SessionGate />

      {/* Offline Status Warning Banner */}
      {!isOnline && (
        <aside
          role="alert"
          className="bg-amber-600 text-white py-2 px-6 text-center text-[13px] font-bold z-[1300] flex items-center justify-center gap-2"
        >
          <WifiOff size={16} aria-hidden />
          <span>You&apos;re offline. Showing last known state.</span>
        </aside>
      )}

      {/* Top Utility Strip (NOT sticky per spec §7.1) */}
      <UtilityStrip />

      {/* Chrome Stack: Glass Header + Mega Nav (static in normal flow, scrolls away with content) */}
      <div ref={chromeGroupRef} className="sticky-chrome-group chrome-group w-full relative z-[var(--z-header)]">
        <GlassHeader />
        <MegaNav />
      </div>

      {/* Alert Banner (Static in normal flow, scrolls away with content) */}
      <GlobalAlertBanner />

      {/* M1 First Load Gate (Prompts admins for unconfirmed tank dimensions) */}
      <FirstLoadGate />

      {/* App Workspace & Content */}
      <div className="flex-grow flex flex-col w-full">
        {isAbout ? (
          <main id="workspace" className="max-w-[1200px] w-full mx-auto px-5 py-12">
            {children}
          </main>
        ) : (
          <PageFrame tab={tab}>
            {children}
          </PageFrame>
        )}
      </div>

      {/* Sticky / Footer Elements */}
      <div className="max-w-[1600px] w-full mx-auto px-6 md:px-10">
        <Footer />
      </div>

      <BackToTop />
    </div>
  );
}

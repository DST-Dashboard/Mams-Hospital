"use client";

import React from "react";
import clsx from "clsx";
import { Hero } from "./Hero";
import { TabBar } from "./TabBar";

export interface PageFrameProps {
  tab: "overview" | "tank" | "analytics" | "alerts" | "settings" | "admin";
  hero?: boolean;
  children: React.ReactNode;
}

export function PageFrame({ tab, hero, children }: PageFrameProps) {
  const showHero = hero ?? (tab === "overview");

  return (
    <div className="page-frame w-full">
      {/* Hero only on Overview */}
      {showHero && <Hero />}

      {/* Floating App Shell Wrapper */}
      <div
        className={clsx(
          "shell-wrapper max-w-[1600px] mx-auto px-4 sm:px-6 md:px-8 relative z-10",
          showHero ? "-mt-5 mb-10" : "mt-8 mb-10"
        )}
      >
        <div className="app-shell flex flex-col bg-[var(--bg-card)] rounded-[16px] shadow-[var(--sh-shell)] overflow-hidden min-h-[850px] border border-[var(--bd)]">
          {/* Main Tab Bar */}
          <TabBar />

          {/* Workspace Content Area */}
          <main
            id="workspace"
            className="workspace flex-grow p-5 sm:p-7 md:p-10 bg-[var(--bg-work)] min-w-0 scroll-mt-[215px]"
          >
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}


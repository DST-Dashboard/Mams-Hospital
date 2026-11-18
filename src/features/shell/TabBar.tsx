"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Activity,
  Bell,
  Droplet,
  Layers,
  Shield,
  Sliders,
} from "lucide-react";
import { useAlerts, useMe } from "@/lib/hooks";
import { useUi } from "@/lib/store";

export function TabBar() {
  const pathname = usePathname();
  const { data: me } = useMe();
  const { data: alerts = [] } = useAlerts({ state: "open" });
  const { lastTankId } = useUi();

  const role = me?.role ?? "viewer";
  const alertCount = alerts.length;

  const targetTankId = lastTankId || 1;

  const tabs = [
    {
      id: "overview",
      label: "01. Overview",
      href: "/dashboard",
      icon: Layers,
      active: pathname === "/dashboard" || pathname === "/",
      minRole: "viewer",
    },
    {
      id: "tank",
      label: "02. Tank detail",
      href: `/tanks/${targetTankId}`,
      icon: Droplet,
      active: pathname.startsWith("/tanks"),
      minRole: "viewer",
    },
    {
      id: "analytics",
      label: "03. Analytics",
      href: "/analytics",
      icon: Activity,
      active: pathname.startsWith("/analytics"),
      minRole: "viewer",
    },
    {
      id: "alerts",
      label: "04. Alerts",
      href: "/alerts",
      icon: Bell,
      active: pathname.startsWith("/alerts"),
      minRole: "viewer",
      badge: alertCount > 0 ? alertCount : null,
    },
    {
      id: "settings",
      label: "05. Settings",
      href: "/settings",
      icon: Sliders,
      active: pathname.startsWith("/settings"),
      minRole: "operator",
    },
    {
      id: "admin",
      label: "06. Administration",
      href: "/admin/nodes",
      icon: Shield,
      active: pathname.startsWith("/admin"),
      minRole: "admin",
    },
  ];

  const allowedTabs = tabs.filter((t) => {
    if (t.minRole === "admin") return role === "admin";
    if (t.minRole === "operator") return role === "operator" || role === "admin";
    return true;
  });

  return (
    <div className="tab-bar w-full bg-[var(--bg-card)] px-6 py-3 border-b border-[var(--bd-rail)] flex items-center justify-start flex-wrap gap-4 z-20">
      {/* Numbered Pill Tabs */}
      <div role="tablist" aria-label="Main views" className="flex items-center flex-wrap gap-2">
        {allowedTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              role="tab"
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              aria-selected={tab.active}
              className={clsx(
                "inline-flex items-center gap-2.5 px-3.5 py-2 rounded-[8px] text-[14px] sm:text-[15.2px] font-semibold transition-all duration-200 select-none shadow-[var(--sh-tab)] border border-[var(--bd-tab)]",
                tab.active
                  ? "bg-[var(--brand-600)] text-white border-[var(--brand-600)] shadow-[var(--sh-tab-active)]"
                  : "bg-[var(--bg-tab)] text-[var(--tx-tab)] hover:bg-[var(--bg-tab-hover)] hover:text-[var(--tx-head)] hover:border-[var(--bd-tab-hover)] hover:-translate-y-0.5"
              )}
            >
              <Icon size={16} aria-hidden />
              <span>{tab.label}</span>

              {tab.badge && (
                <span className="w-5 h-5 rounded-full bg-[var(--accent-500)] text-white text-[10px] font-bold inline-flex items-center justify-center leading-none">
                  {tab.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}


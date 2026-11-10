"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import {
  ChevronDown,
  Home,
  LogOut,
  Server,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useDashboard, useMe } from "@/lib/hooks";
import { post } from "@/lib/api";
import { AlertBell } from "./AlertBell";
import { RoleChip } from "@/components/status/badges";
import type { Role } from "@/lib/types";

export function MegaNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useMe();
  const { data: dashboard } = useDashboard();

  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdmin = me?.role === "admin";
  const clockMode = dashboard?.clockMode ?? "anchored";
  const isDemo = clockMode === "anchored";

  // Navigation item active states
  const isHomeActive = pathname === "/" || pathname === "/dashboard";
  const isDashboardActive =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/tanks") ||
    pathname.startsWith("/analytics") ||
    pathname.startsWith("/alerts") ||
    pathname.startsWith("/settings");
  const isAdminActive = pathname.startsWith("/admin");
  const isAboutActive = pathname.startsWith("/about");

  const handleSignOut = async () => {
    try {
      await post("/api/auth/logout");
      router.push("/login");
    } catch {
      window.location.assign("/login");
    }
  };

  const userInitials = me?.name
    ? me.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <nav
      aria-label="Primary navigation"
      className="mega-nav bg-[var(--bg-subtle)] border-b border-[var(--bd-soft)] px-6 md:px-10 flex items-center justify-between select-none min-h-[52px]"
    >
      {/* Left Navigation Links */}
      <ul className="flex items-center gap-2 list-none m-0 p-0 overflow-x-auto">
        {/* Home Icon */}
        <li className="relative">
          <Link
            href="/dashboard"
            aria-label="Home overview"
            className={clsx(
              "flex items-center px-3 py-3.5 text-[var(--tx-head)] hover:text-[var(--brand-700)] hover:bg-[var(--bg-pill)]/60 rounded-lg transition-colors relative",
              isHomeActive && "font-bold text-[var(--brand-900)]"
            )}
          >
            <Home size={18} aria-hidden />
            {isHomeActive && (
              <span
                className="absolute bottom-0 left-2 right-2 h-[3px] bg-[var(--accent-500)] rounded-t-[2px]"
                aria-hidden
              />
            )}
          </Link>
        </li>

        {/* Dashboard */}
        <li className="relative">
          <Link
            href="/dashboard"
            className={clsx(
              "flex items-center gap-1.5 px-3 py-3.5 text-[14.5px] font-medium text-[var(--tx-head)] hover:text-[var(--brand-700)] hover:bg-[var(--bg-pill)]/60 rounded-lg transition-colors relative",
              isDashboardActive && "font-bold text-[var(--brand-900)]"
            )}
          >
            <span>Dashboard</span>
            {/* Live pulsing dot (hidden in Demo mode per spec §8.3) */}
            {!isDemo && (
              <span className="relative flex h-2 w-2 ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--live)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--live)]" />
              </span>
            )}
            {isDashboardActive && (
              <span
                className="absolute bottom-0 left-3 right-3 h-[3px] bg-[var(--accent-500)] rounded-t-[2px]"
                aria-hidden
              />
            )}
          </Link>
        </li>

        {/* Administration dropdown (Admin only) */}
        {isAdmin && (
          <li
            className="relative"
            onMouseEnter={() => setAdminMenuOpen(true)}
            onMouseLeave={() => setAdminMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => setAdminMenuOpen((prev) => !prev)}
              aria-expanded={adminMenuOpen}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-3.5 text-[14.5px] font-medium text-[var(--tx-head)] hover:text-[var(--brand-700)] hover:bg-[var(--bg-pill)]/60 rounded-lg transition-colors relative",
                isAdminActive && "font-bold text-[var(--brand-900)]"
              )}
            >
              <span>Administration</span>
              <ChevronDown size={14} className="text-[var(--tx-quiet)]" aria-hidden />
              {isAdminActive && (
                <span
                  className="absolute bottom-0 left-3 right-3 h-[3px] bg-[var(--accent-500)] rounded-t-[2px]"
                  aria-hidden
                />
              )}
            </button>

            {adminMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full min-w-[200px] bg-[var(--bg-card)] text-[var(--tx-main)] rounded-[12px] p-2 shadow-[var(--sh-shell)] border border-[var(--bd)] border-t-[3px] border-t-[var(--accent-500)] z-[var(--z-dropdown)] animate-in fade-in duration-150"
              >
                <Link
                  href="/admin/nodes"
                  role="menuitem"
                  onClick={() => setAdminMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[14px] hover:bg-[var(--bg-subtle)] hover:text-[var(--tx-head)] transition-colors"
                >
                  <Server size={16} className="text-[var(--brand-600)]" aria-hidden />
                  <span>Sensor Nodes</span>
                </Link>
                <Link
                  href="/admin/users"
                  role="menuitem"
                  onClick={() => setAdminMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[14px] hover:bg-[var(--bg-subtle)] hover:text-[var(--tx-head)] transition-colors"
                >
                  <Users size={16} className="text-[var(--brand-600)]" aria-hidden />
                  <span>Users & Access</span>
                </Link>
                <Link
                  href="/admin/audit"
                  role="menuitem"
                  onClick={() => setAdminMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[14px] hover:bg-[var(--bg-subtle)] hover:text-[var(--tx-head)] transition-colors"
                >
                  <ShieldCheck size={16} className="text-[var(--brand-600)]" aria-hidden />
                  <span>Audit Trail</span>
                </Link>
              </div>
            )}
          </li>
        )}

        {/* About */}
        <li className="relative">
          <Link
            href="/about"
            className={clsx(
              "flex items-center px-3 py-3.5 text-[14.5px] font-medium text-[var(--tx-head)] hover:text-[var(--brand-700)] hover:bg-[var(--bg-pill)]/60 rounded-lg transition-colors relative",
              isAboutActive && "font-bold text-[var(--brand-900)]"
            )}
          >
            <span>About</span>
            {isAboutActive && (
              <span
                className="absolute bottom-0 left-3 right-3 h-[3px] bg-[var(--accent-500)] rounded-t-[2px]"
                aria-hidden
              />
            )}
          </Link>
        </li>
      </ul>

      {/* Right End: Bell + User Menu */}
      <div className="flex items-center gap-3 py-2">
        {/* Quick Alert Bell */}
        <AlertBell />

        {/* User Profile Menu */}
        <div
          className="relative"
          onMouseEnter={() => setUserMenuOpen(true)}
          onMouseLeave={() => setUserMenuOpen(false)}
        >
          <button
            type="button"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            aria-expanded={userMenuOpen}
            className="flex items-center gap-2.5 py-1 px-3 rounded-full bg-[var(--bg-card)] border border-[var(--bd)] text-[var(--tx-head)] hover:bg-[var(--bg-subtle)] hover:border-[var(--bd-strong)] transition-all shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-[var(--brand-100)] border border-[var(--brand-200)] flex items-center justify-center font-bold text-[11.5px] text-[var(--brand-800)] flex-shrink-0">
              {userInitials}
            </div>
            <div className="flex items-center gap-1 text-[13px] font-semibold text-[var(--tx-head)]">
              <ShieldCheck size={14} className="text-[var(--brand-600)]" aria-hidden />
              <span>{me?.role === "admin" ? "Admin" : me?.role === "operator" ? "Operator" : "Viewer"}</span>
            </div>
            <ChevronDown size={13} className="text-[var(--tx-quiet)] flex-shrink-0" aria-hidden />
          </button>

          {userMenuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1.5 min-w-[220px] bg-[var(--bg-card)] text-[var(--tx-main)] rounded-[12px] p-3 shadow-[var(--sh-shell)] border border-[var(--bd)] border-t-[3px] border-t-[var(--accent-500)] z-[var(--z-dropdown)] animate-in fade-in duration-150"
            >
              <div className="pb-2.5 mb-2 border-b border-[var(--bd)]">
                <p className="font-bold text-[14px] text-[var(--tx-head)] m-0 truncate">
                  {me?.name || "MAMS User"}
                </p>
                <div className="mt-1">
                  {me?.role && <RoleChip role={me.role as Role} />}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-[13px] font-medium text-[var(--err-tx)] hover:bg-[var(--err-bg)] rounded-[6px] transition-colors"
              >
                <LogOut size={14} aria-hidden />
                <span>Sign out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

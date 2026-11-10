"use client";

import React, { useState, useRef, useEffect } from "react";
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

  const adminContainerRef = useRef<HTMLLIElement>(null);
  const adminTriggerRef = useRef<HTMLButtonElement>(null);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  const userContainerRef = useRef<HTMLDivElement>(null);
  const userTriggerRef = useRef<HTMLButtonElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Close menus on route change
  useEffect(() => {
    setAdminMenuOpen(false);
    setUserMenuOpen(false);
  }, [pathname]);

  // Close menus on outside click or tap
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (adminContainerRef.current && !adminContainerRef.current.contains(target)) {
        setAdminMenuOpen(false);
      }
      if (userContainerRef.current && !userContainerRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("touchstart", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
    };
  }, []);

  // Keyboard navigation for Administration menu
  const handleAdminTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setAdminMenuOpen(true);
      setTimeout(() => {
        const firstItem = adminMenuRef.current?.querySelector<HTMLAnchorElement>('[role="menuitem"]');
        firstItem?.focus();
      }, 30);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAdminMenuOpen(true);
      setTimeout(() => {
        const items = adminMenuRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]');
        if (items && items.length > 0) {
          items[items.length - 1]?.focus();
        }
      }, 30);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setAdminMenuOpen(false);
    }
  };

  const handleAdminMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      adminMenuRef.current?.querySelectorAll<HTMLAnchorElement>('[role="menuitem"]') ?? []
    );
    const currentIndex = items.findIndex((item) => item === document.activeElement);

    if (e.key === "Escape") {
      e.preventDefault();
      setAdminMenuOpen(false);
      adminTriggerRef.current?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % items.length;
      items[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + items.length) % items.length;
      items[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Tab") {
      setAdminMenuOpen(false);
    }
  };

  // Keyboard navigation for User menu
  const handleUserTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setUserMenuOpen(true);
      setTimeout(() => {
        const firstBtn = userMenuRef.current?.querySelector<HTMLButtonElement>('button');
        firstBtn?.focus();
      }, 30);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setUserMenuOpen(false);
    }
  };

  const handleUserMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setUserMenuOpen(false);
      userTriggerRef.current?.focus();
    } else if (e.key === "Tab") {
      setUserMenuOpen(false);
    }
  };

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
      className="mega-nav bg-[var(--bg-subtle)] border-b border-[var(--bd-soft)] px-2 sm:px-6 md:px-10 flex items-center justify-between select-none min-h-[52px] relative z-[var(--z-header)]"
    >
      {/* Left Navigation Links */}
      <ul className="flex items-center gap-0.5 sm:gap-2 list-none m-0 p-0 overflow-visible">
        {/* Home Icon */}
        <li className="relative">
          <Link
            href="/dashboard"
            aria-label="Home overview"
            className={clsx(
              "flex items-center px-2 sm:px-3 py-3.5 text-[var(--tx-head)] hover:text-[var(--brand-700)] hover:bg-[var(--bg-pill)]/60 rounded-lg transition-colors relative",
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
              "flex items-center gap-1.5 px-2 sm:px-3 py-3.5 text-[13.5px] sm:text-[14.5px] font-medium text-[var(--tx-head)] hover:text-[var(--brand-700)] hover:bg-[var(--bg-pill)]/60 rounded-lg transition-colors relative",
              isDashboardActive && "font-bold text-[var(--brand-900)]"
            )}
          >
            <span>Dashboard</span>
            {/* Live pulsing dot (hidden in Demo mode per spec §8.3) */}
            {!isDemo && (
              <span className="relative flex h-2 w-2 ml-0.5 sm:ml-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--live)] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--live)]" />
              </span>
            )}
            {isDashboardActive && (
              <span
                className="absolute bottom-0 left-2 sm:left-3 right-2 sm:right-3 h-[3px] bg-[var(--accent-500)] rounded-t-[2px]"
                aria-hidden
              />
            )}
          </Link>
        </li>

        {/* Administration dropdown (Admin only) */}
        {isAdmin && (
          <li
            ref={adminContainerRef}
            className="relative"
          >
            <button
              ref={adminTriggerRef}
              type="button"
              id="admin-menu-trigger"
              aria-haspopup="menu"
              aria-expanded={adminMenuOpen}
              aria-controls="admin-menu-panel"
              onClick={() => setAdminMenuOpen((prev) => !prev)}
              onKeyDown={handleAdminTriggerKeyDown}
              className={clsx(
                "flex items-center gap-1 px-2 sm:px-3 py-3.5 text-[13.5px] sm:text-[14.5px] font-medium text-[var(--tx-head)] hover:text-[var(--brand-700)] hover:bg-[var(--bg-pill)]/60 rounded-lg transition-colors relative",
                isAdminActive && "font-bold text-[var(--brand-900)]"
              )}
            >
              <span className="hidden sm:inline">Administration</span>
              <span className="sm:hidden">Admin</span>
              <ChevronDown
                size={14}
                className={clsx("text-[var(--tx-quiet)] transition-transform duration-150", adminMenuOpen && "rotate-180")}
                aria-hidden
              />
              {isAdminActive && (
                <span
                  className="absolute bottom-0 left-2 sm:left-3 right-2 sm:right-3 h-[3px] bg-[var(--accent-500)] rounded-t-[2px]"
                  aria-hidden
                />
              )}
            </button>

            {adminMenuOpen && (
              <div
                ref={adminMenuRef}
                id="admin-menu-panel"
                role="menu"
                aria-labelledby="admin-menu-trigger"
                onKeyDown={handleAdminMenuKeyDown}
                className="absolute left-0 top-full mt-1 min-w-[200px] sm:min-w-[220px] bg-[var(--bg-card)] text-[var(--tx-main)] rounded-[12px] p-2 shadow-[var(--sh-shell)] border border-[var(--bd)] border-t-[3px] border-t-[var(--accent-500)] z-[var(--z-dropdown)] animate-in fade-in slide-in-from-top-1 duration-150"
              >
                <Link
                  href="/admin/nodes"
                  role="menuitem"
                  onClick={() => setAdminMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-[14px] font-medium hover:bg-[var(--bg-subtle)] hover:text-[var(--tx-head)] focus:bg-[var(--bg-subtle)] focus:text-[var(--tx-head)] outline-none transition-colors"
                >
                  <Server size={16} className="text-[var(--brand-600)] flex-shrink-0" aria-hidden />
                  <span>Sensor Nodes</span>
                </Link>
                <Link
                  href="/admin/users"
                  role="menuitem"
                  onClick={() => setAdminMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-[14px] font-medium hover:bg-[var(--bg-subtle)] hover:text-[var(--tx-head)] focus:bg-[var(--bg-subtle)] focus:text-[var(--tx-head)] outline-none transition-colors"
                >
                  <Users size={16} className="text-[var(--brand-600)] flex-shrink-0" aria-hidden />
                  <span>Users & Access</span>
                </Link>
                <Link
                  href="/admin/audit"
                  role="menuitem"
                  onClick={() => setAdminMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-[8px] text-[14px] font-medium hover:bg-[var(--bg-subtle)] hover:text-[var(--tx-head)] focus:bg-[var(--bg-subtle)] focus:text-[var(--tx-head)] outline-none transition-colors"
                >
                  <ShieldCheck size={16} className="text-[var(--brand-600)] flex-shrink-0" aria-hidden />
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
              "flex items-center px-2 sm:px-3 py-3.5 text-[13.5px] sm:text-[14.5px] font-medium text-[var(--tx-head)] hover:text-[var(--brand-700)] hover:bg-[var(--bg-pill)]/60 rounded-lg transition-colors relative",
              isAboutActive && "font-bold text-[var(--brand-900)]"
            )}
          >
            <span>About</span>
            {isAboutActive && (
              <span
                className="absolute bottom-0 left-2 sm:left-3 right-2 sm:right-3 h-[3px] bg-[var(--accent-500)] rounded-t-[2px]"
                aria-hidden
              />
            )}
          </Link>
        </li>
      </ul>

      {/* Right End: Bell + User Menu */}
      <div className="flex items-center gap-1.5 sm:gap-3 py-2">
        {/* Quick Alert Bell */}
        <AlertBell />

        {/* User Profile Menu */}
        <div
          ref={userContainerRef}
          className="relative"
        >
          <button
            ref={userTriggerRef}
            type="button"
            id="user-menu-trigger"
            aria-haspopup="menu"
            aria-expanded={userMenuOpen}
            aria-controls="user-menu-panel"
            onClick={() => setUserMenuOpen((prev) => !prev)}
            onKeyDown={handleUserTriggerKeyDown}
            className="flex items-center gap-1.5 sm:gap-2.5 py-1 px-1.5 sm:px-3 rounded-full bg-[var(--bg-card)] border border-[var(--bd)] text-[var(--tx-head)] hover:bg-[var(--bg-subtle)] hover:border-[var(--bd-strong)] transition-all shadow-sm"
          >
            <div className="w-7 h-7 rounded-full bg-[var(--brand-100)] border border-[var(--brand-200)] flex items-center justify-center font-bold text-[11.5px] text-[var(--brand-800)] flex-shrink-0">
              {userInitials}
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[13px] font-semibold text-[var(--tx-head)]">
              <ShieldCheck size={14} className="text-[var(--brand-600)]" aria-hidden />
              <span>{me?.role === "admin" ? "Admin" : me?.role === "operator" ? "Operator" : "Viewer"}</span>
            </div>
            <ChevronDown
              size={13}
              className={clsx("text-[var(--tx-quiet)] flex-shrink-0 transition-transform duration-150", userMenuOpen && "rotate-180")}
              aria-hidden
            />
          </button>

          {userMenuOpen && (
            <div
              ref={userMenuRef}
              id="user-menu-panel"
              role="menu"
              aria-labelledby="user-menu-trigger"
              onKeyDown={handleUserMenuKeyDown}
              className="absolute right-0 top-full mt-1.5 min-w-[220px] bg-[var(--bg-card)] text-[var(--tx-main)] rounded-[12px] p-3 shadow-[var(--sh-shell)] border border-[var(--bd)] border-t-[3px] border-t-[var(--accent-500)] z-[var(--z-dropdown)] animate-in fade-in slide-in-from-top-1 duration-150"
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
                role="menuitem"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-2.5 py-2 text-[13px] font-medium text-[var(--err-tx)] hover:bg-[var(--err-bg)] focus:bg-[var(--err-bg)] rounded-[6px] outline-none transition-colors"
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

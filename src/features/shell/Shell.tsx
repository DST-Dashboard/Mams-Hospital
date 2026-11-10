"use client";

import clsx from "clsx";
import {
  Activity,
  Bell,
  Droplets,
  Info,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  ScrollText,
  Server,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState, type ReactNode } from "react";
import { post } from "@/lib/api";
import { useUi } from "@/lib/store";
import { AlertBell } from "./AlertBell";
import { GlobalAlertBanner } from "./GlobalAlertBanner";
import { ModeToggle } from "./ModeToggle";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/analytics", label: "Analytics", icon: Activity },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin/nodes", label: "Nodes", icon: Server, admin: true },
  { href: "/admin/users", label: "Users", icon: Users, admin: true },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, admin: true },
  { href: "/about", label: "About", icon: Info },
] as const;

export function Shell({
  user,
  children,
}: {
  user: { name: string; role: string };
  children: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const { tz, setTz } = useUi();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setTheme((document.documentElement.dataset.theme as "dark" | "light") ?? "dark");
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [path]);

  const flipTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* private mode */
    }
  };

  const logout = async () => {
    await post("/api/auth/logout");
    router.push("/login");
  };

  const navItems = NAV.filter((n) => !("admin" in n) || user.role === "admin");

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[240px_1fr] bg-bg text-ink">
      {/* Mobile Header */}
      <header className="flex h-16 items-center justify-between border-b hairline bg-surface px-4 md:hidden">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open main menu"
            className="rounded p-1.5 text-muted hover:text-ink hover:bg-raised"
          >
            <Menu size={22} />
          </button>
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-tide/15 text-tide">
              <Droplets size={18} aria-hidden="true" />
            </div>
            <span className="font-semibold tracking-tight text-ink">MAMS Water</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <AlertBell />
          <button
            type="button"
            onClick={flipTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            className="btn-quiet h-8 w-8 px-0"
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* Navigation Sidebar (Desktop + Mobile Drawer) */}
      <nav
        aria-label="Main Navigation"
        className={clsx(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r hairline bg-surface transition-transform duration-200 md:static md:w-auto md:translate-x-0 md:h-dvh md:sticky md:top-0",
          mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between px-5 border-b hairline bg-raised/30">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-tide/20 text-tide shadow-xs">
              <Droplets size={20} aria-hidden="true" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-ink block leading-none">MAMS Water</span>
              <span className="text-[10px] text-muted uppercase tracking-widest font-semibold block mt-1">
                Hospital OHTMS
              </span>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
            className="rounded p-1 text-muted hover:text-ink hover:bg-raised md:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted/70 px-3 mb-2">
            Monitoring & System
          </div>
          <ul className="space-y-1">
            {navItems.map(({ href, label, icon: Icon }) => {
              const on =
                path === href ||
                path.startsWith(`${href}/`) ||
                (href === "/dashboard" && path.startsWith("/tanks"));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={on ? "page" : undefined}
                    className={clsx(
                      "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors select-none",
                      on
                        ? "bg-raised text-tide font-semibold shadow-xs border-l-2 border-tide"
                        : "text-muted hover:bg-raised/70 hover:text-ink"
                    )}
                  >
                    <Icon size={18} aria-hidden="true" className={on ? "text-tide" : "text-muted"} />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Sidebar Footer info */}
        <div className="border-t hairline p-3 bg-raised/20 space-y-2">
          <Link
            href="/kiosk"
            target="_blank"
            className="flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-muted hover:text-ink hover:bg-raised transition-colors"
          >
            <div className="flex items-center gap-2">
              <Monitor size={15} className="text-tide" />
              <span>Kiosk Display</span>
            </div>
            <span className="text-[10px] uppercase font-bold text-tide">Launch</span>
          </Link>

          <div className="flex items-center justify-between px-3 pt-2 text-xs text-muted border-t hairline/50">
            <span className="truncate max-w-[120px] font-medium text-ink">{user.name}</span>
            <span className="rounded bg-raised px-1.5 py-0.5 text-[10px] uppercase font-semibold text-muted">
              {user.role}
            </span>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="min-w-0 flex flex-col min-h-dvh">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 hidden md:flex h-14 items-center justify-between border-b hairline bg-surface/90 backdrop-blur-md px-6">
          <div className="flex items-center gap-3">
            <ModeToggle />
          </div>

          <div className="flex items-center gap-2.5 text-sm">
            <button
              type="button"
              className="btn-quiet h-8 px-2.5 text-xs font-semibold"
              onClick={() => setTz(tz === "IST" ? "UTC" : "IST")}
              aria-label={`Current timezone: ${tz}. Click to switch.`}
            >
              TZ: {tz}
            </button>

            <button
              type="button"
              className="btn-quiet h-8 w-8 px-0"
              onClick={flipTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            >
              {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <AlertBell />

            <div className="h-4 w-px bg-line/60 mx-1" aria-hidden="true" />

            <span className="text-xs text-muted hidden lg:inline">
              Signed in as <span className="font-semibold text-ink">{user.name}</span>
            </span>

            <button
              type="button"
              className="btn-quiet h-8 px-2.5 text-xs text-crit hover:bg-crit/10"
              onClick={logout}
            >
              <LogOut size={13} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 mx-auto w-full max-w-[1540px] px-4 sm:px-6 py-6 lg:py-8">
          <GlobalAlertBanner />
          {children}
        </main>

        {/* Global Footer with Institutional IIIT Inspired Aesthetic */}
        <footer className="border-t hairline bg-surface/40 px-6 py-4 text-xs text-muted">
          <div className="mx-auto max-w-[1540px] flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <span className="font-semibold text-ink">MAMS Water OHTMS</span> · Overhead Tank Monitoring System
            </div>
            <div>
              Institutional Smart Infrastructure Dashboard · IIIT Research Center Inspired
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

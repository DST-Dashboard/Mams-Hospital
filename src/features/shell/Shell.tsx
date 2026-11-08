"use client";
import clsx from "clsx";
import { Activity, Bell, Droplets, Info, LayoutDashboard, LogOut, Moon, ScrollText, Server, Settings, Sun, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { post } from "@/lib/api";
import { useUi } from "@/lib/store";

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

export function Shell({ user, children }: { user: { name: string; role: string }; children: ReactNode }) {
  const path = usePathname(), router = useRouter();
  const { tz, setTz } = useUi();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => setTheme((document.documentElement.dataset.theme as "dark" | "light") ?? "dark"), []);
  const flip = () => { const n = theme === "dark" ? "light" : "dark"; setTheme(n); document.documentElement.dataset.theme = n; try { localStorage.setItem("theme", n); } catch { /* private mode */ } };
  const logout = async () => { await post("/api/auth/logout"); router.push("/login"); };

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <nav aria-label="Main" className="border-b hairline bg-surface md:sticky md:top-0 md:h-dvh md:border-b-0 md:border-r">
        <div className="flex items-center gap-2 px-5 py-4"><Droplets className="text-tide" size={22} aria-hidden /><span className="font-semibold">MAMS Water</span></div>
        <ul className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:overflow-visible">
          {NAV.filter((n) => !("admin" in n) || user.role === "admin").map(({ href, label, icon: Icon }) => {
            const on = path === href || path.startsWith(`${href}/`) || (href === "/dashboard" && path.startsWith("/tanks"));
            return <li key={href}><Link href={href} aria-current={on ? "page" : undefined} className={clsx("flex h-10 items-center gap-3 whitespace-nowrap rounded px-3 text-sm", on ? "bg-raised font-medium" : "text-muted hover:bg-raised hover:text-ink")}><Icon size={18} aria-hidden />{label}</Link></li>;
          })}
        </ul>
      </nav>
      <div className="min-w-0">
        <div className="flex items-center justify-end gap-2 border-b hairline px-5 py-2 text-sm">
          <button className="btn-quiet h-8 px-3" onClick={() => setTz(tz === "IST" ? "UTC" : "IST")} aria-label={`Showing ${tz}. Switch time zone`}>{tz}</button>
          <button className="btn-quiet h-8 w-8 px-0" onClick={flip} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>{theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
          <span className="hidden text-muted sm:inline">{user.name}</span>
          <button className="btn-quiet h-8 px-3" onClick={logout}><LogOut size={14} aria-hidden />Sign out</button>
        </div>
        <main className="mx-auto max-w-[1500px] px-5 py-8">{children}</main>
      </div>
    </div>
  );
}

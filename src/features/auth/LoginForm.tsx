"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { post } from "@/lib/api";

export function LoginForm() {
  const router = useRouter(), next = useSearchParams().get("next") ?? "/dashboard";
  const [err, setErr] = useState<string | null>(null), [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setErr(null);
    const f = new FormData(e.currentTarget);
    try { await post("/api/auth/login", { email: f.get("email"), password: f.get("password") }); router.replace(next.startsWith("/") ? next : "/dashboard"); router.refresh(); }
    catch (x) { setErr((x as Error).message); setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="w-full max-w-sm space-y-4">
      <div><label htmlFor="email" className="mb-1 block text-sm">Email</label><input id="email" name="email" type="email" autoComplete="username" required className="field" /></div>
      <div><label htmlFor="password" className="mb-1 block text-sm">Password</label><input id="password" name="password" type="password" autoComplete="current-password" required className="field" /></div>
      {err && <p role="alert" className="text-sm text-crit">{err}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

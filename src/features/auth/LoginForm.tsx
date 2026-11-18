"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, Lock, LogIn } from "lucide-react";
import { post } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Sanitize next redirect
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);

    try {
      await post("/api/auth/login", { email, password });
      router.replace(next);
      router.refresh();
    } catch {
      setBusy(false);
      // Map 401 or auth failures honestly per §6.2
      setErr("Email or password is incorrect.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {err && (
        <div
          role="alert"
          className="banner banner--error text-[13px] py-2.5 px-3.5 flex items-center gap-2"
        >
          <AlertCircle size={16} className="flex-shrink-0" aria-hidden />
          <span>{err}</span>
        </div>
      )}

      <Field label="Email" htmlFor="login-email" required>
        <Input
          id="login-email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@mams.local"
          disabled={busy}
        />
      </Field>

      <Field label="Password" htmlFor="login-password" required>
        <Input
          id="login-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={busy}
        />
      </Field>

      <div className="flex items-center justify-between pt-1">
        {/* Reserved slot with PHASE 2 chip per spec §6.2 */}
        <div className="flex items-center gap-1.5 text-[12px] text-[var(--tx-quiet)] select-none">
          <Lock size={12} aria-hidden />
          <span className="opacity-60">Forgot password?</span>
          <span className="chip chip--phase text-[9px] py-0 px-1.5 ml-1">PHASE 2</span>
        </div>
      </div>

      <Button
        type="submit"
        variant="primary"
        loading={busy}
        icon={LogIn}
        className="w-full justify-center h-11 text-[15px]"
      >
        {busy ? "Signing in…" : "Sign in to monitoring"}
      </Button>
    </form>
  );
}

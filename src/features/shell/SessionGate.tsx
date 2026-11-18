"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, Lock } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { post } from "@/lib/api";
import { useMe } from "@/lib/hooks";

export function SessionGate() {
  const [expired, setExpired] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: me, mutate: refreshMe } = useMe();

  useEffect(() => {
    const handleExpired = () => {
      setExpired(true);
    };

    window.addEventListener("ohtms:session-expired", handleExpired);
    return () => window.removeEventListener("ohtms:session-expired", handleExpired);
  }, []);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      // In OHTMS session reauth, we use the current user's email or admin fallback
      const email = me?.name ? `${me.name.toLowerCase().replace(/\s+/g, ".")}@mams.local` : "admin@mams.local";
      await post("/api/auth/login", { email, password });
      await refreshMe();
      setExpired(false);
      setPassword("");
    } catch {
      setError("Password incorrect. Please sign in again.");
    } finally {
      setBusy(false);
    }
  };

  if (!expired) return null;

  return (
    <Dialog
      open={expired}
      onClose={() => {}}
      title="Session Expired (M6)"
      eyebrow={{ icon: Lock, text: "AUTHENTICATION" }}
      size="md"
      mandatory={true}
    >
      <form onSubmit={handleSignIn} className="space-y-4">
        <p className="text-[14px] text-[var(--tx-main)]">
          Your hospital monitoring session has expired. To keep your current work and prevent
          loss of unsaved changes, please enter your password to continue.
        </p>

        {error && (
          <div className="banner banner--error text-[13px]">
            <AlertCircle size={16} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="control-label mb-1">Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoFocus
          />
        </div>

        <div className="flex items-center justify-between pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.location.assign("/login")}
          >
            Go to login page
          </Button>

          <Button type="submit" variant="primary" loading={busy}>
            Resume session
          </Button>
        </div>
      </form>
    </Dialog>
  );
}


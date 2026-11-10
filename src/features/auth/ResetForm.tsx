"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { post } from "@/lib/api";
import { validatePassword } from "@/lib/validation";
import { ICON } from "@/components/ui/icons";

export function ResetForm() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      toast.error("Invalid or missing reset token.");
      return;
    }

    const pwErr = validatePassword(password);
    if (pwErr) {
      toast.error(pwErr);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }

    try {
      setBusy(true);
      const res = await post<{ ok: boolean; __mock?: boolean }>("/api/auth/reset", {
        token,
        password,
      });

      if (res?.__mock) {
        toast.info("Password reset endpoint is a sample (Phase 2 backend pending)");
      } else {
        toast.success("Password reset successfully. You can now sign in.");
      }
      setResetDone(true);
    } catch {
      toast.error("Failed to reset password. Link may have expired.");
    } finally {
      setBusy(false);
    }
  };

  if (resetDone) {
    return (
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div style={{ fontSize: "14px", color: "var(--ok-tx)", fontWeight: 700 }}>
          Your password has been updated.
        </div>
        <div style={{ marginTop: "var(--sp-2)" }}>
          <Link href="/login">
            <Button variant="primary" size="md">
              Sign in with new password
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      {!token && (
        <div style={{ background: "var(--warn-bg)", color: "var(--warn-tx)", padding: "var(--sp-3)", borderRadius: "var(--r-md)", fontSize: "12px" }}>
          Notice: No reset token detected in URL query parameter.
        </div>
      )}

      <div>
        <label htmlFor="reset-pw" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
          New Password (min 8 characters)
        </label>
        <input
          id="reset-pw"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="field"
          style={{ width: "100%", marginTop: "4px" }}
        />
      </div>

      <div>
        <label htmlFor="reset-conf-pw" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
          Confirm New Password
        </label>
        <input
          id="reset-conf-pw"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="field"
          style={{ width: "100%", marginTop: "4px" }}
        />
      </div>

      <Button variant="primary" type="submit" loading={busy} icon={ICON.lock}>
        Set new password
      </Button>

      <div style={{ textAlign: "center", marginTop: "var(--sp-2)" }}>
        <Link href="/login" style={{ fontSize: "13px", color: "var(--brand-500)", textDecoration: "none" }}>
          Back to sign in
        </Link>
      </div>
    </form>
  );
}


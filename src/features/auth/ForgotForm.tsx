"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { post } from "@/lib/api";
import { validateEmail } from "@/lib/validation";
import { ICON } from "@/components/ui/icons";

export function ForgotForm() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateEmail(email);
    if (err) {
      toast.error(err);
      return;
    }

    try {
      setBusy(true);
      await post("/api/auth/forgot", {
        email: email.trim().toLowerCase(),
      });
      toast.success("Password reset instructions dispatched to your email.");
      setSubmitted(true);
    } catch {
      toast.error("Failed to request password reset.");
    } finally {
      setBusy(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div style={{ fontSize: "14px", color: "var(--tx-body)" }}>
          If an account exists for <strong>{email}</strong>, you will receive password reset instructions within 30 minutes.
        </div>
        <div style={{ marginTop: "var(--sp-4)" }}>
          <Link href="/login">
            <Button variant="outline" size="sm">
              Return to Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
      <div>
        <label htmlFor="forgot-email" style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "var(--tx-label)" }}>
          Hospital Email Address
        </label>
        <input
          id="forgot-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@mams.local"
          required
          className="field"
          style={{ width: "100%", marginTop: "4px" }}
        />
      </div>

      <Button variant="primary" type="submit" loading={busy} icon={ICON.signOut}>
        Send reset instructions
      </Button>

      <div style={{ textAlign: "center", marginTop: "var(--sp-2)" }}>
        <Link href="/login" style={{ fontSize: "13px", color: "var(--brand-500)", textDecoration: "none" }}>
          Back to sign in
        </Link>
      </div>
    </form>
  );
}

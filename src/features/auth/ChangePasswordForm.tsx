"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { post } from "@/lib/api";
import { validatePassword } from "@/lib/validation";
import { ICON } from "@/components/ui/icons";
import { PhaseChip } from "@/components/status/badges";

export function ChangePasswordForm() {
  const toast = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const pwErr = validatePassword(newPassword);
    if (pwErr) {
      toast.error(pwErr);
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    try {
      setBusy(true);
      const res = await post<{ ok: boolean; __mock?: boolean }>("/api/auth/password", {
        currentPassword,
        newPassword,
      });

      if (res && res.__mock) {
        toast.info("Password change isn't available yet (Phase 2)");
      } else {
        toast.success("Password updated successfully.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast.error("Failed to update password.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)", maxWidth: "440px" }}>
      <div>
        <label htmlFor="curr-pw" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tx-label)" }}>
          Current password
        </label>
        <input
          id="curr-pw"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="field"
          style={{ width: "100%", marginTop: "4px" }}
        />
      </div>

      <div>
        <label htmlFor="new-pw" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tx-label)" }}>
          New password (minimum 8 characters)
        </label>
        <input
          id="new-pw"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          className="field"
          style={{ width: "100%", marginTop: "4px" }}
        />
      </div>

      <div>
        <label htmlFor="conf-pw" style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--tx-label)" }}>
          Confirm new password
        </label>
        <input
          id="conf-pw"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          className="field"
          style={{ width: "100%", marginTop: "4px" }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "var(--sp-2)" }}>
        <span style={{ fontSize: "12px", color: "var(--tx-quiet)" }}>
          Phase 2 Security <PhaseChip phase={2} />
        </span>
        <Button variant="primary" type="submit" loading={busy} icon={ICON.lock}>
          Update password
        </Button>
      </div>
    </form>
  );
}

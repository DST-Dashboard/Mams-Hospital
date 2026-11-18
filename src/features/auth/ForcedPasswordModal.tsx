"use client";

import React, { useState } from "react";
import { Lock, AlertCircle } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { post } from "@/lib/api";
import { useMe } from "@/lib/hooks";
import { useToast } from "@/components/ui/Toast";
import { validatePassword } from "@/lib/validation";

export function ForcedPasswordModal() {
  const { data: me, mutate: refreshMe } = useMe();
  const toast = useToast();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!me?.mustChangePassword) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const pwErr = validatePassword(newPassword);
    if (pwErr) {
      setError(pwErr);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      setBusy(true);
      await post("/api/auth/password", {
        currentPassword,
        newPassword,
      });
      toast.success("Password changed successfully.");
      await refreshMe();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password. Verify current password.";
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={true}
      onClose={() => {}}
      title="Password Change Required"
      eyebrow={{ icon: Lock, text: "SECURITY POLICY" }}
      size="md"
      mandatory={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-[14px] text-[var(--tx-main)]">
          Hospital security policy requires you to change your initial or temporary password before accessing the system.
        </p>

        {error && (
          <div className="banner banner--error text-[13px] flex items-center gap-2">
            <AlertCircle size={16} aria-hidden />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="control-label mb-1">Current Password</label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoFocus
          />
        </div>

        <div>
          <label className="control-label mb-1">New Password (min 8 chars, 1 letter, 1 number/symbol)</label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <div>
          <label className="control-label mb-1">Confirm New Password</label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <div className="flex items-center justify-end pt-3">
          <Button type="submit" variant="primary" loading={busy}>
            Set New Password & Continue
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

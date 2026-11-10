"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Switch } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/Toast";
import { post, patch } from "@/lib/api";
import { validateEmail } from "@/lib/validation";
import { ICON } from "@/components/ui/icons";
import type { UserDTO } from "@/contracts/users";
import type { Role } from "@/lib/types";

interface UserFormProps {
  open: boolean;
  user: UserDTO | null;
  adminCount: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function UserForm({ open, user, adminCount, onClose, onSuccess }: UserFormProps) {
  const toast = useToast();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "viewer");
  const [active, setActive] = useState<boolean>(user ? !user.disabled : true);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const isEditing = !!user;
  const isLastAdmin = isEditing && user.role === "admin" && adminCount <= 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Enter user full name.");
      return;
    }

    const emailErr = validateEmail(email);
    if (emailErr) {
      toast.error(emailErr);
      return;
    }

    if (!isEditing && (!password || password.length < 8)) {
      toast.error("Password must be at least 8 characters.");
      return;
    }

    if (isLastAdmin && (role !== "admin" || !active)) {
      toast.error("At least one Admin is required. Cannot demote or disable the last administrator.");
      return;
    }

    try {
      setBusy(true);
      if (isEditing) {
        const res = await patch<{ ok: boolean; __mock?: boolean }>(`/api/users/${user.id}`, {
          name: name.trim(),
          role,
          disabled: !active,
          ...(password ? { password } : {}),
        });
        if (res?.__mock) {
          toast.info("Not saved: this endpoint is still a sample (backend pending)");
        } else {
          toast.success("User updated successfully.");
        }
      } else {
        const res = await post<{ ok: boolean; __mock?: boolean }>("/api/users", {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
          password,
        });
        if (res?.__mock) {
          toast.info("Not saved: this endpoint is still a sample (backend pending)");
        } else {
          toast.success("User created successfully.");
        }
      }
      onSuccess();
      onClose();
    } catch {
      toast.error("Failed to save user.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEditing ? `Edit User: ${user.name}` : "Add User Account"}
      eyebrow={{ icon: ICON.users, text: "ACCESS CONTROL" }}
      size="md"
      footer={
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--sp-2)", width: "100%" }}>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} loading={busy} icon={ICON.ok}>
            {isEditing ? "Save changes" : "Create user"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "var(--sp-4)" }}>
        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--tx-label)" }}>
            Full Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dr. Ramesh Kumar"
            className="field"
            style={{ width: "100%", marginTop: "4px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--tx-label)" }}>
            Email Address *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isEditing}
            placeholder="e.g. ramesh@mams.local"
            className="field"
            style={{ width: "100%", marginTop: "4px" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--tx-label)" }}>
            Account Role *
          </label>
          <Select
            value={role}
            disabled={isLastAdmin}
            onChange={(e) => setRole(e.target.value as Role)}
            options={[
              { value: "viewer", label: "Viewer (Read Only)" },
              { value: "operator", label: "Operator (Acknowledge & Inspect)" },
              { value: "admin", label: "Administrator (Full System Control)" },
            ]}
          />
          {isLastAdmin && (
            <div style={{ fontSize: "11px", color: "var(--warn-tx)", marginTop: "4px" }}>
              At least one Admin is required. Cannot demote the last administrator.
            </div>
          )}
        </div>

        {/* 3-Row Permission Summary */}
        <div style={{ background: "var(--bg-subtle)", border: "1px solid var(--bd-soft)", borderRadius: "var(--r-md)", padding: "var(--sp-3)", fontSize: "12px" }}>
          <div style={{ fontWeight: 700, marginBottom: "var(--sp-2)", color: "var(--tx-head)" }}>
            Role Privileges Summary:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--sp-1)", color: "var(--tx-body)" }}>
            <div><strong>Viewer:</strong> Read-only access to Overview, Tank detail, Analytics, Alerts (tabs 01–04).</div>
            <div><strong>Operator:</strong> Viewer + acknowledge & resolve alerts, view settings (tabs 01–05).</div>
            <div><strong>Admin:</strong> Operator + hardware nodes, users, calibration, audit log, system status (tabs 01–06).</div>
          </div>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--tx-label)" }}>
            {isEditing ? "Reset Password (leave empty to keep current)" : "Password *"}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isEditing ? "••••••••" : "Minimum 8 characters"}
            className="field"
            style={{ width: "100%", marginTop: "4px" }}
          />
        </div>

        <div style={{ borderTop: "1px solid var(--bd-soft)", paddingTop: "var(--sp-3)" }}>
          <Switch
            checked={active}
            disabled={isLastAdmin}
            onChange={setActive}
            label="Active Account"
            hint="Disabled users cannot log into the system."
          />
        </div>
      </form>
    </Dialog>
  );
}

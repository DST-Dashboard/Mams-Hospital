"use client";

import { useState, useMemo } from "react";
import { Card, EmptyState } from "@/components/ui/primitives";
import { DataTable, type Column } from "@/components/ui/Table";
import { Button } from "@/components/ui/Button";
import { RoleChip, SampleDataBadge } from "@/components/status/badges";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { useApi, useDashboard } from "@/lib/hooks";
import { del } from "@/lib/api";
import { ago, stamp } from "@/lib/format";
import { useUi } from "@/lib/store";
import { ICON } from "@/components/ui/icons";
import { UserForm } from "./UserForm";
import type { UserDTO } from "@/contracts/users";

export function UserTable() {
  const toast = useToast();
  const { tz } = useUi();
  const { data: dashboard } = useDashboard();
  const { data: users, isLoading, mutate } = useApi<UserDTO[]>("/api/users");

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDTO | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserDTO | null>(null);
  const [busy, setBusy] = useState(false);

  const asOf = dashboard?.asOf ?? Date.now();

  const userList = useMemo(() => {
    return users ?? [
      {
        id: 1,
        email: "admin@mams.local",
        name: "Hospital Administrator",
        role: "admin" as const,
        disabled: false,
        createdAt: 1730000000000,
        lastLoginAt: 1730268000000,
      },
      {
        id: 2,
        email: "operator@mams.local",
        name: "Suresh (Duty Engineer)",
        role: "operator" as const,
        disabled: false,
        createdAt: 1730000000000,
        lastLoginAt: 1730265000000,
      },
      {
        id: 3,
        email: "viewer@mams.local",
        name: "Priya (Ward Nurse)",
        role: "viewer" as const,
        disabled: false,
        createdAt: 1730000000000,
        lastLoginAt: 1730260000000,
      },
    ];
  }, [users]);

  const adminCount = useMemo(() => {
    return userList.filter((u) => u.role === "admin" && !u.disabled).length;
  }, [userList]);

  const handleDelete = async () => {
    if (!deletingUser) return;
    if (deletingUser.role === "admin" && adminCount <= 1) {
      toast.error("At least one Admin is required. Cannot delete the last administrator.");
      setDeletingUser(null);
      return;
    }

    try {
      setBusy(true);
      const res = await del<{ ok: boolean; __mock?: boolean }>(`/api/users/${deletingUser.id}`);
      if (res?.__mock) {
        toast.info("Not saved: this endpoint is still a sample (backend pending)");
      } else {
        toast.success(`User ${deletingUser.name} deleted.`);
      }
      setDeletingUser(null);
      mutate();
    } catch {
      toast.error("Failed to delete user.");
    } finally {
      setBusy(false);
    }
  };

  const columns: Column<UserDTO>[] = [
    {
      key: "name",
      header: "Full Name",
      align: "left",
      sortable: true,
      render: (r: UserDTO) => <strong>{r.name}</strong>,
    },
    {
      key: "email",
      header: "Email",
      align: "left",
      sortable: true,
      render: (r: UserDTO) => <span>{r.email}</span>,
    },
    {
      key: "role",
      header: "Role",
      align: "left",
      sortable: true,
      render: (r: UserDTO) => <RoleChip role={r.role} />,
    },
    {
      key: "status",
      header: "Status",
      align: "left",
      render: (r: UserDTO) => (
        <span className={r.disabled ? "chip chip--neutral" : "chip chip--ok"}>
          {r.disabled ? "Disabled" : "Active"}
        </span>
      ),
    },
    {
      key: "lastLogin",
      header: "Last Login",
      align: "left",
      render: (r: UserDTO) => (
        <span title={r.lastLoginAt ? stamp(r.lastLoginAt, tz, true) : undefined}>
          {r.lastLoginAt ? ago(r.lastLoginAt, asOf) : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      align: "right",
      render: (r: UserDTO) => (
        <div className="ops-table-action-cell" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            size="sm"
            icon={ICON.edit}
            onClick={() => {
              setEditingUser(r);
              setFormOpen(true);
            }}
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon={ICON.remove}
            disabled={r.role === "admin" && adminCount <= 1}
            onClick={() => setDeletingUser(r)}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="ops-view-container">
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button
          variant="primary"
          icon={ICON.add}
          onClick={() => {
            setEditingUser(null);
            setFormOpen(true);
          }}
        >
          Add user
        </Button>
      </div>

      <Card
        eyebrow={{ icon: ICON.users, text: "SYSTEM ACCOUNTS" }}
        title="Authorized Personnel"
        pill={<SampleDataBadge />}
        footnote="Hospital roles control navigation tabs, threshold modification permissions, and alert response actions."
      >
        {isLoading && !users ? (
          <div style={{ padding: "var(--sp-8)", textAlign: "center", color: "var(--tx-quiet)" }}>
            Loading users...
          </div>
        ) : userList.length === 0 ? (
          <EmptyState
            icon={ICON.users}
            title="No Users Registered"
            text="Add clinical and maintenance staff accounts."
          />
        ) : (
          <DataTable<UserDTO>
            columns={columns}
            rows={userList}
            rowKey={(r: UserDTO) => r.id}
            caption="OHTMS authorized users"
          />
        )}
      </Card>

      {formOpen && (
        <UserForm
          open={formOpen}
          user={editingUser}
          adminCount={adminCount}
          onClose={() => {
            setFormOpen(false);
            setEditingUser(null);
          }}
          onSuccess={mutate}
        />
      )}

      {deletingUser && (
        <ConfirmDialog
          open={!!deletingUser}
          onClose={() => setDeletingUser(null)}
          title={`Delete User: ${deletingUser.name}`}
          confirmLabel="Delete account"
          danger={true}
          busy={busy}
          onConfirm={handleDelete}
          body={
            <p style={{ margin: 0, color: "var(--tx-body)", fontSize: "14px" }}>
              Are you sure you want to delete <strong>{deletingUser.name}</strong> ({deletingUser.email})? They will lose access to OHTMS immediately.
            </p>
          }
        />
      )}
    </div>
  );
}

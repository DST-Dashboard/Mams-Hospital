"use client";

import { PageHeader } from "@/components/ui/primitives";
import { SecondaryTabs } from "@/components/ui/Tabs";
import { UserTable } from "./UserTable";
import { ICON } from "@/components/ui/icons";

const adminTabs = [
  { id: "nodes", label: "Nodes", href: "/admin/nodes" },
  { id: "users", label: "Users", href: "/admin/users" },
  { id: "audit", label: "Audit log", href: "/admin/audit" },
  { id: "system", label: "System", href: "/admin/system" },
];

export function UsersView() {
  return (
    <>
      <PageHeader
        eyebrow={{ icon: ICON.users, text: "ADMINISTRATION" }}
        title="User Access & Role Privileges"
        intro="Manage clinical, engineering and administrative access permissions for hospital staff."
      />

      <SecondaryTabs tabs={adminTabs} activeId="users" />

      <UserTable />
    </>
  );
}

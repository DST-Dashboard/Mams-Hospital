"use client";

import { PageHeader } from "@/components/ui/primitives";
import { SecondaryTabs } from "@/components/ui/Tabs";
import { AuditTable } from "./AuditTable";
import { ICON } from "@/components/ui/icons";

const adminTabs = [
  { id: "nodes", label: "Nodes", href: "/admin/nodes" },
  { id: "users", label: "Users", href: "/admin/users" },
  { id: "audit", label: "Audit log", href: "/admin/audit" },
  { id: "system", label: "System", href: "/admin/system" },
];

export function AuditView() {
  return (
    <>
      <PageHeader
        eyebrow={{ icon: ICON.audit, text: "ADMINISTRATION" }}
        title="Regulatory Compliance Audit Log"
        intro="Verifiable record of system threshold edits, node modifications, and staff alert acknowledgements."
      />

      <SecondaryTabs tabs={adminTabs} activeId="audit" />

      <AuditTable />
    </>
  );
}

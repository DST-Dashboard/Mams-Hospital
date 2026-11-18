"use client";

import { PageHeader } from "@/components/ui/primitives";
import { SecondaryTabs } from "@/components/ui/Tabs";
import { NodeTable } from "./NodeTable";
import { ICON } from "@/components/ui/icons";

const adminTabs = [
  { id: "nodes", label: "Nodes", href: "/admin/nodes" },
  { id: "users", label: "Users", href: "/admin/users" },
  { id: "audit", label: "Audit log", href: "/admin/audit" },
  { id: "system", label: "System", href: "/admin/system" },
];

export function NodesAdminView() {
  return (
    <>
      <PageHeader
        eyebrow={{ icon: ICON.gateway, text: "ADMINISTRATION" }}
        title="Hardware Nodes & Calibration"
        intro="Provision ultrasonic transceivers, calibrate tank dimensions and oversee LoRaWAN telemetry status."
      />

      <SecondaryTabs tabs={adminTabs} activeId="nodes" />

      <NodeTable />
    </>
  );
}

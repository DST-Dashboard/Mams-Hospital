import { NodesAdminView } from "@/features/nodes-admin/NodesAdminView";

export const metadata = {
  title: "Nodes Administration · MAMS Hospital OHTMS",
  description: "Hardware node provisioning, LoRaWAN Device EUI calibration and telemetry status.",
};

export default function AdminNodesPage() {
  return <NodesAdminView />;
}

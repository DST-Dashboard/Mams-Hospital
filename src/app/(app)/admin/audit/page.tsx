import { AuditView } from "@/features/audit/AuditView";

export const metadata = {
  title: "Audit Log · MAMS Hospital",
  description: "Tamper-evident operational audit trail and compliance activity logs.",
};

export default function AuditAdminPage() {
  return <AuditView />;
}

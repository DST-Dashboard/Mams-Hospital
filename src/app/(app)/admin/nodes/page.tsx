import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Nodes" };
export default function Page() {
  return (<><PageHeader title="Nodes" /><Planned title="Nodes" phase="Phase 1" items={["C-04 Add node (5-step wizard)", "C-05 Edit node", "C-06 Soft delete + restore", "C-07 Status management", "C-01 First-load dimensions modal"]} /></>);
}

import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Audit log" };
export default function Page() {
  return (<><PageHeader title="Audit log" /><Planned title="Audit log" phase="Phase 2" items={["S-03 Who did what, when", "Before / after values", "CSV export"]} /></>);
}

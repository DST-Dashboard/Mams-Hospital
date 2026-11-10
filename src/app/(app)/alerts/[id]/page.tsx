import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Alert detail" };
export default function Page() {
  return (<><PageHeader title="Alert detail" /><Planned title="Alert detail" phase="Phase 1" items={["A-12 Alert detail with trigger reading", "Sensor health at time of alert", "Acknowledge with note", "Delivery log per channel"]} /></>);
}

import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Alerts" };
export default function Page() {
  return (<><PageHeader title="Alerts" /><Planned title="Alerts" phase="Phase 1" items={["A-13 Alert log with filters", "A-14 Acknowledge workflow", "A-15 Resolve / dismiss", "A-30 Snooze", "A-25 Maintenance mode"]} /></>);
}

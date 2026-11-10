import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Settings" };
export default function Page() {
  return (<><PageHeader title="Settings" /><Planned title="Settings" phase="Phase 1" items={["C-02 Tank settings", "C-03 Per-tank thresholds", "A-24 Quiet hours", "A-28 Notification preferences"]} /></>);
}

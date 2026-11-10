// [FE-08] OWNER: frontend · replace the placeholder with the real screen (see docs/SCREENS.md)
import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Notification settings" };
export default function Page() {
  return (<><PageHeader title="Notification settings" /><Planned title="Notification settings" phase="Phase 2" items={["A-28 channels per severity", "A-24 quiet hours"]} /></>);
}

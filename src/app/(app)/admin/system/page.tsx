// [FE-10] OWNER: frontend · replace the placeholder with the real screen (see docs/SCREENS.md)
import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "System status" };
export default function Page() {
  return (<><PageHeader title="System status" /><Planned title="System status" phase="Phase 2" items={["S-10 uptime, last uplink per device, jobs"]} /></>);
}

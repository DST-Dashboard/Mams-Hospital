// [FE-07] OWNER: frontend · replace the placeholder with the real screen (see docs/SCREENS.md)
import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Deleted nodes" };
export default function Page() {
  return (<><PageHeader title="Deleted nodes" /><Planned title="Deleted nodes" phase="Phase 1" items={["C-06 restore within 90 days"]} /></>);
}

// [FE-07] OWNER: frontend · replace the placeholder with the real screen (see docs/SCREENS.md)
import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Add node" };
export default function Page() {
  return (<><PageHeader title="Add node" /><Planned title="Add node" phase="Phase 1" items={["C-04 five-step wizard", "Save as Draft / Activate"]} /></>);
}

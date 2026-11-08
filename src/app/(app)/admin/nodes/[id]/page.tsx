// [FE-07] OWNER: frontend · replace the placeholder with the real screen (see docs/SCREENS.md)
import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Edit node" };
export default function Page() {
  return (<><PageHeader title="Edit node" /><Planned title="Edit node" phase="Phase 1" items={["C-05 edit all fields", "C-07 status"]} /></>);
}

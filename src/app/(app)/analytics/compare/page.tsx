// [FE-09] OWNER: frontend · replace the placeholder with the real screen (see docs/SCREENS.md)
import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Compare tanks" };
export default function Page() {
  return (<><PageHeader title="Compare tanks" /><Planned title="Compare tanks" phase="Phase 3" items={["N-05 cross-tank chart", "Consumption ranking", "Health score"]} /></>);
}

// [FE-08] OWNER: frontend · replace the placeholder with the real screen (see docs/SCREENS.md)
import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Thresholds" };
export default function Page() {
  return (<><PageHeader title="Thresholds" /><Planned title="Thresholds" phase="Phase 1" items={["C-03 warning / critical / empty", "Persistence + cooldown"]} /></>);
}

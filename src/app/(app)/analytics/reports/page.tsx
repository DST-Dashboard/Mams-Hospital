// [FE-09] OWNER: frontend · replace the placeholder with the real screen (see docs/SCREENS.md)
import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Reports" };
export default function Page() {
  return (<><PageHeader title="Reports" /><Planned title="Reports" phase="Phase 3" items={["N-06 weekly PDF/CSV", "Monthly compliance", "Incident report"]} /></>);
}

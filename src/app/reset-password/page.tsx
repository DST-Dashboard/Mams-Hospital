// [FE-12] OWNER: frontend · replace the placeholder with the real screen (see docs/SCREENS.md)
import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Reset password" };
export default function Page() {
  return (<><PageHeader title="Reset password" /><Planned title="Reset password" phase="Phase 2" items={["S-06 set a new password"]} /></>);
}

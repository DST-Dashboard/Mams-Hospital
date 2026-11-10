// [FE-12] OWNER: frontend · replace the placeholder with the real screen (see docs/SCREENS.md)
import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Forgot password" };
export default function Page() {
  return (<><PageHeader title="Forgot password" /><Planned title="Forgot password" phase="Phase 2" items={["S-06 request reset link"]} /></>);
}

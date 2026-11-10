import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Users" };
export default function Page() {
  return (<><PageHeader title="Users" /><Planned title="Users" phase="Phase 2" items={["S-02 Role management", "S-06 Password reset", "S-04 Session management"]} /></>);
}

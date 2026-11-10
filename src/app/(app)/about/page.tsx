import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "About" };
export default function Page() {
  return (<><PageHeader title="About" /><Planned title="About" phase="Phase 2" items={["U-13 System diagram", "U-14 Glossary", "M-05 Methodology: what is simulated"]} /></>);
}

// [FE-13] OWNER: frontend · replace the placeholder with the real screen (see docs/SCREENS.md)
import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Kiosk" };
export default function Page() {
  return (<><PageHeader title="Kiosk" /><Planned title="Kiosk" phase="Phase 3" items={["U-09 fullscreen control-room view", "Auto-rotating tanks", "Big numerals"]} /></>);
}

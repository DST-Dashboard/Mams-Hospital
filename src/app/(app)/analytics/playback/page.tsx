// [FE-09] OWNER: frontend · replace the placeholder with the real screen (see docs/SCREENS.md)
import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Playback" };
export default function Page() {
  return (<><PageHeader title="Playback" /><Planned title="Playback" phase="Phase 3" items={["N-14 time-lapse replay"]} /></>);
}

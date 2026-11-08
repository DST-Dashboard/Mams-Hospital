import { PageHeader, Planned } from "@/components/ui/primitives";
export const metadata = { title: "Analytics" };
export default function Page() {
  return (<><PageHeader title="Analytics" /><Planned title="Analytics" phase="Phase 1–3" items={["N-01 Descriptive stats per window", "N-05 Cross-tank comparison", "N-06 Weekly report (PDF/CSV)", "N-08 Anomaly detection", "N-11 Predictive exhaustion", "N-14 Data playback"]} /></>);
}

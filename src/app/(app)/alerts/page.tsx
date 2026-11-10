import { AlertsView } from "@/features/alerts/AlertsView";

export const metadata = {
  title: "Alerts · MAMS Hospital OHTMS",
  description: "Real-time incident response log and threshold violation alerts.",
};

export default function AlertsPage() {
  return <AlertsView />;
}

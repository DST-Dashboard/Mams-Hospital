import { notFound } from "next/navigation";
import { PageFrame } from "@/features/shell/PageFrame";
import { ViewGuide } from "@/components/ui/primitives";
import { AlertDetail } from "@/features/alerts/AlertDetail";

export const metadata = {
  title: "Alert Detail · MAMS Hospital OHTMS",
};

export default async function AlertDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const idStr = (await params).id;
  const alertId = parseInt(idStr, 10);
  if (isNaN(alertId) || alertId <= 0) {
    notFound();
  }

  return (
    <PageFrame tab="alerts">
      <ViewGuide
        question="Is this alert real?"
        description="The reading that triggered the alert, the sensor's health, and the response so far."
        steps={[
          "Read the sensor-health verdict.",
          "Check the chart around the event.",
          "Record your action and acknowledge.",
        ]}
        howToRead="The dotted line is the threshold that was crossed."
        storageKey="ohtms_guide_alert_detail"
      />

      <AlertDetail alertId={alertId} />
    </PageFrame>
  );
}

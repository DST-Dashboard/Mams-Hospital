import { SettingsView } from "@/features/settings/SettingsView";

export const metadata = {
  title: "Settings · MAMS Hospital OHTMS",
  description: "Alert thresholds, physical tank calibration, and system preferences.",
};

export default function SettingsPage() {
  return <SettingsView />;
}

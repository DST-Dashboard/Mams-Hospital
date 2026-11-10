import clsx from "clsx";
import { AlertTriangle, CircleCheck, CircleSlash, FlaskConical, Siren, TriangleAlert } from "lucide-react";
import type { Severity } from "@/domain";
import type { Freshness } from "@/server/services/dashboard";

const FRESH = { fresh: ["text-ok", "Live", CircleCheck], stale: ["text-warn", "Delayed", TriangleAlert], offline: ["text-crit", "Offline", CircleSlash], none: ["text-muted", "No data", CircleSlash] } as const;
/** Colour is never the only signal: every state also has an icon and a word (WCAG). */
export function FreshnessPill({ state, label }: { state: Freshness; label?: string }) {
  const [c, word, Icon] = FRESH[state];
  return <span className={clsx("inline-flex items-center gap-1.5 text-xs font-medium", c)}><Icon size={14} aria-hidden />{label ?? word}</span>;
}
export const SimulatedBadge = () => (
  <span title="This tank's readings come from the physics simulation, not hardware" className="inline-flex items-center gap-1 rounded border hairline px-1.5 py-0.5 text-xs text-muted"><FlaskConical size={12} aria-hidden />Simulated</span>
);
const SEV = { info: ["text-info", AlertTriangle], warning: ["text-warn", TriangleAlert], critical: ["text-crit", AlertTriangle], emergency: ["text-emerg", Siren] } as const;
export function SeverityIcon({ severity, size = 16 }: { severity: Severity; size?: number }) {
  const [c, Icon] = SEV[severity];
  return <Icon size={size} className={c} aria-label={severity} />;
}

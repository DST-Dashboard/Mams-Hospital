import type { Severity } from "@/domain";

interface Props {
  pct: number | null; // null = no data → empty vessel with a "?" (never drawn as 0 %)
  thresholds: { warnPct: number; critPct: number; emptyPct: number };
  severity?: Severity | null;
  label: string; litres?: string;
}
const W = 132, H = 280, X = 34, TOP = 14, BOT = 252, BODY_W = 64; // vessel inner geometry
const y = (p: number) => BOT - ((BOT - TOP) * p) / 100;

/** A graduated measuring cylinder: ticks every 10 %, alert thresholds as coloured rules, water that rises and drifts. */
export function TankSvg({ pct, thresholds, severity, label, litres }: Props) {
  const level = pct == null ? 0 : Math.max(0, Math.min(100, pct));
  const water = severity === "emergency" || severity === "critical" ? "var(--crit)" : severity === "warning" ? "var(--warn)" : "var(--tide)";
  const clip = `clip-${label.replace(/\W/g, "")}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" className="mx-auto h-auto w-full max-w-[150px]"
      aria-label={pct == null ? `${label}: no reading` : `${label}: ${Math.round(pct)} percent full${litres ? `, ${litres}` : ""}`}>
      <defs><clipPath id={clip}><rect x={X} y={TOP} width={BODY_W} height={BOT - TOP} rx="6" /></clipPath></defs>
      <rect x={X} y={TOP} width={BODY_W} height={BOT - TOP} rx="6" fill="rgb(var(--surface))" stroke="rgb(var(--line))" strokeWidth="1.5" />
      <g clipPath={`url(#${clip})`}>
        <g style={{ transform: `translateY(${y(level) - TOP}px)`, transition: "transform 900ms cubic-bezier(.2,.8,.2,1)" }}>
          <rect x={X - 70} y={TOP} width={BODY_W + 140} height={BOT - TOP + 20} fill={`rgb(${water} / 0.78)`} />
          <path className="water-drift" d={`M${X - 70} ${TOP} q15 -5 30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 t30 0 v6 h-300 z`} fill={`rgb(${water})`} />
        </g>
      </g>
      {/* graduations */}
      {Array.from({ length: 11 }, (_, i) => i * 10).map((p) => (
        <g key={p}>
          <line x1={X + BODY_W} x2={X + BODY_W + (p % 50 === 0 ? 12 : 7)} y1={y(p)} y2={y(p)} stroke="rgb(var(--muted))" strokeWidth={p % 50 === 0 ? 1.4 : 1} />
          {p % 50 === 0 && <text x={X + BODY_W + 16} y={y(p) + 4} fontSize="11" fill="rgb(var(--muted))" className="num">{p}</text>}
        </g>
      ))}
      {/* alert thresholds — drawn on the left so they never collide with the scale */}
      {([["warnPct", "warn"], ["critPct", "crit"], ["emptyPct", "emerg"]] as const).map(([k, c]) => (
        <line key={k} x1={X - 14} x2={X + BODY_W} y1={y(thresholds[k])} y2={y(thresholds[k])} stroke={`rgb(var(--${c}))`} strokeWidth="1.5" strokeDasharray="3 3" />
      ))}
      {pct == null && <text x={X + BODY_W / 2} y={(TOP + BOT) / 2} textAnchor="middle" fontSize="34" fill="rgb(var(--muted))">?</text>}
    </svg>
  );
}

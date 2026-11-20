"use client";

export function SystemDiagram() {
  return (
    <div className="ops-system-diagram">
      <svg
        viewBox="0 0 920 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label="Manual Data Entry & Dashboard Telemetry Architecture: Physical tank level measurement recorded by authorized tank owner, authenticated and validated by Next.js backend, evaluated for alerts, and rendered across real-time hospital visualizations."
      >
        <defs>
          <linearGradient id="boxGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--bg-card)" />
            <stop offset="100%" stopColor="var(--bg-subtle)" />
          </linearGradient>
          <filter id="shadow" x="-5%" y="-5%" width="110%" height="115%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.06" />
          </filter>
          <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 1 L 10 5 L 0 9 z" fill="var(--brand-600)" />
          </marker>
        </defs>

        {/* 1. Rooftop Tank Inspection */}
        <g transform="translate(10, 30)">
          <rect width="135" height="130" rx="12" fill="url(#boxGrad)" stroke="var(--bd-strong)" filter="url(#shadow)" />
          <circle cx="67" cy="40" r="18" fill="var(--info-bg)" stroke="var(--brand-600)" strokeWidth="2" />
          <text x="67" y="44" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--brand-600)">1</text>
          <text x="67" y="80" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--tx-head)">Tank Inspection</text>
          <text x="67" y="100" textAnchor="middle" fontSize="10" fill="var(--tx-quiet)">Distance / Depth</text>
          <text x="67" y="115" textAnchor="middle" fontSize="9" fill="var(--brand-500)">Physical Gauge / Dip</text>
          <text x="67" y="145" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--tx-label)">Rooftop Tank</text>
        </g>

        {/* Arrow 1 -> 2 */}
        <path d="M 145 95 L 180 95" stroke="var(--brand-600)" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* 2. Authorized Tank Owner / Operator */}
        <g transform="translate(190, 30)">
          <rect width="135" height="130" rx="12" fill="url(#boxGrad)" stroke="var(--bd-strong)" filter="url(#shadow)" />
          <circle cx="67" cy="40" r="18" fill="var(--info-bg)" stroke="var(--brand-600)" strokeWidth="2" />
          <text x="67" y="44" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--brand-600)">2</text>
          <text x="67" y="80" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--tx-head)">Manual Entry</text>
          <text x="67" y="100" textAnchor="middle" fontSize="10" fill="var(--tx-quiet)">Authorized User</text>
          <text x="67" y="115" textAnchor="middle" fontSize="9" fill="var(--ok-tx)">RBAC Protected</text>
          <text x="67" y="145" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--tx-label)">Operator Modal</text>
        </g>

        {/* Arrow 2 -> 3 */}
        <path d="M 325 95 L 360 95" stroke="var(--brand-600)" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* 3. Role & Data Validation */}
        <g transform="translate(370, 30)">
          <rect width="135" height="130" rx="12" fill="url(#boxGrad)" stroke="var(--bd-strong)" filter="url(#shadow)" />
          <circle cx="67" cy="40" r="18" fill="var(--warn-bg)" stroke="var(--accent-500)" strokeWidth="2" />
          <text x="67" y="44" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--accent-500)">3</text>
          <text x="67" y="80" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--tx-head)">Backend Check</text>
          <text x="67" y="100" textAnchor="middle" fontSize="10" fill="var(--tx-quiet)">Ownership & Geometry</text>
          <text x="67" y="115" textAnchor="middle" fontSize="9" fill="var(--data-600)">Conflict Guard</text>
          <text x="67" y="145" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--tx-label)">POST /api/readings</text>
        </g>

        {/* Arrow 3 -> 4 */}
        <path d="M 505 95 L 540 95" stroke="var(--brand-600)" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* 4. Persistence & Audit Trail */}
        <g transform="translate(550, 30)">
          <rect width="135" height="130" rx="12" fill="url(#boxGrad)" stroke="var(--bd-strong)" filter="url(#shadow)" />
          <circle cx="67" cy="40" r="18" fill="var(--info-bg)" stroke="var(--brand-600)" strokeWidth="2" />
          <text x="67" y="44" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--brand-600)">4</text>
          <text x="67" y="80" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--tx-head)">Storage & Audit</text>
          <text x="67" y="100" textAnchor="middle" fontSize="10" fill="var(--tx-quiet)">source: &apos;manual&apos;</text>
          <text x="67" y="115" textAnchor="middle" fontSize="9" fill="var(--brand-500)">User ID Recorded</text>
          <text x="67" y="145" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--tx-label)">PostgreSQL / Audit</text>
        </g>

        {/* Arrow 4 -> 5 */}
        <path d="M 685 95 L 720 95" stroke="var(--brand-600)" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* 5. Live Hospital Dashboard */}
        <g transform="translate(730, 30)">
          <rect width="175" height="130" rx="12" fill="var(--brand-950)" stroke="var(--brand-600)" strokeWidth="2" filter="url(#shadow)" />
          <circle cx="87" cy="40" r="18" fill="var(--brand-700)" stroke="var(--live)" strokeWidth="2" />
          <text x="87" y="44" textAnchor="middle" fontSize="11" fontWeight="800" fill="#ffffff">5</text>
          <text x="87" y="80" textAnchor="middle" fontSize="14" fontWeight="900" fill="#ffffff">Hospital Dashboard</text>
          <text x="87" y="100" textAnchor="middle" fontSize="10" fill="#becfd6">Real-time Telemetry</text>
          <text x="87" y="115" textAnchor="middle" fontSize="9" fill="var(--live)">Charts & Alerts</text>
          <text x="87" y="145" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff">Data Module Visuals</text>
        </g>
      </svg>

      <div style={{ marginTop: "var(--sp-4)", borderTop: "1px solid var(--bd-soft)", paddingTop: "var(--sp-3)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--tx-quiet)" }}>
        <span>Role-Based Telemetry Workflow · Physical measurement to verified dashboard analytics</span>
        <strong style={{ color: "var(--brand-600)" }}>Manual Entry Pipeline Active</strong>
      </div>
    </div>
  );
}

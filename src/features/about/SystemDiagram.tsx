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
        aria-label="Physical to Cloud Architecture Diagram: Rooftop ultrasonic sensor transmitting via LoRaWAN to SenseCap gateway, forwarded to The Things Stack and ingested into the monitoring system within 1 to 2 seconds."
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

        {/* 1. Rooftop Sensor */}
        <g transform="translate(10, 30)">
          <rect width="125" height="130" rx="12" fill="url(#boxGrad)" stroke="var(--bd-strong)" filter="url(#shadow)" />
          <circle cx="62" cy="40" r="18" fill="var(--info-bg)" stroke="var(--brand-600)" strokeWidth="2" />
          <text x="62" y="44" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--brand-600)">1</text>
          <text x="62" y="80" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--tx-head)">Sensor Lid</text>
          <text x="62" y="100" textAnchor="middle" fontSize="10" fill="var(--tx-quiet)">Ultrasonic Beam</text>
          <text x="62" y="115" textAnchor="middle" fontSize="9" fill="var(--brand-500)">±1 cm precision</text>
          <text x="62" y="145" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--tx-label)">Rooftop Tank</text>
        </g>

        {/* Arrow 1 -> 2 */}
        <path d="M 135 95 L 165 95" stroke="var(--brand-600)" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* 2. Wio-E5 Wireless Node */}
        <g transform="translate(175, 30)">
          <rect width="125" height="130" rx="12" fill="url(#boxGrad)" stroke="var(--bd-strong)" filter="url(#shadow)" />
          <circle cx="62" cy="40" r="18" fill="var(--info-bg)" stroke="var(--brand-600)" strokeWidth="2" />
          <text x="62" y="44" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--brand-600)">2</text>
          <text x="62" y="80" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--tx-head)">Wio-E5 Node</text>
          <text x="62" y="100" textAnchor="middle" fontSize="10" fill="var(--tx-quiet)">STM32WLE5JC</text>
          <text x="62" y="115" textAnchor="middle" fontSize="9" fill="var(--ok-tx)">Battery 3.6V</text>
          <text x="62" y="145" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--tx-label)">Telemetry Radio</text>
        </g>

        {/* Arrow 2 -> 3 (Wireless LoRa) */}
        <g>
          <path d="M 300 95 L 340 95" stroke="var(--accent-500)" strokeWidth="2" strokeDasharray="4 4" markerEnd="url(#arrow)" />
          <text x="320" y="85" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--accent-500)">868 MHz</text>
        </g>

        {/* 3. SenseCap Gateway */}
        <g transform="translate(350, 30)">
          <rect width="125" height="130" rx="12" fill="url(#boxGrad)" stroke="var(--bd-strong)" filter="url(#shadow)" />
          <circle cx="62" cy="40" r="18" fill="var(--warn-bg)" stroke="var(--accent-500)" strokeWidth="2" />
          <text x="62" y="44" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--accent-500)">3</text>
          <text x="62" y="80" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--tx-head)">LoRa Gateway</text>
          <text x="62" y="100" textAnchor="middle" fontSize="10" fill="var(--tx-quiet)">SenseCap Outdoor</text>
          <text x="62" y="115" textAnchor="middle" fontSize="9" fill="var(--data-600)">Hospital Tower</text>
          <text x="62" y="145" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--tx-label)">Base Station</text>
        </g>

        {/* Arrow 3 -> 4 */}
        <path d="M 475 95 L 515 95" stroke="var(--brand-600)" strokeWidth="2" markerEnd="url(#arrow)" />

        {/* 4. The Things Stack (TTS) */}
        <g transform="translate(525, 30)">
          <rect width="125" height="130" rx="12" fill="url(#boxGrad)" stroke="var(--bd-strong)" filter="url(#shadow)" />
          <circle cx="62" cy="40" r="18" fill="var(--info-bg)" stroke="var(--brand-600)" strokeWidth="2" />
          <text x="62" y="44" textAnchor="middle" fontSize="11" fontWeight="700" fill="var(--brand-600)">4</text>
          <text x="62" y="80" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--tx-head)">Things Stack</text>
          <text x="62" y="100" textAnchor="middle" fontSize="10" fill="var(--tx-quiet)">TTS Cloud LNS</text>
          <text x="62" y="115" textAnchor="middle" fontSize="9" fill="var(--brand-500)">Decodes Payload</text>
          <text x="62" y="145" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--tx-label)">Network Server</text>
        </g>

        {/* Arrow 4 -> 5 */}
        <g>
          <path d="M 650 95 L 690 95" stroke="var(--brand-600)" strokeWidth="2" markerEnd="url(#arrow)" />
          <text x="670" y="85" textAnchor="middle" fontSize="9" fontWeight="700" fill="var(--brand-600)">HTTPS</text>
        </g>

        {/* 5. Next.js Backend & Dashboard */}
        <g transform="translate(700, 30)">
          <rect width="180" height="130" rx="12" fill="var(--brand-950)" stroke="var(--brand-600)" strokeWidth="2" filter="url(#shadow)" />
          <circle cx="90" cy="40" r="18" fill="var(--brand-700)" stroke="var(--live)" strokeWidth="2" />
          <text x="90" y="44" textAnchor="middle" fontSize="11" fontWeight="800" fill="#ffffff">5</text>
          <text x="90" y="80" textAnchor="middle" fontSize="14" fontWeight="900" fill="#ffffff">MAMS Server</text>
          <text x="90" y="100" textAnchor="middle" fontSize="10" fill="#becfd6">Next.js 15 App Router</text>
          <text x="90" y="115" textAnchor="middle" fontSize="9" fill="var(--live)">Real-time Webhook</text>
          <text x="90" y="145" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff">Hospital Dashboard</text>
        </g>
      </svg>

      <div style={{ marginTop: "var(--sp-4)", borderTop: "1px solid var(--bd-soft)", paddingTop: "var(--sp-3)", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--tx-quiet)" }}>
        <span>10-step telemetry journey · Ultrasonic bounce to browser alert render</span>
        <strong style={{ color: "var(--brand-600)" }}>Total End-to-End Latency ~1–2 seconds</strong>
      </div>
    </div>
  );
}

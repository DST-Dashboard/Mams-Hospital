import React from "react";
import Image from "next/image";

export function HospitalMark({ size = 75 }: { size?: number }) {
  return (
    <Image
      src="/assets/mams-logo.png"
      alt="MAMS Hospital"
      width={size}
      height={size}
      priority
      className="rounded-2xl object-contain"
    />
  );
}

export function OhtmsMark({
  size = 65,
  wordmark = true,
}: {
  size?: number;
  wordmark?: boolean;
}) {
  const width = wordmark ? (size * 220) / 65 : size;
  return (
    <svg
      width={width}
      height={size}
      viewBox={wordmark ? "0 0 220 65" : "0 0 65 65"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="OHTMS Mark"
      style={{
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.08))",
        transition: "transform 0.4s ease, filter 0.4s ease",
      }}
    >
      <defs>
        <linearGradient id="ohtmsWaterGrad" x1="0" y1="25" x2="0" y2="55" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--data-600, #087e83)" />
          <stop offset="1" stopColor="var(--data-700, #06666a)" />
        </linearGradient>
      </defs>

      {/* Tank glyph container (65x65 box) */}
      <g transform="translate(5, 5)">
        {/* Sensor on lid */}
        <rect x="23" y="4" width="9" height="5" rx="1.5" fill="var(--brand-800, #003b6d)" />
        <circle cx="27.5" cy="6.5" r="1.5" fill="var(--accent-500, #f26522)" />

        {/* Cylinder body outline */}
        <rect
          x="12"
          y="9"
          width="31"
          height="42"
          rx="5"
          fill="var(--bg-card, #ffffff)"
          stroke="var(--brand-800, #003b6d)"
          strokeWidth="2.5"
        />

        {/* Water fill */}
        <path
          d="M13.5 28C17 26.5 22 29 27.5 28C33 27 38 29 41.5 28V46C41.5 48.5 39.5 50 37 50H18C15.5 50 13.5 48.5 13.5 46V28Z"
          fill="url(#ohtmsWaterGrad)"
        />

        {/* Level tick indicators */}
        <line x1="43.5" y1="18" x2="40" y2="18" stroke="var(--warn-tx, #795314)" strokeWidth="1.5" />
        <line x1="43.5" y1="36" x2="40" y2="36" stroke="var(--err-tx, #933629)" strokeWidth="1.5" />
      </g>

      {/* Wordmark */}
      {wordmark && (
        <g transform="translate(68, 43)">
          <text
            fontFamily="var(--f-display, Merriweather, Georgia, serif)"
            fontSize="30"
            fontWeight="900"
            letterSpacing="-0.5px"
            fill="var(--tx-head, #003b6d)"
          >
            OHTMS
          </text>
        </g>
      )}
    </svg>
  );
}


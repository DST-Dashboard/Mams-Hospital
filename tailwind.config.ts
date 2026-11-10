import type { Config } from "tailwindcss";

// In Prompt 1, Tailwind is in legacy compatibility mode.
// Preflight is disabled so that design-system layered CSS rules in globals.css govern base styles.
// Legacy color aliases resolve to CSS variables in tokens.css.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        bg: v("bg"),
        surface: v("surface"),
        raised: v("raised"),
        line: v("line"),
        ink: v("ink"),
        muted: v("muted"),
        tide: v("tide"),
        ok: v("ok"),
        warn: v("warn"),
        crit: v("crit"),
        emerg: v("emerg"),
        info: v("info"),
      },
      fontFamily: {
        sans: ["var(--f-ui)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--f-display)", "Georgia", "serif"],
        mono: ["var(--f-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        DEFAULT: "8px",
        lg: "14px",
      },
    },
  },
  plugins: [],
} satisfies Config;

import type { Config } from "tailwindcss";

// Every colour is a CSS variable (src/styles/tokens.css) so dark/light is a single attribute switch.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        bg: v("bg"), surface: v("surface"), raised: v("raised"), line: v("line"),
        ink: v("ink"), muted: v("muted"),
        tide: v("tide"), ok: v("ok"), warn: v("warn"), crit: v("crit"), emerg: v("emerg"), info: v("info"),
      },
      fontFamily: { sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"] },
      borderRadius: { sm: "4px", DEFAULT: "8px", lg: "14px" },
    },
  },
  plugins: [],
} satisfies Config;

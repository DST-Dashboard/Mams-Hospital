# OHTMS-DS Design System

Authoritative visual and interactive specification for the **MAMS Hospital Overhead Tank Management System (OHTMS)**, implementing the master visual contract in `docs/DESIGN-SPEC.md` together with the overrides defined in §3.

## 1. Principles & Overrides
- **Override O1 (Light Default):** `:root` carries the light tokens as default; dark theme is activated under `:root[data-theme="dark"]`. The pre-paint bootstrap script sets `data-theme="light"` unless overridden by user selection in `localStorage`. Both themes maintain WCAG AA contrast.
- **Override O2 (Day + Week Co-existence):** Both 24 h rolling day (`[asOf - 24h, asOf]`) at raw cadence and rolling 7-day week (`[asOf - 7d, asOf]`) at 1h cadence are visible across views. State synchronizes via URL parameters (`tank`, `day`, `from`, `to`).
- **Data Honesty:** Missing data is rendered as `—` or chart gaps, never `0`. Unconfirmed tank dimensions trigger M1 `DimensionsModal` for admins and pause level alerts. Simulated tanks carry `SIM` chips. Demo mode displays `Snapshot · last reading 30 Oct 11:13 IST`.
- **Tokens Only:** All styling resolves to CSS custom properties defined in `src/styles/tokens.css`. Zero hardcoded hex values in component stylesheets.

## 2. Typography & Iconography
- **Families:** Display = `Merriweather` (H1–H3, eyebrows). UI = `Inter` (all body, controls, tables, badges). Mono = `Menlo` (code and JSON).
- **Icons:** `lucide-react` mapped via `ICON` in `src/components/ui/icons.ts`.
- **Numbers:** Tabular figures (`.num`, `font-variant-numeric: tabular-nums`) across all tables, KPI cards, and tank metrics.

## 3. Chrome & Layout Architecture
- **Utility Strip:** Height ~30px, background `--bg-strip`, freshness pill, gateway status, accessibility text-size controls, UTC/IST toggle, theme toggle, Demo/Live mode indicator.
- **Glass Header:** Height ~105px, sticky `top: 0`, backdrop blur 20px, hospital mark + 3-line title on left, OHTMS mark on right.
- **Mega Nav:** Height ~53px, background `--g-ocean`, home icon, active dashboard indicator with live pulsing dot, administration dropdown (admin only), about link, alert bell panel, user profile menu.
- **Combined Chrome:** Measured via `ResizeObserver` as `--chrome-h` (~158px).
- **Global Alert Banner:** Sticky at `top: var(--chrome-h)`, ordering: Emergency -> Critical -> Warning -> Info, with "+N more" expansion and "Dimensions not confirmed: alerts paused" banner when unconfirmed.
- **Hero:** Rendered on Overview with floating glass stat card, particle effects, and 60px wave divider.
- **App Shell:** Floats `-20px` over the wave on Overview, 6 numbered pill tabs (01. Overview, 02. Tank detail, 03. Analytics, 04. Alerts, 05. Settings, 06. Administration), role-gated by `useMe()`.
- **Footer:** Hospital mark (grayscale to color hover), system version, active timezone note.

# OHTMS Design System — Master Frontend Prompt

*MAMS Hospital · Overhead Tank Management System (OHTMS) v1.0 · derived from the OceanEmbed Design System (OEDS) and the OHTMS Project Definition Document · prepared 31 Oct 2026*

## 0. How to use this document (for you, not part of the prompt)

- Copy everything between **BEGIN PROMPT** and **END PROMPT** into any AI builder (Claude, ChatGPT, Cursor, Bolt, v0, Lovable, Gemini). The Project Brief (§2) is already filled in from your project document. Nothing needs editing.
- To restyle, change only the knobs in §23. Every value lives in the token block in §4.
- Legend: **[E]** design value kept exactly from OEDS · **[P]** derived from your project document (Part number in brackets) · **[D]** derived by me to fill a gap, using the same tokens · **[X]** an OEDS element deliberately removed because OHTMS has no such feature · **[F]** a flaw in the original that must not be copied.
- For a very long agent session, send §1–§4 and §22 first, then the rest, and ask the agent to confirm it holds the token block before building.

**What changed from OEDS (translation table)**

| OEDS element | OHTMS treatment |
|---|---|
| Plotly.js | **Apache ECharts** (your stack, Part 8). Same theme rules, re-expressed for ECharts (§13) |
| Ocean map, depth profile, cross-section, route | Animated **Tank SVG**, level-over-time chart, week heatmap, event timeline |
| Location bar, click-to-pick, recent searches, presets | [X] No geography. Replaced by tank selector, time-range and day selectors |
| Search pill, command palette | [X] Not in your feature list |
| Event / team banner | [X] No hackathon |
| News ticker | **Live alert banner** (F-08, A-10). Same row geometry, no marquee for safety information |
| Institution strip | **Utility strip**: data freshness, gateway status, text size, UTC/IST, theme, Demo/Live |
| Bilingual brand lines, language switch | [X] English only now; i18n is Phase 3 (U-10) |
| Contact page, team cards | [X] Not in your project |
| Validation dashboard (A5) | Overview KPI row + Analytics |
| Provenance view (A6) | About › Methodology and each tank's raw-data inspector |
| Palette | Preset **A Ocean**: blue brand, orange action, teal data (teal = water). **Dark theme is the default** (Part 10.7) |

**Contradictions in the project document, and how this prompt resolves them**

1. Parts 9.1/9.2 describe fill and consumption with ambiguous Δ signs. This prompt always reasons in **level**: level falling = consumption/drain, level rising = inflow/fill.
2. The Part 10.3 wireframe shows Tank 1 at 67 %, but the Part 2.2 worked example gives 202 cm → 32.7 %. The seed data uses the worked example, so Tank 1 shows a *Low level* warning in the demo.
3. Part 6.4 offers "retroactive or future only" when H or R changes, while Part 7.2 derives values at display time. The UI offers the choice as written and states that history is recomputed on read.
4. The wireframe shows Tank 4 at 95 %, but Part 5.2 defines overflow risk at `distance < dead_zone + 10 cm`. The seed uses 86 % so the demo is rule-consistent.
5. Part 10.6 breakpoints (1280 / 768) differ from OEDS (1650 / 1250 / 800). The tank grid follows the project's; everything else follows OEDS.
6. Data freshness thresholds and the "health score" (Part 9.4) are not defined. Freshness is derived from the cadence (§8.1); no health score is invented, so a node-status chip is shown instead.

## BEGIN PROMPT

## 1. Role, mission and hard rules

You are a principal product designer and senior front-end engineer working at international hackathon-winning standard. Build the complete front end for the **MAMS Hospital Overhead Tank Management System (OHTMS)** described in §2. Reproduce the visual language in §3–§21 exactly: it is a proven design system, so its look is the contract, not a suggestion. This system is called **OHTMS-DS**.

**Hard rules**

- **Fidelity first.** Use the exact tokens, sizes, radii, shadows, gaps and placements given. Never swap in framework defaults. Where this spec is silent, derive the value from the nearest token in the same family and stay consistent.
- **Tokens only.** Every colour, size, radius, shadow and duration comes from the CSS custom properties in §4. No stray hex values in component CSS, no inline styles, no `!important` (except `[hidden]`). Use one stylesheet in cascade layers: tokens → base → layout → components → views → utilities.
- **No extra features.** Build only what §2 CORE_FEATURES and the §7.4 coverage map list. The only additions allowed are the UI primitives of §20 (modal, toast, skeleton…) that carry those features. Do not invent pages, metrics, scores or integrations.
- **Complete, working output.** Write every file in full. No "rest of code here", no lorem ipsum, no broken image links. Logos are inline SVG (§6). Use realistic hospital-water copy and the seeded data in §2.
- **Premium finish is mandatory:** glass header, gradient nav, cinematic hero on the Overview, floating app shell, large soft shadows, 16px card radius, one hot accent for actions, animated tank SVGs, plain-language guidance beside every chart, charts themed to match.
- **Domain honesty is a design rule** (§13.11, §21): the sensor measures *distance*; level, volume and percent are derived. Missing data is never zero. Simulated data is always badged. Colour is never the only carrier of meaning.
- **Accessibility, responsiveness and reduced-motion are part of the design** (§17, §18), not extras.
- **Do not ask questions unless truly blocked.** State assumptions in at most 10 lines, then build.
- The numbers below are final computed values. Copy the result, not any fragile override structure.

## 2. PROJECT BRIEF

**PROJECT_NAME:** MAMS Hospital OHTMS — Overhead Tank Management System

**ONE_LINE_PITCH:** A web dashboard that watches the hospital's rooftop water tanks in real time, turns a sensor's distance reading into level, litres and alerts, and warns staff before any tank runs dry.

**PROBLEM_STATEMENT:** A hospital uses water constantly (surgery, cleaning, patient care, kitchens). It is stored in overhead tanks on the roof. Today someone climbs up and looks inside: slow, dangerous, error-prone and with no history. A tank that runs dry at 3 AM is found only when a tap fails. An ultrasonic sensor on each tank lid measures the distance to the water surface. A battery-powered LoRa node sends it about every 5 minutes. The dashboard is the product; the sensor is only the eyes.

**TARGET_USERS (design every screen for these five):**
1. **Priya, Facility Manager** (dashboard 3–5×/day, desktop and phone): "Within 5 seconds, does any tank need attention?" Needs a glanceable 5-tank overview, unmissable alerts, one-click acknowledge, trends.
2. **Rajesh, Hospital Administrator** (weekly, exports monthly): needs a clean record proving "this tank was above 50 % at this date and time", fill/drain history and an alert audit.
3. **Suresh, Maintenance Engineer** (mobile, when alerted): wants actionable alerts only, with sensor-health status so he does not climb the ladder for a faulty sensor; maintenance mode to suppress alerts during work.
4. **Dr. Sharma, Hospital Director** (monthly): wants a green "all fine" state, or one clear graph showing why not.
5. **System Administrator** (configure, deploy, troubleshoot): add/edit/delete tanks, set thresholds and dimensions, view raw uplinks, integrate hardware.

**PARENT_ORG / SPONSOR:** MAMS Hospital (no government strip, no ministry text).

**EVENT / HACKATHON:** none.

**CORE_FEATURES (what the user does, what data is shown):**
1. **Tank overview** — see 5 animated tanks at once: percent full, volume, distance, status, freshness, LIVE/SIMULATED badge.
2. **Week heatmap + trend chart** — 7 days × 24 hours fill heatmap; zoomable multi-tank level chart; day selector, range presets (1h / 6h / 24h / Week / Custom), brush-drag zoom; all synchronised and bookmarkable.
3. **Tank deep dive** — one tank: large tank, current reading, status (pump inferred, battery, signal quality), level chart with thresholds and events, descriptive stats, event timeline, alert history, raw readings.
4. **Fleet health** — node health grid, signal quality (RSSI, SNR, gateway), data freshness, data completeness.
5. **Alerting** — four levels (Info, Warning, Critical, Emergency), thirteen alert types, global banner, bell with badge, alert log with filters, alert detail, acknowledge, resolve/dismiss, maintenance mode, deduplication.
6. **Analytics** — mean/min/max/σ, fill and drain events, total consumption and inflow per window, per-tank comparison.
7. **Configuration** — first-load dimension modal (H, R per tank), tank settings, per-tank thresholds.
8. **Node management** — add (5-step), edit, soft-delete with 90-day restore, status management.
9. **Users and security** — login, roles (Viewer / Operator / Admin), user admin, audit log.
10. **Demo ↔ Live** — one toggle; simulated data is always badged; methodology page explains the simulation.
11. **Experience** — dark/light, UTC↔IST, responsive, loading/empty/error states, relative timestamps, URL-bookmarkable state, accessibility.
12. **Reserved slots** — outbound channels, escalation, quiet hours, reports, forecasts: rendered per the phase rules in §7.4.

**DATA SOURCE:** invent realistic mock data behind a typed adapter that matches the REST contract below. `DATA_SOURCE=mock|api` switches adapters with no other code change.

*Derived values (never stored, always computed at display time, Part 7.2):* `level = H − distance` · cylinder `volume = π R² × level` · rectangle `volume = L × W × level` · `fill% = level ÷ H × 100` · `capacity = π R² H`. **Unit test:** H=300, R=100, distance=202 → level 98 cm, volume 3,079 L, fill 32.7 %.

*Canonical types* (shared `@ohtms/types`):

```ts
type AlertLevel = 'info'|'warning'|'critical'|'emergency';
type AlertState = 'active'|'acknowledged'|'snoozed'|'resolved'|'suppressed'|'escalated';
type NodeStatus = 'active'|'maintenance'|'offline'|'decommissioned'|'draft';
type Tank = { id:string; label:string; location:{building:string; floor:string}; zone?:string;
  status:NodeStatus; shape:'cylinder'|'rectangle'; heightCm:number|null; radiusCm?:number;
  lengthCm?:number; widthCm?:number; deadZoneCm:number; mountedOn?:string;
  thresholds:{warnPct:number; critPct:number; emergPct:number; overflowMarginCm:number;
    persistence:number; cooldownMin:number; quietHours?:{from:string; to:string}};
  maintenanceMode:boolean; device:{devEui:string; joinEui:string; applicationId:string; name:string};
  simulated:boolean; colorIndex:1|2|3|4|5|6|7|8; deletedAt?:string };
type Reading = { ts:string /*ISO UTC*/; deviceId:string; distanceCm:number|null; rssi:number;
  snr:number; fCnt:number; batteryPct:number|null;
  qualityFlag:'ok'|'out_of_range'|'spike'|'missing'; simulated:boolean;
  source:'ttn'|'physics-simulation' };
type Alert = { id:string; tankId:string; type:AlertType; level:AlertLevel; state:AlertState;
  firedAt:string; acknowledgedAt?:string; acknowledgedBy?:string; actionNote?:string;
  resolvedAt?:string; triggerReading:Reading; message:string; repeatsSuppressed:number };
```

*Endpoints:* `GET /api/tanks` · `GET /api/tanks/:id` · `GET /api/readings?tankId&from&to&resolution=raw|1h|1d` · `GET /api/alerts?state&level&tankId&type&from&to&page` · `PATCH /api/alerts/:id` (acknowledge, resolve, snooze) · `POST|PATCH|DELETE /api/tanks` (soft delete) · `POST /api/tanks/:id/restore` · `GET|POST|PATCH|DELETE /api/users` · `GET /api/audit` · `GET /health`. Resolution rule (Part 7.3): ≤ 36 h → raw; 36 h–30 d → 1-hour averages; > 30 d → 1-day. Poll tanks and alerts every 15 s with SWR.

*Seed (rolling 7 days ending now; ~2,064 readings per tank per week at a ~293 s cadence with jitter; f_cnt increments; occasional gap):*

| Tank | Label | Location | Shape H × R (cm) | Dead zone | Seed state |
|---|---|---|---|---|---|
| 1 | Tank 1 — Main Building | Main Building, Roof | Cylinder 300 × 100 | 25 | distance 202 → 32.7 %, **Low level (Warning)**; LIVE fingerprint (`wio-e5-node-01`) |
| 2 | Tank 2 — ICU Block | ICU Block, Roof | Cylinder 250 × 90 | 25 | 18 %, **Critical low**; simulated |
| 3 | Tank 3 — OPD West | OPD West, Roof | Cylinder 280 × 110 | 25 | 81 %, normal; simulated |
| 4 | Tank 4 — Kitchen & Laundry | Service Block, Roof | Rectangle 200 × (180 × 120) | 25 | 86 %, normal, near full (dead-zone band visible); simulated |
| 5 | Tank 5 — Emergency Block | Emergency Block, Roof | Cylinder 260 × 95 | 25 | **Sensor fault** (distance out of range); simulated |

Seed weekly rhythm: morning and evening consumption peaks, a pump fill event after each trough, slightly lower weekends, at least one NO_DATA gap and one rapid-drain episode somewhere in the week. Sample device IDs are plainly fake 16-hex values.

**KNOWN PAGES / VIEWS:** `/login` · `/dashboard` (Overview) · `/tanks/[id]` · `/analytics` · `/alerts` · `/alerts/[id]` · `/settings` · `/admin/nodes` · `/admin/users` · `/admin/audit` · `/about`.

**TECH STACK:** Next.js (App Router) + React + TypeScript · Apache ECharts for every chart · custom SVG for the tank · Zustand (client state) + SWR (server cache) · REST (Fastify backend) · monorepo packages `@ohtms/types`, `@ohtms/ui` (TankSVG, StatCard…), `@ohtms/analytics`, `@ohtms/simulator`. **Self-host fonts and icons** (`next/font`, `@fortawesome/fontawesome-free`); no third-party CDNs, no tracking scripts (Part 11.6).

**LANGUAGES:** English only. Keep all copy in a single `copy.ts` so i18n can be added later.

**PALETTE PRESET:** A Ocean-original. DARK_MODE on and **default** on first visit.

**MODULE FLAGS:** INSTITUTION_STRIP = on (utility variant, §8.1) · HEADER_LOGO_PAIR = on (hospital mark + OHTMS mark) · SEARCH_PILL = off · EVENT_BANNER = off · TICKER = on as **ALERT_BANNER** (§8.4) · HERO = on, **Overview only** · HERO_GLASS_CARD = on · PARTICLES = on · WAVE_DIVIDER = on · WORKSPACE_TABS = on · GUIDANCE_LAYER = on · ABOUT_PAGE = on · CONTACT_PAGE = off · FOOTER = on · DARK_MODE = on · **SCOPE = PHASE_1** (§7.4).

**How to apply the brief (agent instructions)**

- Map every feature to a view in §14 and every data type to a visualisation in §13. If a feature has no archetype, compose one from §12 cards and §11 controls.
- Keep numbered plain-language tab labels, the eyebrow + H1 + intro header pattern, and the guidance layer (§15).
- Produce a one-page plan first (sitemap, module→page map, assumptions), then build.

## 3. Design DNA

- **Identity:** a trustworthy clinical-infrastructure control portal with modern glass-and-gradient polish. It must feel *authoritative* (serif headlines), *precise* (Inter UI, tabular numbers, units everywhere), *alive* (pulsing live dot, water that moves, a banner that never lets an alert hide) and *explainable* (plain-language help beside every chart).
- **Colour logic:** deep brand-blue→azure gradient = brand surface · white / ice-blue (dark navy in dark theme) = content surfaces · **one** hot accent (orange) = every primary action and emphasis · gold = highlight on dark · **teal = water and data**, the main chart colour · neon-green dot = live status. **Alert severity uses the status sets only (info / warn / err / emergency), never the orange accent.**
- **Shape logic:** large soft radii (16 cards, 12 panels, 8 controls, pills for status), 1px hairline borders, large blurred low-opacity shadows.
- **Depth logic:** three elevations only: flat (border), raised (soft shadow), floating (shell shadow or glass).
- **Layout logic:** 1600px max width · sticky glass header + nav + alert banner · hero with wave divider on the Overview · app shell floats 20px up over the hero · tab bar, then workspace · 30px gutters.
- **Motion logic:** slow, soft, ease-out-quart `cubic-bezier(.165,.84,.44,1)`; 0.3s for UI, 1s for reveals, 6s for floats and water; never bouncy.
- **Glance logic:** any critical issue is visible within 3 seconds without clicking (the alert banner is sticky; tank tiles come before everything else on the Overview).
- **Trust logic:** a data-mode badge, a SIMULATED chip on every synthetic value, units on every axis, definitions beside every number, relative time with absolute time on hover.
- **Density:** generous containers (30px card padding, 30px gutters, 40px workspace padding), compact tank tiles (20px), controls aligned on one baseline.

## 4. Design tokens (single source of truth)

Define exactly this block in `tokens.css`. Token names are semantic roles, so a palette swap only edits values.

```css
:root{
  /* BRAND (blue family) */
  --brand-950:#001f3f;  /* gradient start, hero overlay start */
  --brand-800:#003b6d;  /* PRIMARY BRAND: H1/H2, key numbers, hover text */
  --brand-700:#004d80;  /* gradient mid, hero overlay end */
  --brand-600:#1a5594;  /* ACTIVE TAB bg, guide accent, About titles */
  --brand-500:#0073bc;  /* bright blue: gradient end, input focus border, pill text */
  /* ACCENT (orange family): every primary action */
  --accent-500:#f26522; /* CTA bg, eyebrows, active-nav underline, banner label */
  --accent-600:#e05310; /* CTA hover */
  --accent-700:#d84b04; /* deep: highlight text on amber, CTA gradient end */
  --gold-500:#e2a84a;   /* highlight on dark surfaces */
  /* DATA (teal family) = water */
  --data-600:#087e83;   /* data accent, primary chart colour, water fill, teal button */
  --data-700:#06666a;   /* teal hover, water fill deep end */
  --live:#00ff88;       /* live/online dot */
  --focus:#df9c24;      /* keyboard focus ring */

  /* SURFACES */
  --bg-page:#f0f4f8; --bg-strip:#f8f9fa; --bg-work:#fbfdff; --bg-card:#ffffff;
  --bg-subtle:#f8fafc;  /* inputs, tank body, rail-bottom */
  --bg-panel:#dfe9f0;   /* control panels */
  --bg-tab:#f0f5fa; --bg-tab-hover:#e1ecf7;
  --bg-guide:#f1f6fc; --bg-help:#edf6f8; --bg-gloss:#eef5fa;
  --bg-plot:#eef2f3;    /* chart plotting area */
  --bg-th:#f6f9fa; --bg-pill:#e6f6ff; --bg-code:#1a202c; --bg-scroll:#f1f5f9;
  --bg-glass:rgba(255,255,255,.9);
  --glass-1:rgba(255,255,255,.05); --glass-2:rgba(255,255,255,.10); --glass-3:rgba(255,255,255,.15);
  --glass-line:rgba(255,255,255,.20); --glass-line-2:rgba(255,255,255,.30);

  /* TEXT */
  --tx-main:#2c3e50; --tx-head:var(--brand-800); --tx-label:#4a5568; --tx-body:#52677c;
  --tx-muted:#666666; --tx-quiet:#627985; --tx-soft:#718096; --tx-faint:#a0aec0;
  --tx-tab:#5a6b7c; --tx-input:#2d3748; --tx-note:#37556e;
  --tx-link:#285680; --tx-guide:#173d6c; --tx-sub:#1e466f; --tx-code:#a0aec0; --tx-chart:#294654;

  /* BORDERS */
  --bd:#e2e8f0; --bd-soft:#edf2f7; --bd-strong:#cbd5e0; --bd-panel:#b8d0e0;
  --bd-tab:#dbe6f0; --bd-tab-hover:#c9ddec; --bd-rail:#eaedf3; --bd-strip:#e0e6ed;
  --bd-guide:#d8e4f1; --bd-gloss:#c9dfed; --bd-table:#dae5e9; --bd-code:#2d3748;

  /* STATUS (bg / text / border) */
  --info-bg:#eff6ff; --info-tx:#1d4ed8; --info-bd:#bfdbfe;
  --ok-bg:#dcefe9;   --ok-tx:#286a57;   --ok-bd:#bddbd1;
  --warn-bg:#fff5dd; --warn-tx:#795314; --warn-bd:#e8d092;
  --err-bg:#fff1ef;  --err-tx:#933629;  --err-bd:#e7aaa3;

  /* GRADIENTS */
  --g-ocean:linear-gradient(135deg,#001f3f 0%,#004d80 50%,#0073bc 100%); /* = brand-950 → 700 → 500 */
  --g-hero:linear-gradient(to right,rgba(0,31,63,.95) 0%,rgba(0,77,128,.7) 100%);
  --g-cta:linear-gradient(135deg,#f26522,#d84b04);   /* = accent-500 → 700 */
  --g-banner:linear-gradient(135deg,#fff4e6 0%,#ffe5c4 100%);
  --g-bar:linear-gradient(to bottom,#003b6d,#f26522); /* 4px accent bar utility */

  /* SHADOWS */
  --sh-sm:0 4px 6px rgba(0,0,0,.05);
  --sh-header:0 4px 30px rgba(0,0,0,.08);
  --sh-shell:0 20px 40px rgba(0,30,80,.1);
  --sh-card-hover:0 20px 40px rgba(0,0,0,.06);
  --sh-panel:0 4px 15px rgba(8,126,131,.06);
  --sh-glass:0 25px 50px rgba(0,0,0,.3);
  --sh-cta:0 4px 15px rgba(242,101,34,.3);   --sh-cta-hover:0 8px 25px rgba(242,101,34,.4);
  --sh-data:0 4px 15px rgba(8,126,131,.3);   --sh-data-hover:0 8px 25px rgba(8,126,131,.4);
  --sh-tab:0 2px 5px rgba(0,0,0,.03);  --sh-tab-hover:0 4px 8px rgba(8,126,131,.08);  --sh-tab-active:0 4px 10px rgba(26,85,148,.3);
  --sh-tile-hover:0 10px 20px rgba(0,0,0,.03);
  --ring-field:0 0 0 3px rgba(0,115,188,.1);

  /* RADII */
  --r-xs:4px; --r-sm:6px; --r-md:8px; --r-lg:10px; --r-xl:12px; --r-2xl:16px; --r-pill:20px; --r-cta:25px; --r-full:50px;

  /* SPACE (px) */
  --sp-1:4px; --sp-2:8px; --sp-3:10px; --sp-4:12px; --sp-5:15px; --sp-6:20px; --sp-7:25px; --sp-8:30px; --sp-9:40px; --sp-10:50px; --sp-11:60px;

  /* LAYOUT */
  --max:1600px; --gutter:40px; --shell-pad:20px; --work-pad:40px; --card-pad:30px; --panel-pad:20px;

  /* TYPE */
  --f-ui:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif;
  --f-display:'Merriweather',Georgia,'Times New Roman',serif;
  --f-mono:'Menlo',ui-monospace,Consolas,monospace;

  /* MOTION */
  --ease:cubic-bezier(.165,.84,.44,1);
  --t-fast:.2s ease; --t-base:.3s ease; --t-card:.4s var(--ease); --t-reveal:1s var(--ease);

  /* Z-INDEX */
  --z-ticker-label:2; --z-hero-content:2; --z-wave:3; --z-shell:10; --z-tabs:20; --z-header:1000;
}
```

**Token addendum (append to `tokens.css`)**

```css
:root{
  --bg-explain:#f6f8fb; --bd-explain:#6795be;   /* chart explainer */
  --bg-bubble:#fff5f0;                           /* 60px icon bubble */
  --bd-adv:#e3eaf2; --bd-step:#dce6f0; --tx-step:#2e445a;  /* advanced block, guide step cards */
  --tx-strip:#555555;                            /* utility strip */

  /* OHTMS: severity. Info/Warning/Critical reuse the status sets; Emergency is solid. */
  --emg-bg:#933629; --emg-tx:#ffffff;
  --neutral-bg:#edf2f7; --neutral-tx:#4a5568; --neutral-bd:#cbd5e0;   /* SIM chip, decommissioned, draft, suppressed */

  /* OHTMS: tank drawing */
  --tank-body:var(--bg-subtle); --tank-edge:var(--bd-strong); --tank-dead:var(--bd-soft);
  --water-a:var(--data-600); --water-b:var(--data-700);

  /* OHTMS: stable series colours per tank (assigned by Tank.colorIndex, never by list order) */
  --series-1:var(--data-600); --series-2:#6a82a4; --series-3:#ad684c; --series-4:var(--brand-800);
  --series-5:var(--gold-500); --series-6:var(--accent-500); --series-7:#208c91; --series-8:#8a9ba3;

  /* OHTMS: layers */
  --z-banner:999; --z-dropdown:1050; --z-modal:1100; --z-toast:1200;
  --chrome-h:158px;   /* header + nav height; measure with ResizeObserver and write back */
}
```

**Dark theme (default).** Set `data-theme="dark"` on `<html>` before first paint (inline script reading localStorage, falling back to dark). Persist the choice in localStorage. Brand, accent and data colours stay.

```css
:root[data-theme="dark"]{
  color-scheme:dark;
  --bg-page:#0b1626; --bg-strip:#0e1c30; --bg-work:#0f1e33; --bg-card:#132540; --bg-subtle:#172b47;
  --bg-panel:#1a3050; --bg-tab:#172b47; --bg-tab-hover:#1f3a5e; --bg-guide:#14294a; --bg-help:#102a38;
  --bg-gloss:#12283f; --bg-plot:#0f1e33; --bg-th:#16294a; --bg-pill:#12304f; --bg-scroll:#0f1e33;
  --bg-glass:rgba(11,22,38,.88); --bg-explain:#12263f; --bg-bubble:#2a1d17;
  --tx-main:#e2e8f0; --tx-head:#ffffff; --tx-label:#b6c4d6; --tx-body:#a9bdd3; --tx-muted:#9fb2c8;
  --tx-quiet:#8aa0b8; --tx-soft:#8aa0b8; --tx-faint:#6f879f; --tx-tab:#b6c4d6; --tx-input:#e2e8f0;
  --tx-note:#a9c3d8; --tx-link:#8fc1ea; --tx-guide:#dbe9f7; --tx-sub:#cfe2f4; --tx-chart:#cdd9e8;
  --tx-strip:#b6c4d6; --tx-step:#cfe0f0;
  --bd:#243b5a; --bd-soft:#1d3250; --bd-strong:#35507a; --bd-panel:#2a4468; --bd-tab:#27415f;
  --bd-tab-hover:#35507a; --bd-rail:#1d3250; --bd-strip:#1d3250; --bd-guide:#27415f; --bd-gloss:#2a4468;
  --bd-table:#223a5a; --bd-adv:#243b5a; --bd-step:#27415f; --bd-explain:#4b7fae;
  --info-bg:#10264a; --info-tx:#93c5fd; --info-bd:#1e3a6e;
  --ok-bg:#0f2f27;   --ok-tx:#7fd3b4;   --ok-bd:#1f5a49;
  --warn-bg:#33270b; --warn-tx:#f2c566; --warn-bd:#6b5218;
  --err-bg:#3a1512;  --err-tx:#f3a59b;  --err-bd:#7a2c24;
  --neutral-bg:#1b2f4d; --neutral-tx:#b6c4d6; --neutral-bd:#35507a;
  --series-4:#5aa2dd;
  --sh-sm:0 4px 6px rgba(0,0,0,.4); --sh-header:0 4px 30px rgba(0,0,0,.4);
  --sh-shell:0 20px 40px rgba(0,0,0,.4); --sh-card-hover:0 20px 40px rgba(0,0,0,.4);
  --sh-panel:0 4px 15px rgba(0,0,0,.4); --sh-tile-hover:0 10px 20px rgba(0,0,0,.4);
}
```

Chart grid in dark: `#223a5a`; chart plot background `--bg-plot`. After building, verify WCAG AA for every text/background pair in both themes.

**Base rules (required)**

- `html{font-size:16px}` · `*{box-sizing:border-box}` · `body{margin:0;font:14px/1.5 var(--f-ui);color:var(--tx-main);background:var(--bg-page);overflow-x:hidden}` · `[hidden]{display:none!important}` (the only allowed `!important`).
- Scrollbars inside tables and code blocks: 8px, track `--bg-scroll` radius 4, thumb `--bd-strong` radius 4.
- Keyboard focus on every interactive element: `outline:3px solid var(--focus); outline-offset:3px`.
- Elevation ladder: **flat** = 1px `--bd` border · **raised** = `--sh-panel` or `--sh-sm` · **floating** = `--sh-shell`, `--sh-glass`, `--sh-header`.
- Radius ladder: 4 scrollbar/callout edge · 6 small buttons/help boxes · 8 buttons, inputs, tabs, step cards · 10 plots, code, glossary · 12 panels, KPI boxes, guide card, icon tiles, toasts · 16 cards, tank tiles and app shell · 20 pills and glass card · 25 CTA pill · 50 banner pill · 50% avatars and dots.
- Anything not expressible with these tokens needs a written reason. Only exceptions: chart colour scales (§13) and numeric chart styling that resolves from tokens at runtime.

## 5. Typography

**Families.** Display = Merriweather 400/700/900 (h1–h3, eyebrows only). UI = Inter 300–800 (everything else). Mono = Menlo stack (code and raw JSON only). Self-host with `next/font`, `display:swap`.

**Scale [E]** (rem = 16px)

| Role | Font | Size (rem · px) | Wt | Line-height | Tracking / case | Colour |
|---|---|---|---|---|---|---|
| Hero headline | Display | 3.5rem · 56 | 900 | 1.1 | 0 | #fff + text-shadow 0 10px 30px rgba(0,0,0,.5) |
| Hero sub-headline | Display | 1.5rem · 24 | 400 | 1.5 | 0 | `--gold-500` |
| Hero description | UI | 1.1rem · 17.6 | 400 | 1.6 | 0 | #fff at 90% |
| Hero badge | UI | .75rem · 12 | 700 | 1.5 | 1px · UPPERCASE | #fff |
| Page title H1 | Display | 2.5rem · 40 | 900 | 1.2 | −0.8px | `--tx-head` |
| Page intro | UI | 1.1rem · 17.6 | 400 | 1.5 | 0 | `--tx-muted`, max-width 600px |
| Eyebrow | Display | .8rem · 12.8 | 700 | 1.5 | 2px · UPPERCASE | `--accent-500` |
| Card title H2 | Display | 1.5rem · 24 | 600 | 1.3 | 0 | `--tx-head` |
| Chart-card title | Display | 1.2rem · 19.2 | 600 | 1.3 | 0 | `--tx-main`; 1px `--bd-soft` rule below (pb 10, mb 15) |
| Guide title H2 | Display | 21 | 600 | 1.3 | 0 | `--tx-guide` |
| Callout H3 | UI | 13 | 700 | 1.5 | 0 | `--tx-sub` |
| Brand line 1 (hospital) | Display | 1.1rem · 17.6 | 900 | 1.5 | 0 | `--tx-head` |
| Brand line 2 (system) | Display | 1.1rem · 17.6 | 700 | 1.5 | 0 | `--tx-head` |
| Brand subtitle | UI | .85rem · 13.6 | 400 | 1.5 | 0 | `--tx-muted` |
| Utility strip | UI | .75rem · 12 | 600 | 1.5 | 0 | `--tx-strip` |
| Nav link | UI | .95rem · 15.2 | 500 | 1.5 | 0 | #fff |
| Alert banner text | UI | .85rem · 13.6 | 600 | 1.5 | 0 | per severity |
| Body | UI | 14 | 400 | 1.5 | 0 | `--tx-main` |
| Control label | UI | 11 | 700 | 1.5 | 0 · sentence case | `--tx-label` |
| Input / select | UI | 14 | 500 | normal | 0 | `--tx-input` |
| Button | UI | 14 | 600 (CTA pill 700) | normal | 0 | #fff or variant |
| Pill / badge / severity chip | UI | .8rem · 12.8 | 700 | 1.5 | 0 (severity chip UPPERCASE .5px) | per variant |
| SIM chip | UI | 10 | 700 | 1.5 | .5px · UPPERCASE | `--neutral-tx` |
| Footnote | UI | .8rem · 12.8 | 400 | 1.5 | 0 | `--tx-soft` |
| Guide / explainer body | UI | 13 and 12 | 400 | 1.8 | 0 | `--tx-body` |
| Field help | UI | 12 | 400 | 1.7 | 0 | `--tx-note` |
| Context bar | UI | 10 | 400 | 1.7 | 0 | `--tx-quiet` |
| Table header | UI | 10 | 400 | 1.5 | 0 | `--tx-quiet` on `--bg-th` |
| Table cell | UI | 12 | 400 | 1.5 | tabular-nums | `--tx-main` |
| KPI value / tank tile percent | UI | 2rem · 32 | 900 | 1 | 0 | `--tx-head` (state colour on tiles, §12.2) |
| Tank hero readout [D] | UI | 2.5rem · 40 | 900 | 1 | 0 | `--tx-head` |
| Tank tile label | UI | 14 | 700 | 1.5 | 0 | `--tx-head` |
| KPI caption | UI | 11 | 400 | 1.5 | 0 | `--tx-quiet` |
| Code | Mono | .85rem · 13.6 | 400 | 1.5 | 0 | `--tx-code` |
| Chart text | UI | 11 (ticks 10, legend 10, title 12) | 400 | n/a | 0 | `--tx-chart` |

**Spacing of words and lines**

- Word spacing: never set. Letter-spacing only on uppercase micro-labels (0.5–2px) and the page H1 (−0.8px).
- Line gaps: single-line UI 1.5 · display headline 1.1 · H1 1.2 · explanatory prose 1.7–1.8 · KPI number 1.
- Paragraph rhythm: `p{margin-top:0}`. Eyebrow→heading 10px; heading→intro 10px; intro→controls 30px; paragraph→paragraph 12–20px.
- Line length: intro 600px; guidance paragraphs 100ch.
- **Numbers:** `font-variant-numeric:tabular-nums` in tables, KPIs and tiles; thousands separators; `—` for missing; units always shown. **Fixed decimals follow sensor honesty (replaces OEDS's 3 dp):** distance and level cm 0 dp · fill % 1 dp · volume L 0 dp (tiles ≥ 1,000 L show kL with 1 dp) · RSSI dBm 0 dp · SNR dB 1 dp · mean/σ 1 dp.
- Mobile steps (≤800px): H1 29px · intro 14px · card H2 20px · guide title 19px · hero 32/20/14px · brand title 16px.
- No other typefaces, no italics, no all-caps outside the roles above, no gradient text.

## 6. Iconography and logos

**Library [E]:** Font Awesome 6.4.2 Free, solid style (`fas`), self-hosted. If the stack forbids it, use Lucide with the nearest equivalents but keep every size and colour rule.

**Icon sizing and colour [E]**

- Inline with text: 1em, inherits colour; in buttons the icon sits left with an 8px gap.
- Tab-bar icon: 1.1rem centred in a 20px box, `--tx-faint` → `--brand-800` (dark: `--tx-head`) on hover → #fff when active; 12px gap to label.
- Hero stat icon: 1.5rem in a 30px box, `--gold-500`.
- KPI icon tile: 50×50, radius 12, background `--brand-800`, icon #fff at 1.2rem.
- Icon bubble (empty states, callouts): 60×60 circle, `--bg-bubble`, icon `--accent-500` at 1.5rem.
- Control-label icon: `--accent-500`, margin-left 5px. Footnote icon: gap 5px.

**Icon map** (role → Font Awesome class)

| Role | Icon |
|---|---|
| **Home** (icon-only, first item of the mega-nav) | `fa-house` |
| Dropdown caret | `fa-chevron-down` |
| Accessibility | `fa-wheelchair` (plus text links A-, A, A+) |
| Theme toggle | `fa-sun` / `fa-moon` |
| UTC/IST | `fa-clock` |
| Demo/Live | `fa-flask` (Demo) / `fa-tower-broadcast` (Live) |
| SIMULATED chip | `fa-flask` |
| Hero CTA arrow | `fa-arrow-down` |
| Hero stat rows | `fa-droplet`, `fa-tower-broadcast`, `fa-clock`, `fa-bolt` |
| Tab 01 Overview / 02 Tank detail / 03 Analytics / 04 Alerts / 05 Settings / 06 Administration | `fa-gauge-high` / `fa-droplet` / `fa-chart-area` / `fa-bell` / `fa-sliders` / `fa-user-shield` |
| Severity: Info / Warning / Critical / Emergency | `fa-circle-info` / `fa-triangle-exclamation` / `fa-circle-exclamation` / `fa-burst` |
| All clear | `fa-circle-check` |
| Notification bell | `fa-bell` |
| Tank metrics: distance / level / volume / battery / signal / pump | `fa-ruler-vertical` / `fa-water` / `fa-fill-drip` / `fa-battery-half` / `fa-signal` / `fa-gears` |
| Fill event / drain event | `fa-arrow-trend-up` / `fa-arrow-trend-down` |
| Consumption | `fa-faucet-drip` |
| Node status: active / maintenance / offline / decommissioned / draft | `fa-circle-check` / `fa-wrench` / `fa-plug-circle-xmark` / `fa-box-archive` / `fa-hourglass-half` |
| Gateway | `fa-tower-cell` |
| Table / filter / sort | `fa-table` / `fa-filter` / `fa-sort` |
| Add / edit / delete / restore | `fa-plus` / `fa-pen` / `fa-trash-can` / `fa-rotate-left` |
| Share link / CSV / download | `fa-link` / `fa-file-csv` / `fa-download` |
| Users / audit / sign out | `fa-users` / `fa-shield-halved` / `fa-right-from-bracket` |
| Locked (phase slot) | `fa-lock` |
| Methodology / glossary / system diagram | `fa-book-open` / `fa-book` / `fa-diagram-project` |
| Eyebrow icons | `fa-layer-group`, `fa-droplet`, `fa-chart-area`, `fa-bell`, `fa-sliders`, `fa-tower-broadcast`, `fa-users`, `fa-shield-halved` |
| Loading / apply | `fa-spinner` / `fa-sync-alt` |
| Info / tip | `fa-info-circle` / `fa-lightbulb` |

**Logos (inline SVG, replaceable files in `assets/`)**

- **Hospital mark** (header-left, 75px high): a 75×75 rounded square, radius 16, `--g-ocean` fill, a white medical cross centred, drop-shadow(0 4px 6px rgba(0,0,0,.1)), gentle 6s float. Links to `/dashboard`.
- **OHTMS mark** (header-right, 65px high, max-width 220): a tank glyph (cylinder outline in `--brand-800`, water fill `--data-600`, an orange sensor dot on the lid) beside the wordmark "OHTMS" in Display 900 `--brand-800`. Drop-shadow(0 2px 4px rgba(0,0,0,.08)); hover scale 1.05 with drop-shadow(0 4px 12px rgba(0,59,109,.2)), 0.4s. In dark theme the wordmark uses `--tx-head`.
- Tab-bar brand: OHTMS mark, max 180×55, left of the tab pills.
- Footer: hospital mark 40px high, `grayscale(100%) opacity(.5)` → full colour on hover, 0.3s.
- Favicon: the OHTMS tank glyph. Avatars (user menu): 32px circles with initials on `--glass-3`.

## 7. Page architecture and space budget

### 7.1 Vertical stack, desktop, in order

```
UTILITY STRIP ......... ~30px   bg --bg-strip, 1px bottom border, NOT sticky
GLASS HEADER .......... ~105px  sticky top:0, z 1000: hospital mark + 3-line title | OHTMS mark
MEGA NAV .............. ~53px   brand gradient: home, links | bell, user menu
   (header + nav stick together as one ~158px block = --chrome-h)
ALERT BANNER .......... ~44px   sticky top:var(--chrome-h), z 999; wraps to 2 rows if needed
   (sticky block total ≈ 202px; scroll-margin-top 215px)
HERO (Overview only) .. min 320px  background + overlay, text left / glass card right, 60px wave
APP SHELL (floats -20px over the wave on the Overview; margin-top 30px elsewhere)
   TAB BAR ............ ~80px   OHTMS mark + numbered pill tabs
   WORKSPACE .......... padding 40
      page header > mode line > banners > view guide > control panel
      > field help > context bar > VIEW CONTENT (cards) > glossary > footer
SECONDARY FULL-PAGE VIEWS (About, Login): max 1200, padding 60px 20px
```

**Overview priority override** [P: Part 3.1 "within 5 seconds"]: the tank tiles come right after the page header and banners, before the control panel. The view guide is a collapsed one-line bar on this view. See §14 V1.

### 7.2 Widths and gutters

- Page container 1600px max, centred. Strip, header and hero inner padding 0 40px. App-shell wrapper padding 0 20px. Workspace padding 40px (25px at ≤1250px, 16px at ≤800px). Card padding 30px (16px at ≤800px). Tank-tile padding 20px.
- **Plot width formula:** full-width card plot = min(viewport,1600) − 182px. Two-up plot ≈ (content − 30)/2 − 62. At a 1440px viewport: full plot ≈ 1258px, two-up ≈ 583px.
- **Gaps:** grids 30px · tank grid 20px · control panels 16px · inline control rows 10–15px · label→field 8px · card→card 30px.

### 7.3 Space budget per module (desktop ≥1250px, ±10%)

| Module | Width | Height |
|---|---|---|
| Utility strip | full | ~30 |
| Glass header | full | ~105 |
| Mega nav | full | ~53 |
| Alert banner | full | ~44 (70 when wrapped) |
| Hero | full | min 320 |
| Hero glass card | ~360–420 | ~250 |
| Tab bar | shell | ~80 |
| Page header | content | ~120–140 |
| View guide (collapsed bar / expanded) | content | ~44 / ~320 |
| Control panel | content | ~105 (one row) to ~190 (wrapped) |
| Tank tile (5-up at 1440: ~248 wide) | (content − 80)/5 | ~380 |
| KPI box (with definition line) | (content − 40)/3 | ~115 |
| Week heatmap card (plot 330) | content | ~460 |
| Trend / level chart card (plot 440) | content | ~600 |
| Dashboard chart card (plot 330) | (content − 30)/2 | ~550 |
| Node-health tile | (content − 80)/5 | ~120 |
| Table card | content | header 36 + rows ~40 each |
| Tank hero card (SVG ~420) | ~(content − 30)/2 | ~540 |
| Footer | content | ~100 (+50 top margin) |

### 7.4 Where every feature lives (full coverage map)

**Scope rule.** `SCOPE=PHASE_1` (default): every feature tagged P0 or Phase 1 is fully functional on mock data. A feature tagged Phase 2+ is **not built**, except these **reserved slots**, which the project document places inside Phase-1 screens and which render **disabled with a `PHASE 2` or `PHASE 3` chip and a lock icon**: alert channels and recipients (Add-node step 4, alert detail delivery card), escalation, quiet hours, snooze, per-user notification preferences, 2FA and "sign out everywhere", and the locked cards on Analytics. `SCOPE=FULL` builds every row functionally against mock adapters.

| ID | Feature | Where it lives | Scope |
|---|---|---|---|
| F-01 | 5-tank grid, animated SVG | V1 tank tiles (§12.2, §12.3) | P1 |
| F-02 | Status card per tank | Tile + V2 reading card | P1 |
| F-03 | Week heatmap 7×24 | V1 heatmap card | P1 |
| F-04 | Trend chart with zoom/brush | V1 trend card; V2 level chart | P1 |
| F-05 | Day selector Mon–Sun | Control panel (§11.1) | P1 |
| F-06 | Presets 1h/6h/24h/Week/Custom | Control panel | P1 |
| F-07 | Per-tank deep dive | V2 | P1 |
| F-08 | Global alert banner | §8.4 | P1 |
| F-09 | Node health grid | V1 node-health card | P1 |
| F-10 | Signal quality panel | V1 signal card | P1 |
| F-11 | Freshness pill | Strip, tile, health tile | P1 |
| F-12 | Data completeness meter | V1 signal card; V3 table | P1 |
| C-01 | First-load config modal | Modal M1 | P1 |
| C-02 | Tank settings (H, R, dead zone, label) | V6 card 2; Modal M3 | P1 |
| C-03 | Per-tank thresholds | V6 card 1 | P1 |
| C-04–C-07 | Add / edit / delete (soft) / status | V7; Modals M2–M5 | P1 |
| C-08 | Zone grouping | Node form "Group" field and grouped table rows | FULL |
| C-09–C-12 | Bulk ops, clone, import/export, threshold templates | V7 selection bar, row menu, header menu | FULL |
| A-01–A-06 | Four levels, low/critical/overflow/fault/no-data | §14 V4 registry; §12.6 chips | P1 |
| A-07–A-09 | Battery low, rapid drain, predict-and-warn | Registry rows | FULL |
| A-10, A-11 | Banner, bell with badge | §8.4, §20 | P1 |
| A-12–A-15 | Detail, log, acknowledge, resolve/dismiss | V5, V4 | P1 |
| A-16–A-22 | Email, SMS, WhatsApp, webhook, Slack/Teams, push, voice | Reserved channel slots (§14 V5, M2 step 4) | Gated chips |
| A-23, A-24 | Escalation, quiet hours | Reserved slots (V5 timeline, V6 card 1) | Gated chips |
| A-25 | Maintenance mode | V2 status card switch, V6 card 1, V7 status menu | P1 |
| A-26 | Deduplication | V5 "Repeats suppressed: n" | P1 |
| A-27, A-28 | Rate limit, per-user prefs | V6 card 4 | Gated chip |
| A-29, A-30, A-31 | Correlation, snooze, sound | V5 snooze slot; others | FULL |
| N-01–N-04 | Stats, fill/drain events, consumption | V2 stats + timeline; V3 | P1 |
| N-05 | Cross-tank comparison | V3 table | P1 (no health score) |
| N-06, N-07 | Reports, week-vs-last | V3 locked cards | Gated chips |
| N-08, N-10 | Anomaly, leak detection | V3 locked card | Gated chips |
| N-09, N-12, N-13 | Benchmarking, capacity, cost | V3 locked card | Gated chips |
| N-11 | Predictive exhaustion | Tile line "Empty in ~X h" | FULL |
| N-14 | Data playback | V1 scrubber under trend card | FULL |
| N-15 | Custom date-range analytics | Control panel Custom | P1 |
| U-01–U-08 | Responsive, theme, skeletons, empty, error, relative time, UTC/IST, a11y | Everywhere (§17–§20) | P1 |
| U-09, U-10 | Kiosk, multi-language | `?kiosk=1`; language switch in strip | FULL |
| U-11, U-12 | URL state, CSV export per chart | Share icon; chart-card download icon | U-11 P1, U-12 FULL |
| U-13, U-14 | System diagram, glossary | V10 About; glossary cards | P1 |
| U-15 | Demo/Live toggle | Utility strip, mode badge | P1 |
| S-01, S-02 | Login, roles | V11; role gating (§14) | P1 |
| S-03 | Audit log | V9 | FULL (P1 shows locked state) |
| S-04–S-06 | Sessions, API keys, password reset | V6 card 5; V9 System tab; login link | Gated chips |
| S-07–S-09 | SSO, compliance export, backup UI | — | FULL (Phase 3 chips) |
| S-10 | System health page | V9 "System" secondary tab | FULL |
| I-01–I-06 | Ingestion and external integrations | Backend only. UI shows only freshness, gateway status, mode badge | n/a |
| M-01–M-06 | Simulator, badge, methodology, regenerate | Seeded data; SIM chip; V10; V10 admin button (FULL) | P1 |

**Where the shared chrome lives**

| Item | Location |
|---|---|
| Home icon | first item of the mega-nav |
| Primary navigation | mega-nav, left-aligned, 30px gaps |
| Bell with badge, user menu | far right of the mega-nav |
| Text size, UTC/IST, theme, Demo/Live, skip link | right side of the utility strip |
| Freshness pill, gateway status | left side of the utility strip |
| Alerts, always visible | sticky alert banner |
| Workspace tabs | tab bar at the top of the app shell |
| Mode badge | top-right cluster of the page header |
| Shared controls | full-width panel under the view guide |
| Share-link button | right end of the control panel (icon-only) |
| Status line | right end of the context bar |
| Glossary | collapsible card above the footer |

## 8. Header system

### 8.1 Utility strip [E layout, P content] (flag INSTITUTION_STRIP)

- Background `--bg-strip`, border-bottom 1px `--bd-strip`, 12px/600 `--tx-strip`, padding 5px 0. Inner: max 1600, padding 0 40px, flex, space-between, centred; both clusters have 15px gaps.
- **Left:** **freshness pill** (dot + "Data fresh · last uplink 2 min ago") and **gateway status** ("SenseCap gateway online"). Freshness [D from Parts 5.2 and 9.3, cadence ≈ 293 s]: **green** age ≤ 10 min (2× cadence) · **amber** 10–15 min · **red** > 15 min (the NO_DATA threshold). Gateway offline turns the second item `--err-tx` with an icon and also raises GATEWAY_OFFLINE.
- **Right (utility links, padding 0 5px, hover `--brand-800`):** Skip to main content · accessibility icon · A- · A · A+ · **UTC | IST** segmented micro-toggle · **theme** icon button · **Demo | Live** segmented micro-toggle. The Demo/Live toggle's active segment uses `--accent-500` text.
- Working behaviour: the skip link focuses `<main>`; A-/A/A+ set root font-size to 15/16/18px; timezone and theme persist in localStorage; **default timezone IST**, URL state always in UTC ISO.
- Mobile: both clusters wrap into one slim bar; the freshness pill stays; text-size links collapse into the user menu.
- FULL: add a language switch (U-10) and a kiosk icon button (U-09).

### 8.2 Glass header [E]

- `position:sticky; top:0; z-index:var(--z-header); background:var(--bg-glass); backdrop-filter:blur(20px); box-shadow:var(--sh-header)`.
- Inner: max 1600 centred, padding 15px 40px, flex, space-between, centred.
- Left cluster (gap 20): hospital mark 75px + title block. Line 1 **MAMS Hospital** (Display 900, 17.6px, `--tx-head`, margin 0); line 2 **Overhead Tank Management System** (Display 700, 17.6px, margin-top 4px); line 3 "Real-time rooftop water monitoring" (UI 13.6px, `--tx-muted`, margin-top 4px).
- Right: OHTMS mark (§6).
- Mobile (≤800px): header becomes static (not sticky), padding 16px, wraps; logo 60px; title 16px. **The alert banner stays sticky at `top:0` on mobile.**
- The workspace uses `scroll-margin-top:215px` so sticky chrome never covers anchor targets (12px on mobile).

### 8.3 Mega nav [E]

- Background `--g-ocean`; padding 0 40px; flex, space-between, centred.
- Link list: no bullets, gap 30px. Order: **Home icon** · **Dashboard** (active on any workspace view; live dot) · **Administration ▾** (Admin role only; items Nodes, Users, Audit log) · **About**.
- Link: #fff, 15.2px/500, padding 15px 0, opacity .9, transition .3s. Hover and active: opacity 1 + `text-shadow:0 0 10px rgba(255,255,255,.5)`.
- Active marker: 4px bar in `--accent-500`, full link width, bottom 0, radius 2px 2px 0 0.
- **Live dot:** 6px circle, absolute top 5px right −12px, `box-shadow:0 0 8px currentColor` plus a 2s infinite expanding ring (§16) in the dot's own colour. Colour follows freshness: `--live` (fresh), `--gold-500` (amber), `--err-bd` (red, ring stops). Hidden while in Demo mode.
- Dropdown caret `fa-chevron-down` (.7em, margin-left 6px). Dropdown panel per §20.
- **Right end (replaces the search pill):** a **bell button** (icon-only glass button 36×36, radius 20, `--glass-3` background, `--glass-line` border) with a count badge (§20) and a **user menu** (32px initials avatar + role chip, dropdown: name, role, "Sign out" with `fa-right-from-bracket`).
- Mobile: list scrolls horizontally (`overflow-x:auto; flex-wrap:nowrap`), links 12px, nowrap; nav padding 12px. The bell moves into the alert banner row.

### 8.4 Alert banner [E geometry, P content] (replaces the ticker)

- Row: flex, `position:sticky; top:var(--chrome-h); z-index:var(--z-banner)`, border-bottom 1px, 13.6px/600, min-height 44.
- **Label:** background `--accent-500`, #fff bold, padding 8px 20px, nowrap, z 2, text "Live alerts · N".
- **Track:** flex, wrap, gap 10px, padding 6px 20px, centred. One **chip per active alert**, ordered Emergency → Critical → Warning → Info, then newest: severity icon + "Tank 2 — Critical low · 18 %". Each chip links to `/alerts/[id]`, uses its severity set (§12.6), radius 20, padding 4px 12px. More than 5 alerts: show 4 and a "+N more" chip that opens the bell panel. **No marquee, ever, for safety information.**
- **Right end:** "View all alerts" link (`--brand-500`, 700) and, on desktop, nothing else. Acknowledging happens on the alert detail, the log row, and inside the bell panel (one click).
- **Row background = highest active severity set** (`--info-*`, `--warn-*`, `--err-*`); **Emergency** = solid `--emg-bg`, text `--emg-tx`, chips outlined white, severity icon with the `pulseGlow` ring.
- **No active alerts:** `--ok-bg`, `--ok-tx`, `fa-circle-check`, "All 5 tanks within thresholds. No active alerts." (Dr. Sharma's green check mark.)
- Tanks in maintenance mode show one neutral chip: "Tank 3 in maintenance — alerts suppressed". Suppressed alerts are not counted.
- Gateway offline: a Critical chip "SenseCap gateway offline — all nodes affected".
- `role="status"` and `aria-live="polite"`; Emergency uses `aria-live="assertive"`.

## 9. Hero (Overview `/dashboard` only)

### 9.1 Layer structure [E]

```
section.hero   relative, min-height 320 [D: reduced from 400 to protect the 5-second rule], flex-centre, overflow hidden
  layer 1  background (CSS fallback in §9.6, or optional /assets/hero.webp)
  layer 2  overlay --g-hero
  layer 3  particles (flag PARTICLES)
  layer 4  content wrapper: z 2, max 1600, padding 0 40, flex, space-between, centre
             left   text block (max-width 700)
             right  glass card (perspective 1000)
  layer 5  wave divider: absolute, bottom -2px, z 3
```

### 9.2 Text block [E]

- Badge: inline-block; `--glass-2`; border 1px `--glass-line-2`; padding 5px 12px; radius 20; blur 5px; 12px/700, tracking 1px; margin-bottom 15. Text: **LIVE WATER MONITORING** (in Demo mode: DEMONSTRATION MODE).
- Headline (the page's single H1): **MAMS Hospital OHTMS**, 56px/900 Display, lh 1.1, margin 0 0 10px, #fff, text-shadow 0 10px 30px rgba(0,0,0,.5).
- Sub-headline: **Know every tank's level before a tap runs dry.** 24px/400 Display, `--gold-500`, margin 0 0 20px.
- Description: "Ultrasonic sensors on each rooftop tank report over LoRaWAN about every 5 minutes. OHTMS turns each distance into level, litres and alerts within 1–2 seconds." 17.6px, lh 1.6, opacity .9, margin-bottom 30px.
- Actions (flex, gap 15): primary accent button **View tanks** with `fa-arrow-down` (scrolls to the workspace) · glass button **How it works** (links to `/about#how-it-works`).

### 9.3 Glass card [E]

- Background `--glass-1`; blur 15px; border 1px `--glass-line`; radius 20; padding 30; shadow `--sh-glass`; `transform-style:preserve-3d`; animation `float` 6s ease-in-out infinite.
- Four stat rows (flex, centred, gap 15, margin-bottom 20, last 0), #fff, 17.6px/500, `translateZ(30px)`; icon `--gold-500`, 1.5rem, width 30 centred:
  1. `fa-droplet` **5 rooftop tanks monitored**
  2. `fa-tower-broadcast` **1 live node · 4 simulated** (computed from data; becomes "5 live nodes" in production)
  3. `fa-clock` **~5 min between readings**
  4. `fa-bolt` **1–2 s from sensor to screen**
- Pointer-driven tilt: perspective 1000px, max ±6° rotateX/rotateY, .2s smoothing; off for touch and reduced motion.

### 9.4 Particles

Create 30 elements: absolute white circles 2–8px, opacity .1–.6, random left 0–100%, rising from 110% to −10% over 5–10s with random 0–5s delay, linear, infinite, `pointer-events:none`. Disabled under reduced motion.

### 9.5 Wave divider [E]

Absolute, bottom −2px, full width, z 3, line-height 0, overflow hidden. SVG `viewBox='0 0 1200 120' preserveAspectRatio='none'`, `display:block; width:calc(100% + 1.3px); height:60px`; path fill = `--bg-page`:

`M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.11,130.83,121.22,200.7,112.5,242.49,107.28,283.47,81.18,321.39,56.44Z`

### 9.6 Hero background and mobile

- Default: no stock photo. Build a CSS fallback: layered radial gradients of `--brand-700` and `--brand-500` over `--brand-950`, plus faint concentric ripple rings (SVG, 6% white strokes) off-centre right, plus particles. No 3D blobs. If a rooftop-tank photo is supplied later, use `background:center/cover` (≥1920×800, WebP, under 300KB).
- Mobile (≤800px): column layout, padding 25px, glass card hidden, headline 32px, sub 20px, description 14px, actions wrap.

## 10. App shell, tab bar, page header

### 10.1 Shell [E]

- Wrapper: max 1600, margin `-20px auto 40px` on the Overview (hero present) and `30px auto 40px` on every other view, relative, z 10, padding 0 20px.
- Shell: flex **column**, background `--bg-card`, radius 16, shadow `--sh-shell`, overflow hidden, min-height 850px. Do not animate the shell.

### 10.2 Tab bar [E] (flag WORKSPACE_TABS)

- Container: width 100%, background `--bg-card`, padding 12px 25px, border-bottom 1px `--bd-rail`, flex row, wrap, centred, gap 20px, z 20. Left: OHTMS mark (max 180×55).
- Tabs: flex row, wrap, gap 8px. **Six numbered pills**, each a link or button with icon + label:
  **01. Overview** · **02. Tank detail** · **03. Analytics** · **04. Alerts** (with a count badge when alerts are active) · **05. Settings** · **06. Administration**.
- **Role gating:** Viewer sees 01–04. Operator adds 05. Admin adds 06. Hide what the role cannot open; never show a disabled tab.
- Pill: padding 10px 14px; radius 8; background `--bg-tab`; border 1px `--bd-tab`; shadow `--sh-tab`; text 15.2px/600 `--tx-tab`; icon→label gap 12px; transition all .2s ease.
- Hover: background `--bg-tab-hover`; border `--bd-tab-hover`; shadow `--sh-tab-hover`; translateY(−2px); text and icon `--tx-head`.
- Active: background `--brand-600`; border same; text and icon #fff; shadow `--sh-tab-active`; no lift; `aria-current='page'`.
- Switching a tab: update eyebrow/H1/intro, navigate to the route, smooth-scroll the workspace into view, keep state in the URL. Tab 02 opens the last-viewed tank (default Tank 1).
- Mobile (≤800px): brand logo hidden; pills wrap onto several rows; font 12px.

### 10.3 Workspace [E]

`flex-grow:1; padding:40px; background:var(--bg-work); min-width:0; scroll-behavior:smooth`.

### 10.4 Page header [E]

- Row: flex, space-between, align flex-end, wrap, margin-bottom 30px.
- Left: eyebrow (icon + UPPERCASE text) → H1 (changes per view; **on the Overview the hero headline is the H1 and this title is an H2 with the same class**) → intro (max 600px).
- Right action cluster (flex, gap 15, wrap, centred): **(1) Mode badge:** UPPERCASE text, pill, `--info-bg` / `--info-tx` / 1px `--info-bd`, shadow 0 2px 10px rgba(29,78,216,.15), padding 6px 14px, 12.8px/700, tracking .5px. Text: `DEMO DATA` · `MIXED · 1 LIVE + 4 SIMULATED` · `LIVE · 5 NODES`. **(2) Primary action** as a CTA pill (§11.2) only where the table below defines one. [X] The OEDS "Recent" select is removed.
- Under the header: a one-line mode explanation (11px/1.7, `--tx-quiet`).

| View | Eyebrow | H1 | Intro | CTA pill |
|---|---|---|---|---|
| V1 Overview | `fa-layer-group` FLEET OVERVIEW | (H2) Which tank needs attention first? | Level, volume and alert state for every rooftop tank, refreshed with each sensor reading (about every 5 minutes). | none |
| V2 Tank detail | `fa-droplet` TANK DEEP DIVE | How is {tank label} doing? | Current reading, status, history, events and raw readings for one tank. | none (FULL: CSV icon on chart) |
| V3 Analytics | `fa-chart-area` ANALYTICS | How much water are we using? | Consumption, fill cycles and stability across all tanks for the selected window. | none (FULL: Download report) |
| V4 Alerts | `fa-bell` ALERT LOG | What needs attention? | Every alert with when it fired, who responded and what they did. | none |
| V5 Alert detail | `fa-bell` ALERT DETAIL | {alert message} | Evidence, sensor health and response for this alert. | none (actions live in the Response card) |
| V6 Settings | `fa-sliders` SETTINGS | How should tanks and alerts be configured? | Thresholds, tank dimensions and display preferences. | none |
| V7 Nodes | `fa-tower-broadcast` ADMINISTRATION · NODES | Which nodes are installed? | Add, edit, pause or retire the sensor nodes on each tank. | **Add node** (`fa-plus`) |
| V8 Users | `fa-users` ADMINISTRATION · USERS | Who can see and change what? | Manage people and their roles. | **Add user** |
| V9 Audit log | `fa-shield-halved` ADMINISTRATION · AUDIT LOG | Who changed what, and when? | A permanent record of every configuration change, acknowledgement and login. | none |

### 10.5 Banners [E]

`.warning` / `.error` / `.info`: padding 13px 16px; radius 8; 12px; margin 14px 0; warning uses `--warn-*`, error uses `--err-*` with `role='alert'`, info uses `--info-*`; toggled with `hidden`. Standard banners:
- **Simulated data (warning):** "**SIMULATED DATA** — Tanks 2–5 are physics-based simulations built from Tank 1's real signal fingerprint. They are marked SIM everywhere." Shown whenever any visible tank is simulated. Links to `/about#methodology`.
- **Stale data (warning):** "**STALE DATA** — No uplink from {tank} for {n} min. Values shown are the last known readings."
- **Load failure (error):** "**Could not load readings.** Check your connection and retry." with a Retry outline button.

### 10.6 Footer [E]

Margin-top 50, padding 30px 0, border-top 1px `--bd`; flex, space-between, centred. Left (gap 15): hospital mark 40px (grey→colour) + text (**OHTMS** bold `--tx-head`; below it the data-mode label .8rem/bold/UPPERCASE `--tx-faint`). Right: 14.4px/500 `--tx-faint` "Built for MAMS Hospital · OHTMS v1.0 · Times shown in IST". Mobile: wraps, gap 12.

## 11. Controls, forms and buttons

### 11.1 Control panel [E]

- `background:var(--bg-panel); border:1px solid var(--bd-panel); border-radius:12px; box-shadow:var(--sh-panel); padding:20px; display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end; margin-bottom:30px`.
- Field order: primary selectors → collapsible **Advanced** (only where a view defines one) → action group (primary + icon-only share).
- Control group: flex column, gap 8px, min-width 0. Label above (11px/700 `--tx-label`, optional orange icon). Selects min-width 145px and max-width 100%; number inputs 90px; datetime inputs auto.
- Action group: flex, gap 8px, no wrap. **Share link** (icon-only `fa-link`, aria-label "Copy link to this view") copies a URL holding the view and every control value; falls back to `window.prompt`. The primary button appears only where a view needs an explicit apply.
- Mobile (≤800px): groups `flex:1 1 140px`, selects 100% width, actions full width.
- **Field help** under the panel: 12px/1.7 `--tx-note` on `--bg-help`, radius 6, padding 12px 16px, margin 12px 0; text changes with the selected option.
- **Context bar** under that: flex, space-between, wrap, gap 12, 10px/1.7 `--tx-quiet`, padding 12px 2px. Left: a plain sentence describing the exact selection with · separators ("Showing Mon 26 Oct · 00:00–23:59 IST · all tanks"). Right: `role='status' aria-live='polite'` ("Loading…", "Live · updated 19:51 IST", "View unavailable — check selection").

**Overview and Analytics controls (shared range model).** State is one object `{kind:'preset'|'day'|'custom', …}` kept in the URL (`/dashboard?node=2&from=2026-10-29T14:00Z&to=2026-10-29T18:00Z`):
- **Time range** — segmented control: 1h · 6h · 24h · Week · Custom (rolling windows from now; Week = rolling 7 days).
- **Day** — segmented control of the seven days with dates (Mon 26 … Sun 1); picking one sets a calendar-day window in the chosen timezone and deselects the presets.
- **Heatmap tank** (Overview only) — select: All tanks (average fill %) · Tank 1 … Tank 5.
- **From / To** — two `datetime-local` inputs, shown only when Custom is active; the primary button **Show results** appears with them.
- **Brush-drag on any trend chart** sets Custom and writes `from`/`to` to the URL; **clicking a heatmap cell** zooms every chart to that hour. All three paths stay synchronised.

### 11.2 Buttons [E]

| Variant | Background | Text | Border | Radius | Padding | Shadow | Hover |
|---|---|---|---|---|---|---|---|
| Primary | `--accent-500` | #fff 600 | none | 8 | 10 24 | `--sh-cta` | `--accent-600`, lift −2px, `--sh-cta-hover` |
| CTA pill | `--g-cta` | #fff 700 | none | 25 | 10 24 | 0 4px 15px rgba(242,101,34,.4) | lift −2px, stronger shadow |
| Data (teal) | `--data-600` | #fff 600 | none | 8 | 10 24 | `--sh-data` | `--data-700`, lift, `--sh-data-hover` |
| Accent (navy) | `--brand-800` | #fff 600 | none | 6 | 8 16 | none | `--brand-500` |
| Outline | transparent | `--tx-label` 600 | 1px `--bd-strong` | 8 | 10 20 | none | border + text `--tx-head` |
| Secondary | `--neutral-bg` | `--tx-input` 600 | none | 8 | 10 20 | none | `--bd`, text `--tx-head` |
| Glass (on dark) | `--glass-2` | #fff 600 | 1px `--glass-line-2` | 8 | 10 24 | none, blur 5px | #fff background, `--brand-800` text |
| Danger [D] | `--err-tx` | #fff 600 | none | 8 | 10 24 | none | darken 8%; used only for Delete |
| Icon-only | Outline variant | icon | | 8 | 10 14 | | needs `aria-label` and `title` |
| Small | any | 13px | | | 8 16 | | |

All buttons: `cursor:pointer; transition:all .3s`; icon on the left with an 8px gap; focus ring per §4. Pressed: `translateY(0)` and reduced shadow. Disabled: opacity .5, no lift, `cursor:not-allowed`; a **reserved-slot** control also shows the `fa-lock` icon and a `PHASE n` chip. Loading: icon becomes a spinning `fa-spinner`, label unchanged.

### 11.3 Fields [E]

- Select, input, datetime: padding 10px 15px; border 1px `--bd-strong`; radius 8; background `--bg-subtle`; Inter 500 14px; colour `--tx-input`; min-height 40; transition .3s.
- Number inputs with units show the unit as a right-aligned suffix inside the field ("cm", "%", "min") in `--tx-quiet`.
- Focus: border `--brand-500`, `box-shadow:var(--ring-field)`, background `--bg-card`; keyboard focus-visible adds the amber outline.
- Placeholder `--tx-faint`. Invalid: border `--err-bd`, ring rgba(147,54,41,.12), 12px `--err-tx` message below.
- **Segmented control** [D]: container `--bg-subtle`, 1px `--bd-strong`, radius 8, padding 3, gap 2; item padding 7px 12px, radius 6, 12.8px/700 `--tx-tab`; hover `--bg-tab-hover`; active `--brand-600` with #fff text; `role="radiogroup"` with arrow-key navigation.
- **Switch** (maintenance mode, toggles): §20.
- **Validation rules and exact messages:**
  - Device EUI: 16 hex characters, unique. "Enter the 16-character Device EUI." / "This EUI is already used by {label}."
  - Height H and radius R: numbers > 0. "Height must be greater than 0 cm."
  - Dead zone: ≥ 0 and < H. "Dead zone must be smaller than the tank height."
  - Thresholds: Emergency < Critical < Warning < 100. "Critical must be lower than Warning." / "Emergency must be lower than Critical."
  - Persistence: whole number 1–10. Cooldown: whole number 1–240 min.
  - Custom range: From before To. "Choose a start date on or before the end date."

### 11.4 Collapsibles [E]

`details/summary` for the view guide on the Overview, advanced options, raw-data inspector and glossary: summary 12px/650 `--brand-600`, padding 5px 0, pointer. The advanced block has border-top 1px `--bd-adv`, padding-top 12px.

## 12. Cards and containers

### 12.1 Standard card [E]

Background `--bg-card` · border 1px `--bd` · radius 16 · padding 30 · margin-bottom 30 · transition `--t-card`. Hover: `box-shadow:var(--sh-card-hover); border-color:var(--bd-strong)` with **no vertical movement** (charts must not jitter). Mobile padding 16.

- Heading row: flex, space-between, flex-start, margin-bottom 20. Left = eyebrow + H2. Right = pill (e.g. "5 tanks · 3 need attention"): `--bg-pill`, text `--brand-500`, padding 5px 15px, radius 20, 12.8px/700; optionally an icon-only CSV button (FULL).
- Footnote below a plot: flex, gap 5, margin-top 15, 12.8px `--tx-soft`, leading `fa-info-circle`.
- Chart cards without an eyebrow use `h2.card-title` (§5).

### 12.2 Tank tile [P: F-01, F-02]

The Overview's hero element. Card look with these differences: padding 20, radius 16, **4px top status bar** (`ok` → `--ok-bd`, `info` → `--info-bd`, `warning` → `--warn-bd`, `critical` → `--err-bd`, `emergency` → `--emg-bg`, fault/no-data → `--neutral-bd`), hover = shadow + border only. The whole tile is a link to `/tanks/[id]` with `aria-label`.

Top to bottom:
1. **Header row:** tank label (14px/700 `--tx-head`, truncates with ellipsis, full text in `title`) · status chip right (§12.6).
2. **Meta row:** location (11px `--tx-quiet`) · **SIM** chip when simulated (§12.6).
3. **Tank SVG** (§12.3), height 180.
4. **Percent full** (32px/900) coloured by state: normal `--tx-head`, warning `--warn-tx`, critical/emergency `--err-tx`, fault/no-data `--tx-soft`.
5. **Volume** (14px/600 `--tx-main`): "6.3 kL" (tiles) with capacity in `--tx-quiet`: "of 9.4 kL".
6. **Distance row** (12px `--tx-body`, `fa-ruler-vertical`): "Sensor to water: 202 cm".
7. **Freshness row:** freshness dot + relative time ("2 min ago"); the `title` holds absolute time in both IST and UTC.
8. FULL: forecast line "Empty in ~45 min" (N-11) in `--warn-tx`.

**State variants:**
- **Fault / no trustworthy reading:** value shows "—", volume "—", the tank is dashed and empty with a centred "?" glyph, the chip reads SENSOR FAULT. **Never show 0 % or "??".**
- **No data (silent):** the last known level is ghosted at 35 % opacity, the chip reads NO DATA, the freshness dot is red with "Last seen 18 min ago".
- **Maintenance:** a wrench badge over the tank, chip MAINTENANCE, alert styling suppressed.
- **Draft / awaiting first reading:** dashed outline, `fa-hourglass-half`, "Awaiting first reading" with a countdown from 5:00 and then "Overdue".
- **Loading:** skeleton with the SVG area as a `--bg-plot` rectangle.

**Grid:** 5 columns above 1280px (gap 20, ~248px at 1440) · 3 columns from 1024 to 1280 · 2 columns from 768 to 1023 · 1 column below 768. At ≤ 767px the tile becomes **horizontal**: a 96px-wide SVG on the left, text on the right.

### 12.3 Tank SVG component (`@ohtms/ui` `<TankSVG/>`) [P: F-01, Part 2.1, 2.4]

Props: `shape: 'cylinder'|'rectangle'`, `levelPct`, `distanceCm`, `heightCm`, `deadZoneCm`, `thresholds`, `state`, `simulated`, `size: 'tile'|'hero'|'mini'`.

**Geometry** (viewBox `0 0 200 260`; scale to the container, keep aspect):
- **Body:** x 40–160, y 48–228. Cylinder = side walls plus a top ellipse (cx 100, cy 48, rx 60, ry 10) and a bottom arc. Rectangle = a rounded rectangle (radius 8) with a thin top face. Fill `--tank-body` at 60% opacity; stroke `--tank-edge` 2px; a soft left-edge gloss (white at 18% to 0%).
- **Sensor:** a 24×14 housing (radius 3, fill `--brand-800`, dark theme `--bd-strong`) on the lid at (88, 26), with a tiny orange dot (`--accent-500`) as the emitter. A **dashed beam** (1.5px, `--accent-500`, 4/4) runs from the emitter down to the water surface, ending in a small chevron. The label chip **"202 cm"** (11px/700) sits beside the beam's midpoint. This visualises "distance down to water".
- **Water:** clipped to the body. A gradient from `--water-a` to `--water-b`, surface y = 228 − (levelPct/100 × 180). Two overlapping wave paths (amplitude 3px, wavelength 60px) animate `translateX` over 6s and 9s in opposite directions (§16). Level changes tween with `transition: transform 1.2s var(--ease)`.
- **Dead-zone band:** a diagonal-hatched band at the top inside the body, height = deadZoneCm / heightCm × 180 (25/300 ≈ 15px), pattern stroke `--tank-dead`; caption "dead zone" at 10px only in `hero` size.
- **Scale:** ticks at 0, 25, 50, 75, 100 % on the right with 10px `--tx-quiet` labels (hero and tile sizes; omitted in `mini`).
- **Threshold ticks** on the left: Warning, Critical, Emergency drawn as short ticks with 10px labels ("40", "20", "5"), colours `--warn-tx`, `--err-tx`, `--emg-bg`. The tick for the *currently crossed* threshold thickens to 3px.
- **Overflow risk** (`distance < deadZone + 10 cm`): the top 10% of the tank gets an `--err-tx` glow outline and the severity ring.
- **State rendering** follows §12.2. Simulated tanks carry the SIM chip in the card, never baked into the SVG.
- **Accessibility:** `role="img"` with `aria-label` "Tank 1: 33 percent full, 3.1 kilolitres, sensor distance 202 centimetres, status low level." Reduced motion: no wave, no tween.

### 12.4 KPI stat box [E]

Row: grid, 3 columns, gap 20, margin-top 30, 1px `--bd-table` rule above and padding-top 20 (1 column at ≤800px). Box: background `--bg-work`; border 1px `--bd`; radius 12; padding 20; flex, centred, gap 20, wrap; hover lift −3px + `--sh-tile-hover`. Left: icon tile 50×50. Right: value (32px/900, lh 1, margin-bottom 5) over caption (11px `--tx-quiet`). A full-width definition line (11px/1.7 `--tx-body`) explains what the number counts.

### 12.5 Gradient card, callouts, code card, accent bar [E]

- **Gradient card:** `background:var(--g-ocean); color:#fff; border:none`; eyebrow and dt in `--gold-500`; dd #e2edf7 at lh 1.8; H2 white. Use for "How distance becomes level" and definitions.
- **View guide:** background `--bg-guide`; border 1px `--bd-guide`; **left border 4px `--brand-600`**; radius 12; padding 22px 24px; margin 22px 0.
- **Chart explainer:** padding 12px 14px; background `--bg-explain`; left border 3px `--bd-explain`; radius 4; margin 12px 0 16px.
- **Glossary details:** background `--bg-gloss`; border 1px `--bd-gloss`; left border 4px `--data-600`; radius 10; padding 18; shadow 0 4px 12px rgba(8,126,131,.08); margin 25px 0; dl grid 130px 1fr, gap 12, 12px/1.8; dt 700 `--tx-link`; dd `--tx-body`.
- **Dataset overview:** dl grid minmax(130px,1fr) 2fr, gap 10px 20px, 13px.
- **Dark code card** (raw JSON): background `--bg-code`, text `--tx-code`, padding 20, radius 10, Menlo 13.6px, border 1px `--bd-code`, max-height 480, overflow auto.
- **Accent bar utility:** 4px left bar with `--g-bar`, radius 16px 0 0 16px, marks the featured "Fleet health" card.

### 12.6 Chips and status vocabularies [P: Parts 5.1, 5.2, 6.2]

All chips: pill, 12.8px/700, padding 4px 12px, leading icon. Severity chips are UPPERCASE with .5px tracking.

| Vocabulary | Values → colour set |
|---|---|
| **Severity** | Info → `--info-*` · Warning → `--warn-*` · Critical → `--err-*` · **Emergency → solid `--emg-bg` + `--emg-tx`, with a pulse ring** |
| **Alert state** | Active → its severity set · Acknowledged → `--info-*` · Snoozed → neutral · Resolved → `--ok-*` · Suppressed → neutral with dashed border · Escalated → `--err-*` with `fa-arrow-up` |
| **Node status** | Active → `--ok-*` · Maintenance → `--info-*` · Offline → `--err-*` · Decommissioned → neutral · Draft → neutral with dashed border |
| **Data source** | LIVE → `--ok-*` with a small `--live` dot · **SIM** → neutral, 10px, `fa-flask`, dashed border |
| **Quality** | Good / Fair / Weak (§14 V1 signal card) → `--ok-*` / `--warn-*` / `--err-*` |
| **Role** | Viewer → neutral · Operator → `--info-*` · Admin → `--brand-600` fill, white text |

Rule: every chip carries an icon **and** a word; no meaning rests on colour alone.

## 13. Data-visualisation system

### 13.1 Principles [E]

- Every chart lives in a white card: eyebrow + H2, then a plain-language explainer, then the plot, then a footnote (§12.1, §15).
- Units appear in axis titles and legends. Colour limits are fixed until the user changes them. A blank cell means no data, never zero. Missing numbers render as an em dash.
- **Water rule:** primary charts plot **level** (higher = more water, normal axis). Any chart that plots raw **distance** uses an **inverted y-axis** (`inverse:true`) and the axis title "Distance to water (cm) — larger means less water", so the line moves the way the water does (Part 2.4).
- Downloads (CSV) sit in the card header of the figure they export (FULL). Each plot keeps the chart toolbox at 60% opacity, with PNG export at 2× scale.
- Reference stack: **Apache ECharts** (`echarts` core with the Line, Bar, Heatmap, Scatter, Grid, DataZoom, Toolbox, Tooltip, VisualMap, MarkLine, MarkArea components; tree-shake). The chart theme **reads the CSS variables at runtime** (`getComputedStyle`) and rebuilds on theme change; the hex values below are the light-theme resolved values.

### 13.2 Plot container and theme [E, re-expressed for ECharts]

- Container (`.plot`): width 100%, min-width 0, radius 10, overflow hidden, background `--bg-card`, border 1px `--bd-soft`. Reserve its height up front to avoid layout shift. On resize, debounce with `requestAnimationFrame` and call `chart.resize()` for every visible chart.

```ts
const v = (name:string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const axis = () => ({
  axisLine:{lineStyle:{color:'#becfd6'}}, axisTick:{show:true, length:4},
  axisLabel:{fontSize:10, color:v('--tx-chart')},
  splitLine:{lineStyle:{color:'#e8eff2'}},          // dark: '#223a5a'
  nameTextStyle:{fontSize:11, color:v('--tx-chart')} });
export const baseOption = (title='') => ({
  animation:false,                                   // charts update in place
  backgroundColor:v('--bg-card'),
  textStyle:{fontFamily:'Inter, system-ui, sans-serif', color:v('--tx-chart'), fontSize:11},
  title:{text:title, left:'4%', textStyle:{fontSize:12, fontWeight:600, color:v('--tx-chart')}},
  grid:{left:54, right:30, top:44, bottom:50},       // with a slider: bottom 78
  legend:{top:8, left:0, orient:'horizontal', itemWidth:14, textStyle:{fontSize:10}},
  tooltip:{trigger:'axis', confine:true, backgroundColor:v('--bg-card'), borderColor:v('--bd'),
    textStyle:{fontSize:12, color:v('--tx-main')}, extraCssText:'border-radius:12px;box-shadow:var(--sh-shell);'},
  toolbox:{right:8, top:4, itemSize:14, iconStyle:{borderColor:v('--tx-quiet'), opacity:.6},
    feature:{ dataZoom:{yAxisIndex:'none'}, restore:{}, saveAsImage:{pixelRatio:2, name:'ohtms-figure'} }},
  xAxis:{type:'time', ...axis()}, yAxis:{type:'value', ...axis()} });
```

- **Zoom and brush (F-04):** `dataZoom:[{type:'inside', filterMode:'none'}, {type:'slider', height:24, bottom:8, borderColor:v('--bd'), fillerColor:'rgba(8,126,131,.16)'}]` plus `toolbox.feature.dataZoom` for drag-select. On `dataZoom` events debounce 250 ms, convert to ISO UTC and write `from`/`to` to the URL; other widgets react.
- **Tooltips for compliance** (Rajesh): "Tank 1 — Main Building · Mon 26 Oct, 14:05 IST (08:35 UTC) · Fill 62.4 % · Level 187 cm · 5,874 L". Simulated series append " · simulated".

### 13.3 Series styling

| Element | Style |
|---|---|
| Tank series | colour `--series-{Tank.colorIndex}`, width 2–2.4, no symbols above 24 h, 3–5px symbols below; **the colour follows the tank's `colorIndex`, never its list position** |
| Legend names | "Tank 2 — ICU Block · simulated" for synthetic series |
| Warning threshold | dotted markLine, `--warn-tx`, 1.5px, label "Warning 40 %" |
| Critical threshold | dotted markLine, `--err-tx`, 1.5px, label "Critical 20 %" |
| Emergency threshold | dotted markLine, `--emg-bg`, 1.5px, label "Emergency 5 %" |
| Dead-zone / overflow | markArea at the top, fill `--bd-soft` at 60% with the label "dead zone" |
| Fill event | markArea, fill rgba(8,126,131,.16), label "Fill" |
| Drain event | markArea, fill rgba(173,104,76,.14), label "Drain" |
| Alert marker | `scatter` point on the line, size 9, white fill, 2px ring in the severity colour |
| Sensor-fault / no-data gap | **a visible break in the line** (`connectNulls:false`), with a hatched markArea labelled "No data" |
| Observation-style selected point | size 9, white fill, 2px `--brand-800` ring |
| Bars (daily consumption) | `--series-{n}`, radius [4,4,0,0], max width 28 |
| Scatter (events) | size 8, `--series-{n}`, opacity .8 |
| Reference line | dotted `#a77661`, 1–2px |
| Uncertainty / selected band | fill rgba(8,126,131,.16), no outline |

Categorical palette: `--series-1…8` in that order. Never more than 8 series; never a pure red/green pair.

### 13.4 Continuous colour scales [E]

Three perceptually uniform scales (cmocean thermal, balance, amp; MIT-licensed, ship the licence file). Build a 9-stop scale from these anchors at positions 0, .125 … 1:

- **thermal** (sequential): `#042333 · #19337c · #563b9c · #83508f · #ae5e83 · #de7065 · #f99242 · #f9c441 · #e8fa5b`
- **balance** (diverging, zero-centred): `#181c43 · #2548b0 · #3888ba · #98bac5 · #eeeaea · #d8a493 · #c05a3c · #901029 · #3c0912`
- **amp** (magnitude): `#f1edec · #e2c7bf · #d7a291 · #cc7e64 · #c05b3d · #af3024 · #901029 · #650f24 · #3c0912`

Mapping for OHTMS: **fill % → thermal** (fixed limits [0, 100], so a dark cell means nearly empty and a bright cell means nearly full) · **anomaly z-score or any difference → balance** (symmetric, default ±3) · **consumption or magnitude → amp** (limits fixed to the maximum of the selected window, rounded up, until the user changes the window). VisualMap: `type:'continuous'`, `orient:'horizontal'`, bottom, `itemHeight:260`, `itemWidth:10`, `calculable:false`, title = unit.

**Week heatmap (F-03):** `type:'heatmap'`; x = hour 0–23, y = the seven days (labels "Mon 26"); cell value = mean fill % for that hour (selected tank, or the average of all tanks); `itemStyle:{borderColor:v('--bg-card'), borderWidth:2, borderRadius:4}`; **hours with no data are left blank with the legend note "Blank = no data, not zero"**; tooltip "Tank 1 · Mon 26 Oct, 14:00–15:00 IST · Mean fill 62.4 % · 5,874 L"; clicking a cell zooms every chart to that hour; the active day's row label is bold `--tx-head`.

### 13.5 Chart sizes

| Chart | Height |
|---|---|
| Overview trend (all tanks, with slider) | 440px (350px at ≤780) |
| Tank level chart (V2, with events and thresholds) | 440px (350px at ≤780) |
| Week heatmap | 330px (300px at ≤780) |
| Dashboard / analytics chart | 330px |
| Alert-detail window chart | 330px |
| Single event timeline, raw distance chart | 260px |

### 13.6 Chart grids

- Two-up grid: 2 columns of `minmax(0,1fr)`, gap 30 (1 column at ≤800px).
- Tank detail top row: `2fr 1fr`, gap 30, margin-bottom 30 (1 column at ≤1250px).

### 13.7 Tables [E]

- Wrapper `.table-wrap` with horizontal scroll and the custom scrollbar. Table: `border-collapse:collapse; width:100%; font-size:12px; font-variant-numeric:tabular-nums`.
- Header: 10px `--tx-quiet` on `--bg-th`. Cells: padding 11px 10px, `white-space:nowrap`, border-bottom 1px `--bd-table`. **Numeric columns right-aligned, first column left-aligned.** Units live in header labels ("Fill %", "Volume L", "RSSI dBm"). Missing values show `—`.
- Sticky header, row hover `--bg-subtle`, sortable columns with `fa-sort`, pagination above 25 rows (§20), copy/CSV export in the card header (FULL).
- A one-sentence footnote under every table states sample size and caveats.

### 13.8 Maps and images

[X] No maps. The Tank SVG replaces the map archetype. Any photograph (hero, About) follows: 16:9, radius 10, 1px `--bd-soft`, `object-fit:cover`, lazy, with a caption in footnote style.

### 13.9 Data-honesty rules [P: Part 10.2]

Label the data mode with a badge (Demo, Mixed, Live). Show simulated data with the warning banner and SIM chips. Always show N (readings, tanks). Say "blank means no data, not zero". Show units, and the timezone (IST or UTC) wherever a time appears. Never imply accuracy the data does not support (fixed decimals, §5). Offer the raw readings for every tank.

## 14. Views

All **workspace views** share this top-to-bottom order [E]: page header → mode line → banners → **view guide** → **control panel** → field help → context bar → view content → glossary → footer. Controls that do not apply to a view are hidden. **Role rule:** Viewer = read only; Operator = Viewer + acknowledge/resolve alerts, change thresholds; Admin = Operator + nodes, users, tank dimensions, audit, regenerate seed. A control the role cannot use is hidden if it is a whole area, or disabled with a lock icon and the tooltip "Admin only" when it sits inside a visible form.

### V1 · Overview (`/dashboard`) — tab 01

Order (priority override): page header → mode line → banners (simulated, stale) → **collapsed guide bar** (open on the user's first ever visit; remembered in localStorage) → **TANK STATUS** section → control panel → field help → context bar → **Fleet health** card → **week heatmap** card → **trend** card → two-up **Node health** | **Signal quality** → glossary → footer.

1. **Tank status:** section eyebrow "TANK STATUS" + pill "5 tanks · 3 need attention"; the tile grid (§12.2). Tiles always show the **latest** reading and ignore the time range. Below the grid, in FULL, the playback scrubber (N-14).
2. **Control panel:** time range, day, heatmap tank, custom From/To, share. The range applies to every widget below the panel.
3. **Fleet health** (accent bar, gradient not used): left eyebrow + H2 "Is the system healthy?"; below, **3 KPI boxes**:
   - **Active alerts** — count, caption "unacknowledged and acknowledged-but-open"; definition "Alerts that have fired and not yet resolved. Tanks in maintenance are excluded."
   - **Nodes reporting** — "5 of 5"; definition "Nodes that sent a reading within the last 15 minutes."
   - **Data completeness** — "98.2 %" (7-day mean); definition "Readings received divided by readings expected at the ~5-minute cadence."
4. **Week heatmap card:** eyebrow "WEEKLY PATTERN", H2 "When does the fill level run low?", count pill ("168 hourly cells"), explainer, plot 330, footnote.
5. **Trend card:** eyebrow "LEVEL HISTORY", H2 "How have all tanks moved?", all five tanks overlaid as level %, threshold markLines for the Warning and Critical values of the selected tank (or the defaults 40 % and 20 % when more than one tank is shown), alert markers, dataZoom slider, plot 440, footnote "Drag across the chart to select any window. Dashed names are simulated."
6. **Node health card:** eyebrow "NODE HEALTH", 5 compact tiles (grid, gap 20): status dot + label · node-status chip · LIVE/SIM chip · "Last uplink 2 min ago" · battery "78 %" or "—". Active vs inactive is obvious at a glance (inactive tiles are dimmed to 70 % and show the status).
7. **Signal quality card:** eyebrow "SIGNAL QUALITY", a table: Node · RSSI dBm · SNR dB · Gateway · Quality chip · **Completeness** (a progress bar with the percentage). Quality [D]: RSSI ≥ −90 Good, −90…−110 Fair, < −110 Weak; SNR ≥ 5 dB Good, 0…5 Fair, < 0 Weak; the card shows the worse of the two. Completeness: ≥ 95 % `--ok-tx`, 80–95 % `--warn-tx`, < 80 % `--err-tx`. Footnote: "Simulated nodes show generated signal values."

### V2 · Tank detail (`/tanks/[id]`) — tab 02

Controls: **Tank** select ("What to show": the five tanks), time range, share. Then:
1. **Top row, 2fr 1fr:** left **Tank hero card** (TankSVG `hero`, ~420px high, shows scale, thresholds, dead zone, the sensor beam and the distance label, plus the tank's label, location, node-status chip and LIVE/SIM chip) · right a stack of two cards:
   - **Reading card:** "CURRENT READING" — Fill % at 40px/900 coloured by state; rows: Distance (cm), Level (cm), Volume (L) and Capacity (L), freshness line, each with its icon and unit; a one-line formula footnote "Level = tank height − distance".
   - **Status card:** "NODE STATUS" — Pump (**Filling** or **Idle**, "inferred from fill events"), Battery %, Signal quality chip with RSSI/SNR, Data quality flag, node-status chip, and the **Maintenance mode** switch (Operator and Admin) with the helper "Suppresses alerts, keeps logging data."
2. **Level chart card:** eyebrow "LEVEL HISTORY", H2 "What has this tank done?", plot 440, thresholds, fill/drain markAreas, alert markers, no-data gaps, dataZoom slider; explainer above.
3. **Stats grid (KPI boxes, 3 columns × 2 rows):** Mean fill % · Lowest fill % · Highest fill % · Total consumption (L) · Total inflow (L) · Variability (σ, percentage points). Each has a definition line.
4. **Two-up:** **Event timeline** (fill and drain events as rows: icon, start–end, duration, litres moved, "pump cycle" or "consumption"; plot 260 optional) with a count pill ("6 fill · 9 drain") | **Alert history for this tank** (compact list: severity chip, title, fired time, state chip, link).
5. **Raw data inspector** (`details`, collapsed): a **distance chart with an inverted y-axis** (260) and a table of readings: Time (with seconds) · Distance cm · Level cm · Fill % · Volume L · RSSI dBm · SNR dB · f_cnt · Battery % · Quality. Footnote: "Raw values are what the sensor reported. Level, fill and volume are derived from the tank dimensions."
6. Draft tanks show the awaiting-first-reading empty state instead of charts.

### V3 · Analytics (`/analytics`) — tab 03

Controls: time range (Day / presets / Custom), share. Then:
1. **Window summary** (Fleet card with accent bar): KPI boxes — **Total consumption (L)**, **Total inflow (L)**, **Fill events** (count).
2. **Comparison table card** (`fa-table`): one row per tank — Tank · Mean fill % · Min % · Max % · σ pp · Consumption L · Inflow L · Fill events · Drain events · Completeness % · Node status chip. Sortable; numbers right-aligned; footnote "{N} readings across {n} tanks. Simulated tanks are marked SIM."
3. **Two-up:** **Daily consumption** (grouped bars, litres used per tank per day, 330) | **Fill and drain events** (scatter by time, size = litres moved, 330).
4. **Locked row** (3 cards, empty-state pattern with a lock icon): **Reports** (weekly summary, monthly compliance, incident, consumption — PHASE 2) · **Comparison and anomalies** (this week vs last, anomaly detection, peak hours — PHASE 2/3) · **Forecasts** (time to empty, leak detection — PHASE 2/3).

### V4 · Alerts (`/alerts`) — tab 04

Filter panel (control-panel look): Level · State · Tank · Type · From/To · **Apply filters** (primary) · **Reset** (outline). Then one **table card** (`fa-bell`): Level chip · Tank · Type · Message · Fired · State chip · Acknowledged by · Resolved · Action. The **Acknowledge** small button appears on active rows for Operator and Admin (one click). Row click opens V5. Pagination 25 rows. Empty state: "No alerts match these filters. Clear a filter or widen the date range."

**Alert type registry** (drives chips, filters, copy). `Phase` = the phase in which the alert is raised:

| Type | Trigger | Level | Title / example message | Phase |
|---|---|---|---|---|
| LOW_LEVEL | level < warning threshold | Warning | "Tank 1 at 33 % — below 40 % threshold" | 1 |
| CRITICAL_LOW | level < critical threshold | Critical | "Tank 2 at 18 % — refill needed" | 1 |
| EMPTY | level < 5 % | Emergency | "Tank 2 nearly empty — immediate action" | 1 |
| OVERFLOW_RISK | distance < dead zone + 10 cm | Critical | "Tank 4 near sensor dead zone — possible overflow" | 1 |
| SENSOR_FAULT | distance < 0, > H, or spike > 3σ | Critical | "Tank 5 sensor reporting invalid value" | 1 |
| NO_DATA | no uplink > 15 min | Warning | "Tank 4 silent for 18 min — check device" | 1 |
| BATTERY_LOW | battery < 20 % | Warning | "Tank 5 battery at 18 % — plan battery change" | 2 |
| RAPID_DRAIN | level drop > X cm in Y min without a pump | Warning | "Tank 2 dropped 15 cm in 10 min — possible leak" | 2 |
| PREDICTED_EMPTY | forecast < 60 min to empty | Warning | "Tank 1 predicted to empty in 45 min at current rate" | 2 |
| GATEWAY_OFFLINE | gateway check fails | Critical | "SenseCap gateway offline — all nodes affected" | FULL |
| FLATLINE | no level change > 6 h and not full | Info | "Tank 2 readings unchanged for 6 h — check sensor" | FULL |
| PUMP_STUCK | pump on, no rise in 20 min | Critical | "Tank 1 pump on but no level rise — pump or valve fault" | FULL |
| DATA_GAP | f_cnt skip | Info | "Tank 3 missed 1 reading (f_cnt gap)" | FULL |

Filters list only the types built in the active scope.

### V5 · Alert detail (`/alerts/[id]`)

Breadcrumbs "Alerts › {title}". Header: severity chip + state chip + title (H1). Then:
1. **Two-up:** **Evidence card** — the triggering reading as a definition list (Time, Distance, Level, Fill %, Volume, RSSI, SNR, f_cnt, Battery, Quality flag) and a prominent **Sensor health verdict** chip: "Reading plausible — sensor healthy" (`--ok-*`) or "Reading out of range — sensor fault suspected" (`--err-*`), so Suresh knows whether to climb the ladder · **Lifecycle card** — a vertical stepper (§20): Detected → Notified → Acknowledged → Resolved with timestamps; an extra greyed "Escalated" step with a lock and `PHASE 2` chip.
2. **Window chart:** ±3 h around the alert, level line, the crossed threshold as a markLine, the alert marker (330).
3. **Response card:** textarea "What did you do?" (label, 3 rows, 280 characters), buttons: **Acknowledge** (primary), **Resolve** (outline), **Snooze** (outline, disabled, lock, `PHASE 2`). Operator and Admin only; Viewers see the recorded response read-only. After acknowledging: toast "Alert acknowledged." and the stepper updates.
4. **Delivery card:** rows for each channel with delivery status: **In-app — Delivered ✓**; Email, SMS, WhatsApp, Voice, Push, Webhook, Slack/Teams as reserved rows with lock + `PHASE 2/3` chips.
5. **Rule card:** the rule that fired as a definition list — Condition, Persistence (3 readings ≈ 15 min), Cooldown (30 min), Auto-resolve (hysteresis, e.g. "above 25 %"), plus "Repeats suppressed: n" (deduplication).

### V6 · Settings (`/settings`) — tab 05 (Operator, Admin)

Stacked cards, each with eyebrow + H2, a two-column field grid (gap 20) and a right-aligned save row (outline **Cancel** + primary **Save changes**):
1. **Alert thresholds** (tank select at the top; Operator and Admin): Warning low % (40) · Critical low % (20) · Emergency empty % (5) · Overflow risk (read-only: "dead zone + 10 cm", shown as the resulting cm) · Persistence (3 readings) · Cooldown (30 min) · Quiet hours (22:00–06:00, reserved, `PHASE 2`) · Maintenance mode (switch). A **live `mini` TankSVG** beside the fields redraws the threshold ticks as values change. A summary line: "Critical fires after 3 consecutive readings (≈ 15 min) and repeats at most every 30 min."
2. **Tank configuration** (tank select; fields editable by Admin only): Label · Shape (Cylinder / Rectangle) · Height H (cm) · Radius R (cm) or Length × Width · Dead zone (cm) · Mounting date · live **capacity preview** ("Capacity 9,425 L"). Saving a changed H, R or dimensions opens **Modal M5**.
3. **Display preferences:** Theme (Dark / Light) · Time zone (IST / UTC) · Text size (A- / A / A+). Applies instantly and persists.
4. **Notifications** (reserved, `PHASE 2`): per-user channel preferences, rate limit per channel.
5. **Account and security** (reserved, `PHASE 2`): two-factor authentication, sign out of all sessions.

### V7 · Nodes (`/admin/nodes`) — tab 06 › Nodes (Admin)

Secondary tabs inside the card (§20): **Nodes · Users · Audit log** (+ **System** in FULL). A filter panel (Status select, text filter for label or EUI). Then a **table card**: Node (label) · Device EUI · Location · Dimensions (H × R) · Status chip · Last uplink · Source (LIVE/SIM) · Actions (edit `fa-pen`, status menu, delete `fa-trash-can`). Draft rows show "Awaiting first reading" with the countdown. Below, a collapsed **Deleted nodes** `details`: rows with "Restorable for 62 more days" and a **Restore** (`fa-rotate-left`) outline button.
- **Add node (Modal M2, stepper, 5 steps)** [P: Part 6.3]:
  1. **Identity** — Node label · Device EUI (validated for uniqueness) · Join EUI · Application ID · Building · Floor.
  2. **Tank dimensions** — Shape · Height H · Radius R (or Length × Width) · Dead zone (auto-filled by sensor model, editable) · Mounting date; live capacity preview.
  3. **Thresholds** — Warning low · Critical low · Emergency empty · Overflow risk (auto: dead zone + 10 cm).
  4. **Alert recipients** — user and group pickers and channel checkboxes. In-app is on; every other channel is a reserved slot (lock + `PHASE 2/3`).
  5. **Review and activate** — summary, then **Save as draft** (outline) · **Activate now** (primary) · **Activate with simulation** (outline).
- **Edit node (Modal M3):** the same fields as one scrolling form of collapsible sections. Changing H or R opens Modal M5.
- **Delete node (Modal M4):** soft delete; the user must **type the node label** to enable the Danger button "Delete node"; copy: "This hides {label} from the dashboard. History is kept for 90 days and you can restore it until then."
- **Status menu** per row: Active · Maintenance · Offline · Decommissioned (Draft is the pre-activation state only). Changing status writes to the audit log.

### V8 · Users (`/admin/users`) — tab 06 › Users (Admin)

Table card: Name · Email · Role chip · Status · Last login · Actions. **Add user** and **Edit** open a modal (Name, Email, Role select with the three-row permission summary below it, Active switch). Last Admin cannot be demoted: "At least one Admin is required."

### V9 · Audit log (`/admin/audit`) — tab 06 › Audit log (Admin)

`SCOPE=FULL`: a table card — When (IST) · Who · Action (config change, node delete, acknowledgement, login, threshold change) · Target · Before → After; filters for Who, Action and date; 7-year retention footnote. `SCOPE=PHASE_1`: the empty/locked state (§20) "The audit log arrives in Phase 2."

### V10 · About (`/about`) — full-page view

Max 1200 centred, padding 60px 20px. Title 36px Display `--brand-600`; subtitle 16px/700 `--data-600`, tracking 2px UPPERCASE: "MAMS HOSPITAL · OVERHEAD TANK MANAGEMENT SYSTEM". Sections (anchors `#how-it-works`, `#methodology`, `#glossary`):
1. **What OHTMS does** — the one-paragraph summary from the project document, with the three-sentence analogy (five glasses of water and a ruler).
2. **How it works** — an SVG **system diagram** (Sensor → Wio-E5 node → LoRa 868 MHz → SenseCap gateway → The Things Stack → backend → dashboard), each box with the 10-step data-journey caption; "Total latency ~1–2 s".
3. **How distance becomes level** — a gradient card with the formulas and the **worked example** (H 300, R 100, distance 202 → level 98 cm → 3,079 L → 32.7 %) and the rule "bigger distance = less water".
4. **Methodology** (`details` open): what is real (Tank 1's signal fingerprint: noise, cadence) and what is simulated (Tanks 2–5, physics-based); what the SIM chip means; in FULL an Admin-only **Regenerate week with new seed** outline button (M-06).
5. **Data retention** — a small table: Raw readings 90 days · 1-hour averages 1 year · 1-day averages 5 years · Events 5 years · Alerts 5 years · Audit log 7 years · Deleted nodes 90 days.
6. **Glossary** — all 19 terms from Part 14 as a `dl`.

[X] No team cards, no contact page.

### V11 · Login (`/login`) — archetype G

Centred card, max-width 440, padding 40, on `--g-ocean` with the glass header omitted; the OHTMS mark on top; Email and Password fields full width; **Sign in** primary full-width; "Forgot password?" in `--brand-500` as a reserved link (`PHASE 2` chip on hover); error "Email or password is incorrect." Session lasts 8 hours; on expiry show Modal M6 "Your session has ended. Sign in again to continue." Passwords: min 8 characters.

### Modals

| ID | Modal | Notes |
|---|---|---|
| M1 | **First-load configuration** (C-01) | Max-width 720, shown when any tank lacks H or R. A table of rows (Label, Shape, H cm, R cm, Dead zone cm, live capacity). Primary **Save and start monitoring**. Cannot be dismissed while data is missing. |
| M2 | Add node | Stepper, 5 steps (V7) |
| M3 | Edit node | Sectioned form |
| M4 | Delete node | Type-to-confirm |
| M5 | **Recompute confirmation** | "Changing the tank dimensions recomputes level and volume for the entire history. Continue?" Radios: **Recompute the whole history** · **Apply from now on only**. Footnote: "Readings are stored as distance, so history is recalculated when displayed." Buttons: outline Cancel, primary **Apply change**. |
| M6 | Session expired | Single primary button |

### H · Empty, error and loading states (all views)

Centred, 60px icon bubble + H2 (20px) + one sentence on what happened and the fix + a primary button. Examples: "No readings in this window. Choose a wider time range." · "Could not load tanks. Check your connection and retry." · "Awaiting first reading. The first uplink usually arrives within 5 minutes."

## 15. Explanation layer (the signature UX pattern)

Every view teaches itself. Build these as real components.

- **View guide** (top of each view, §12.5): tag line "UNDERSTAND THIS VIEW" (10px/700, tracking 1.2px, `--brand-600`) → H2 posing the user's question → one-paragraph description (13px/1.8, max 100ch) → **three numbered step cards** in a 3-column grid (gap 14, margin 18px 0; cards `--bg-card`, border 1px `--bd-step`, radius 8, padding 16, 14px/1.6 `--tx-step`, shadow 0 3px 8px rgba(0,0,0,.03), hover lift −2px; number badge 23×23 circle `--brand-600`, #fff 700, margin-bottom 10; 1 column at ≤1250px with inline badge) → "How to read it:" line (13px/1.8, top border 1px, padding-top 12). On the Overview it collapses to a one-line bar.
- **Field help**, **chart explainer** above every plot (H3 question + 12px/1.8 answer), **sample definitions** under every KPI, a **glossary** (8 terms), the **context bar** and the **mode line**.

Tone: second person, plain verbs, define the unit, say what blank/zero/missing mean, say what the chart does not prove.

**Guide copy per view**

| View | H2 question | Description | Steps | How to read it |
|---|---|---|---|---|
| V1 | Which tank needs attention first? | Each card is one rooftop tank. A sensor on the lid measures the distance down to the water; OHTMS turns that into level, litres and percent full using the dimensions your admin entered. | 1 Scan the cards for amber, red or a dash. 2 Click a heatmap cell to zoom every chart to that hour. 3 Open a tank to see its history and raw readings. | Percent full is water level divided by tank height. A larger sensor distance means less water. A dash means no trustworthy reading; it is never shown as zero. |
| V2 | What has this tank done, and can I trust its sensor? | One tank in detail: today's reading, what it did over the selected window, and the raw values behind it. | 1 Check the current reading and node status. 2 Read the level chart for fills, drains and threshold crossings. 3 Open the raw inspector if a value looks wrong. | Shaded green bands are fill events; shaded brown bands are drain events. Gaps in the line mean no data. |
| V3 | How much water are we using? | Compare tanks over one window: how much they drained, how much was pumped in, and how steady they were. | 1 Pick a window. 2 Compare rows in the table. 3 Use the daily bars to spot recurring peaks. | Consumption counts water leaving the tank (level falling). Inflow counts water entering (level rising). |
| V4 | What needs attention? | Every alert, newest first, with who responded and what they did. | 1 Filter by level, tank or state. 2 Open an alert for evidence and sensor health. 3 Acknowledge it once you are handling it. | An active alert is still open; acknowledged means someone is on it; resolved means the condition cleared. |
| V5 | Is this alert real? | The reading that triggered the alert, the sensor's health, and the response so far. | 1 Read the sensor-health verdict. 2 Check the chart around the event. 3 Record your action and acknowledge. | The dotted line is the threshold that was crossed. |
| V6 | How should tanks and alerts be configured? | Thresholds decide when alerts fire. Dimensions decide how distance becomes litres. | 1 Choose a tank. 2 Adjust thresholds and watch the preview. 3 Save. | Persistence is how many readings in a row must cross a threshold, which prevents noise. |
| V7 | Which nodes are installed? | The sensor nodes on each tank and their status. | 1 Add a node in five steps. 2 Set its status while it is serviced. 3 Delete only when it is retired. | Deleting hides a node and keeps its history for 90 days. |

**Chart explainers (examples):** Heatmap — "When does the fill level run low?" "Each cell is the average fill for one hour. Dark cells are nearly empty, bright cells nearly full. Blank means no data, not zero." · Trend — "How have all tanks moved?" "Each line is one tank's water level in percent. Drag to zoom into any period." · Level chart — "Did the pump keep up?" "Green shading marks fill events. Brown shading marks drains." · Daily bars — "Which tank uses the most water?" "Each bar is the litres that left a tank on that day." · Raw distance — "What did the sensor actually report?" "The axis is upside-down on purpose: a larger distance means less water, so the line moves the way the water does."

**Glossary (8 terms per view, chosen from Part 14):** Distance, Level, Fill %, Dead zone, Threshold, Uplink, RSSI / SNR, f_cnt on V1–V4; Dead zone, Threshold, Persistence, Cooldown, Level, Device EUI, Maintenance, Acknowledge on V6–V7. The full 19-term list lives on V10.

## 16. Motion and interaction

```css
@keyframes pulseGlow{0%{box-shadow:0 0 0 0 rgba(242,101,34,.7)}70%{box-shadow:0 0 0 10px rgba(242,101,34,0)}100%{box-shadow:0 0 0 0 rgba(242,101,34,0)}}
@keyframes float{0%{transform:translateY(0) rotateX(0) rotateY(0)}50%{transform:translateY(-15px) rotateX(2deg) rotateY(-2deg)}100%{transform:translateY(0) rotateX(0) rotateY(0)}}
@keyframes revealUp{to{opacity:1;transform:translateY(0)}}
@keyframes revealRight{to{opacity:1;transform:translateX(0)}}
@keyframes waveA{from{transform:translateX(0)}to{transform:translateX(-60px)}}      /* 6s linear infinite */
@keyframes waveB{from{transform:translateX(-60px)}to{transform:translateX(0)}}      /* 9s linear infinite */
@keyframes shimmer{from{background-position:-200% 0}to{background-position:200% 0}} /* 1.4s linear infinite */
.reveal-up{opacity:0;transform:translateY(40px);animation:revealUp 1s var(--ease) forwards}
.reveal-up-delayed{animation-delay:.3s}
.reveal-right{opacity:0;transform:translateX(40px);animation:revealRight 1s var(--ease) .5s forwards}
```

- **Pulse rings take the colour of their dot** (parameterise via `currentColor`): `--live` on the nav dot, severity colour on Emergency chips, `--accent-500` on the bell dot.
- **Page-load choreography [E]:** hero text reveals up at 0s, glass card reveals from the right at .5s; the shell and workspace do not animate.
- **Ambient:** glass card float 6s; tank water waves 6s and 9s; no marquee anywhere.
- **Hover:** primary/teal/CTA buttons lift −2px with a deeper shadow; tabs −2px; KPI boxes −3px; guide steps −2px; **standard cards and tank tiles never move** (shadow + border only); project logo scales 1.05; footer logo goes grey→colour; nav links brighten with a soft white glow.
- **Transitions:** UI .3s ease; tabs and guide steps .2s ease; cards .4s ease-out-quart; water level tween 1.2s ease-out-quart; reveals 1s.
- **Scroll:** cards fade/slide in 16px once on entering the viewport (.6s, IntersectionObserver, threshold .1).
- **Tab change:** smooth-scroll to the workspace; 200ms fade between views.
- **Data refresh:** charts update in place (no animation) using a request token so stale responses never overwrite newer ones; the status line shows Loading… → Live · updated hh:mm; a changed tile value flashes its percent once (background `--bg-pill`, .6s). Errors show the banner, keep the last good data and set the status to "View unavailable — check selection".
- **Ripple:** primary buttons emit a .6s radial ripple from the click point.
- **Reduced motion:** `@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.reveal-up,.reveal-right,.reveal-up-delayed{opacity:1;transform:none}}` — the `!important` here is the second and last allowed exception. Water appears static at its level; the Emergency pulse is replaced by a solid 2px outline.

## 17. Responsive behaviour

Breakpoints: **≥1650** (large) · **≤1250** (compact) · **≤800** (mobile; chart-height rules use 780). **Tank grid only** also uses the project's 1280 / 1024 / 768 steps (§12.2). Mobile-first is required for operators (Priya and Suresh use phones).

| Module | ≥1650 | Default (1250–1649) | ≤1250 | ≤800 |
|---|---|---|---|---|
| Workspace padding | 40 | 40 | 25 | 16 |
| Card padding | 30 | 30 | 30 | 16 |
| Tank grid | 5 cols | 5 cols (3 below 1280) | 3 cols, 2 below 1024 | 1 col, horizontal tile |
| View-guide steps | 3 cols | 3 cols | 1 col, inline badge | 1 col, gap 8 |
| Two-up grids | 2 cols | 2 cols | 2 cols | 1 col |
| KPI row | 3 cols | 3 cols | 3 cols | 1 col |
| Tank detail top row | 2fr 1fr | 2fr 1fr | 1 col | 1 col |
| Header | sticky | sticky | sticky | static, wraps, logo 60px |
| Alert banner | sticky under nav | sticky under nav | sticky under nav | **sticky at top:0**, bell inside |
| Mega nav | full | full | full | scrolls horizontally |
| Hero | 2 col | 2 col | 2 col | stacked, glass card hidden, 32/20/14px |
| Tab bar | pills in a row | row | row | logo hidden, pills wrap |
| Control panel | one row | one row | wraps | groups 140px min, actions full width |
| Chart heights | 440 / 330 | same | same | 350 / 300 |
| Footer | row | row | row | wraps, gap 12 |

Also at ≤800: dl grids become one column; tables and code scroll inside their own containers; the page body never scrolls sideways. At 1920, 1440, 1024, 768 and 375px layouts must hold with no horizontal page scroll.

## 18. Accessibility, performance, SEO

- **Landmarks:** header, nav (aria-label), main#workspace, footer. Exactly one H1 per page (§10.4).
- **Skip link, focus, keyboard:** working skip link; 3px `--focus` outline offset 3px; tabs reachable and `aria-current='page'`; Enter submits panels; segmented controls use arrow keys; Esc closes menus, drawers and modals; modals trap focus.
- **Live regions:** the status line is `role='status' aria-live='polite'`; the alert banner announces new alerts (Emergency `assertive`); error banner `role='alert'`.
- **Labels:** every control has a visible `<label for>`; icon-only buttons have `aria-label` and `title`; every chart has an `aria-label` plus a text alternative (the explainer and a data-table toggle); the tank SVG has the label in §12.3.
- **Colour independence:** severity, state and status always pair colour with an icon and a word (Part 10.8). Tank series are distinguishable by legend and tooltip, not by colour alone. All text passes WCAG AA in both themes. `--accent-500` on white is about 3.2:1, so use it for large or bold eyebrows, icons and fills; use `--accent-700` for small text on white.
- **Motion:** honour reduced motion (§16); no content is conveyed by motion alone.
- **Performance:** self-hosted fonts with `display:swap`; ECharts tree-shaken and loaded per route; reserve chart heights; downsample to the 1-hour aggregates above 36 h; images lazy and sized; no layout shift from the sticky chrome; target Lighthouse ≥ 90 for performance, accessibility and best practices.
- **Privacy and security [P: Part 11]:** no tracking or analytics scripts; no third-party CDN; no secrets in frontend code; all API routes authenticated except `/health`; CORS restricted to the dashboard domain.
- **PWA-ready:** a manifest and a service worker caching the last-known state for offline viewing (a "Last known state" banner when offline). Push notifications stay a reserved slot.
- **SEO/meta:** title "MAMS Hospital | OHTMS"; meta description; favicon; `theme-color` = `--brand-800`; Open Graph tags.

## 19. Content and microcopy rules

- **Labels name what users understand:** "Fill level", "Distance to water", "Last uplink", "What did you do?". Tabs are numbered and plain.
- **Buttons are verbs in sentence case** and keep the same name through the flow: "Acknowledge", "Resolve", "Show results", "Add node", "Save changes". The success toast repeats the verb: "Alert acknowledged.", "Node added.", "Changes saved."
- **Eyebrows** are UPPERCASE noun phrases with an icon. **H1/H2** are plain statements or questions, never slogans.
- **Numbers:** units with every value ("202 cm", "3,079 L", "32.7 %", "−84 dBm"); en dashes for ranges; `·` as the separator in context strings; `—` for missing; the timezone is stated.
- **Time:** relative ("2 min ago") with the absolute time on hover in IST and UTC; formats "26 Oct, 14:05 IST" and, in raw tables, "26 Oct 14:05:48".
- **Status text:** Loading… → Live · updated 19:51 IST; errors say what failed and how to fix it. Errors never apologise and are never vague.
- **Alert messages** use the registry titles (§14 V4): short, name the tank, state the fix.
- **Empty states** invite an action. **Honesty copy** says what a chart does not prove: "One tank's week does not predict next week's demand."
- **Hero and banner copy:** short, concrete, evidence-based; no superlatives without a number.

## 20. Components the original lacked, built in OHTMS-DS style [D]

When a view needs one of these, build it from existing tokens exactly as below.

- **Dropdown menu (mega-nav, bell, user):** panel at top:100%, min-width 260, `--bg-card`, radius 12, padding 8, border 1px `--bd`, shadow `--sh-shell`, 3px `--accent-500` top line, z `--z-dropdown`. Items: padding 10px 14px, radius 8, 14px/500 `--tx-main`, 32px icon tile; hover `--bg-subtle` + `--tx-head`. Fade + translateY(8px→0) in .2s; opens on hover, focus and click; `aria-expanded`; Esc closes.
- **Bell panel:** dropdown width 360; header "Alerts · N active" with a "View all" link; up to 5 rows (severity chip, title, relative time, **Acknowledge** small button for Operator and Admin); footer "Open alert log". The bell button shows a **count badge** (16px circle, `--accent-500`, #fff 700 10px, top-right) and the 8px pulsing dot when anything is Active.
- **Modal:** overlay rgba(0,31,63,.55) with blur 4px, z `--z-modal`; panel `--bg-card`, radius 16, padding 30, max-width 560 (720 for M1/M2), shadow `--sh-shell`; header = eyebrow + H2 (24px) + 36px icon-only close; footer actions right-aligned, gap 12 (outline Cancel + primary). Opens with .3s fade + scale .96→1; traps focus; Esc closes unless the modal is mandatory (M1).
- **Toast:** fixed bottom-right 24px, stack gap 12, z `--z-toast`; `--bg-card`, radius 12, padding 14px 18px, border 1px `--bd`, 4px left bar in the status colour, shadow `--sh-shell`; icon + 14px/600 title + 12.8px text; auto-dismiss 5s; `role='status'` (errors `role='alert'`, no auto-dismiss).
- **Tooltip:** `--bg-code`, #fff 12px/1.5, radius 6, padding 6px 10px, max-width 240, 150ms delay, 6px arrow. Used for absolute timestamps, lock reasons ("Admin only"), "Phase 2".
- **Skeleton loader:** shimmer from `--bd-soft` to `--bg-subtle`, 1.4s linear infinite, radius mirrors the real element; plot skeleton = a `--bg-plot` rectangle at the final height; tile skeleton keeps the SVG area.
- **Empty / error / locked state:** centred; 60px icon bubble; H2 20px; one sentence; primary button. The **locked** variant uses `fa-lock` in the bubble and a `PHASE n` chip and has no button.
- **Phase chip:** pill, 10px/700 UPPERCASE `--neutral-tx` on `--neutral-bg`, dashed `--neutral-bd` border, text "PHASE 2" or "PHASE 3".
- **Pagination:** 36×36 outline buttons, radius 8, gap 8; active uses the active-tab style; rows-per-page compact select at the left.
- **Breadcrumbs:** 12px `--tx-soft`, chevron separators, current item 700 `--tx-head`.
- **Progress bar:** height 8, radius 4, track `--bd-soft`, fill `--g-ocean` (completeness uses the status colours); label 11px above.
- **Stepper:** 23px numbered circles in `--brand-600` (reuse the guide-step badge), 2px `--bd` connectors; current step `--accent-500`; completed steps show a check; vertical variant for the alert lifecycle.
- **Switch / checkbox / radio:** `accent-color:var(--brand-600)`; switch 40×22, track `--bd-strong` turning `--brand-600`; focus ring per §4.
- **Secondary tabs (inside cards, e.g. Administration):** underline style, 15.2px/600, active 3px `--accent-500` underline.
- **Back-to-top:** 44px circle, `--brand-800`, white icon, bottom-right 24px, appears after 600px scroll.
- **Kiosk mode (FULL):** `?kiosk=1` hides the strip, header, nav, hero and tabs; shows the alert banner (not sticky) and the tank grid at 1.25× with a clock; Esc exits.
- **Print:** hide header, nav, banner, tabs and controls; cards lose shadows; plots keep full width.

## 21. Anti-patterns and known flaws [F] (do not reproduce)

**Never**

- Use a purple-on-white AI look, Poppins/Roboto/system fonts as the main UI font, emoji as icons, or pure black (#000) text.
- Put hex values in component CSS (chart theme reads tokens at runtime), use inline styles, `!important` beyond the two allowed exceptions, or one-off radii and shadows.
- Lift standard cards or tank tiles on hover; animate the app shell; add bouncy easings; use a marquee for alerts.
- **Show distance as if it were level**, show a missing or faulty reading as 0, "??" or an empty tank, or let a simulated value appear without a SIM chip.
- Plot a distance series on a normal (non-inverted) axis.
- Use the orange accent for severity, or colour the same action differently on different pages.
- Colour a tank by its position in the list (colour belongs to `colorIndex`).
- Ship lorem ipsum, dead links, or non-working controls (reserved slots are disabled, labelled and locked on purpose).
- Add features, pages, scores or integrations that are not in §7.4.

**Flaws found in the original, now fixed:** three stylesheets fighting with `!important` (build one layered sheet); classes used but never styled (particles, ripple, tilt, float, dropdown…, all implemented here); dead utility links (all work); duplicated About/Team markup; heavy inline styles; a pulse ring that was always orange; charts using a different font from the page; dropdown carets with no menus.

## 22. Build process, deliverables and acceptance checklist

**Process**

- **Plan (≤ 1 page):** sitemap, module→page map, flags, assumptions.
- **Scaffold (Next.js App Router, TypeScript):**
  `apps/web/app/(auth)/login` · `apps/web/app/(app)/{dashboard,tanks/[id],analytics,alerts,alerts/[id],settings,admin/{nodes,users,audit},about}` · `apps/web/styles/{tokens,base,layout,components,views,utilities}.css` · `apps/web/lib/{api,state,charts,format,derive,copy}.ts` · `apps/web/lib/mock/` (seed generator and adapter) · `packages/ui` (TankSVG, StatCard, chips, modal, toast) · `packages/types` · `public/` (logos, vendor licence for colour scales).
- **Build order:** tokens → base → utility strip + header + nav + alert banner → hero → shell + tabs → controls, fields, buttons → cards, tiles and callouts → TankSVG → charts and tables → each view (V1, V2, V4–V5, V3, V6, V7–V9, V10, V11) → guidance layer → motion → responsive → accessibility → dark/light parity.
- **Data layer:** single `get()` helper with error mapping; request token (epoch) so only the latest response renders; SWR polling every 15 s; derived values computed in one pure module (`derive.ts`) with the §2 unit test; URL-synced state for every control; mock adapter honouring `DATA_SOURCE`; role from the session.
- **Self-audit:** run the checklist below, mark each PASS/FAIL, fix every FAIL, then deliver.
- **Final message:** file tree, how to run, assumptions, and any deviation from this spec with a reason (there should be none).

**Acceptance checklist (all must pass)**

- ☐ Fonts: Merriweather only on H1–H3 and eyebrows; Inter everywhere else; sizes match §5.
- ☐ Every colour, radius, shadow and duration resolves to a token; no inline styles; no `!important` except `[hidden]` and the reduced-motion rule.
- ☐ Chrome order and heights match §7.1; header, nav and alert banner sticky; backdrop blur 20px; alert banner sticky at top 0 on mobile.
- ☐ Home icon is the first nav item; bell and user menu at the far right.
- ☐ Overview: hero 56/24/17.6px text, glass card with float, wave divider filled with `--bg-page`, shell overlaps by 20px; other views start 30px below the nav; tank tiles directly follow the page header.
- ☐ Tab bar: six numbered pills, active = `--brand-600`, hover lift −2px, `aria-current` set, role-gated.
- ☐ Tank tiles: 5-up grid with the §12.2 anatomy; fault shows "—" not zero; simulated tiles show SIM; the SVG shows beam, distance, thresholds, dead zone and animated water.
- ☐ **Distance charts use an inverted axis; level charts do not.**
- ☐ Alert banner shows every active alert as a chip in severity order, an all-clear state, no marquee, Emergency pulse.
- ☐ Control panel: `--bg-panel`, 12px radius, bottom-aligned fields, share icon at the right end; day selector, presets, brush and heatmap click stay synchronised and in the URL.
- ☐ Cards: 16px radius, 30px padding, 30px gaps; hover changes shadow and border only.
- ☐ Buttons match §11.2; focus ring is amber 3px; reserved slots show lock + phase chip.
- ☐ Charts use the §13 theme, scales, fixed limits, sizes (440/330/260), units and footnotes; the week heatmap leaves missing hours blank.
- ☐ Tables right-align numbers, tabular figures, em dash for missing, fixed decimals per §5.
- ☐ Every view has: guide, field help, context bar, per-chart explainers, glossary.
- ☐ Status line is live; errors use the banner; stale responses never overwrite newer ones.
- ☐ URL deep-link restores the view and all control values; Share copies it.
- ☐ Dark theme is the default, light theme is complete, contrast passes AA in both.
- ☐ Responsive results match §17 at 1920, 1440, 1024, 768 and 375px; no horizontal page scroll.
- ☐ Reduced motion removes all animation.
- ☐ Lighthouse ≥ 90 (performance, accessibility, best practices); one H1 per page.
- ☐ Every row of §7.4 maps to a component; no extra features exist.

## 23. Customisation knobs (the only things to change between projects)

### 23.1 Palette presets (edit the token values in §4; names stay)

| Token | A Ocean (used) | B Emerald | C Violet | D Crimson | E Graphite |
|---|---|---|---|---|---|
| --brand-950 | #001f3f | #052e22 | #1e1b4b | #450a0a | #0f172a |
| --brand-800 | #003b6d | #064e3b | #312e81 | #7f1d1d | #1e293b |
| --brand-700 | #004d80 | #047857 | #4338ca | #991b1b | #334155 |
| --brand-600 | #1a5594 | #0f766e | #4f46e5 | #b91c1c | #2563eb |
| --brand-500 | #0073bc | #10b981 | #6366f1 | #dc2626 | #3b82f6 |
| --accent-500 | #f26522 | #f59e0b | #f43f5e | #0ea5e9 | #f97316 |
| --accent-600 | #e05310 | #d97706 | #e11d48 | #0284c7 | #ea580c |
| --accent-700 | #d84b04 | #b45309 | #be123c | #0369a1 | #c2410c |
| --gold-500 | #e2a84a | #fcd34d | #fbbf24 | #fbbf24 | #fbbf24 |
| --data-600 | #087e83 | #0e7490 | #0891b2 | #0f766e | #0d9488 |
| --data-700 | #06666a | #155e75 | #0e7490 | #115e59 | #0f766e |

After any swap: recompute every hard-coded `rgba()` inside `--g-*`, `--sh-*` and the hero overlay from the new base colours; keep the status sets and `--emg-bg` fixed; keep teal as the water colour unless the whole palette changes; re-check contrast in both themes.

### 23.2 Module flags

| Flag | Off means |
|---|---|
| INSTITUTION_STRIP | Remove the strip; keep the freshness pill inside the alert banner |
| HEADER_LOGO_PAIR | One logo and title; no right-hand OHTMS mark |
| ALERT_BANNER | Not recommended: a hospital must never lose its always-visible alert surface |
| HERO / HERO_GLASS_CARD / PARTICLES / WAVE_DIVIDER | Remove the hero; the shell then starts under the nav with margin-top 30px and no overlap; or keep the hero without the card, particles or wave |
| WORKSPACE_TABS | Single-view app; navigation moves entirely to the mega-nav |
| GUIDANCE_LAYER | Hide guides and explainers; keep field help and status |
| ABOUT_PAGE | Remove the nav link and view (methodology then needs another home) |
| FOOTER | Remove (not recommended) |
| DARK_MODE | Off removes the dark token set and the toggle; default theme becomes light |
| SCOPE | `PHASE_1` (default) or `FULL` (§7.4) |

### 23.3 Quick recipes (append one line to the brief)

- **Change the accent only:** "Replace `--accent-*` with #10b981 / #059669 / #047857."
- **Change fonts:** "Display font = Playfair Display, UI font = Manrope; keep every size."
- **Sharper or rounder:** override `--r-2xl` (cards) and `--r-xl` (panels), e.g. 8px/6px or 24px/16px.
- **Denser layout:** `--card-pad:20px; --work-pad:24px; --panel-pad:14px` and grid gaps 20px.
- **Calmer motion:** "Disable particles and the glass float; keep reveals and the tank water."
- **Control-room wall display:** "Use `?kiosk=1` as the default route; dark theme; tile scale 1.25."

## END PROMPT

*Usage tip: send the whole prompt as one message. If the agent stops partway, reply "Continue from the last completed view" rather than restarting, and ask it to confirm it still holds the §4 token block.*

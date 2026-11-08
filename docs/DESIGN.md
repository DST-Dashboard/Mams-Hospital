# Design system — "hydrographic chart"

A control-room instrument, not a SaaS template. Deep harbour water, graduated measuring cylinders, hairline rules instead of card boxes, one decorative motion (the water surface).

**Tokens** live in `src/styles/tokens.css` (RGB channels so Tailwind alpha works). Never hard-code a colour.
| Token | Dark | Light | Use |
|---|---|---|---|
| bg / surface / raised / line | `9 24 31` / `15 36 45` / `22 49 60` / `38 70 80` | `238 243 241` / `247 250 249` / `255 255 255` / `201 215 213` | page, panel, hover, hairline |
| ink / muted | `231 241 238` / `140 168 168` | `14 38 46` / `84 110 114` | text |
| tide | `62 182 201` | `12 124 150` | water, primary action |
| ok / warn / crit / emerg / info | `108 196 154` / `240 185 74` / `238 122 92` / `229 72 77` / `138 160 235` | AA-darkened variants | status |

**Type:** Schibsted Grotesk Variable (self-hosted). Numbers use `.num` (tabular). Scale: 44 px hero readout · 28 page title · 15 body · 12–13 meta. No all-caps eyebrow labels, no middle-dot meta strings.
**Layout:** left rail 220 px (top bar on mobile); content max 1500 px; tanks as columns separated by hairlines (5 across ≥ 1280, 3 ≥ 768, 1 below).
**Shape:** radius 4 / 8 / 14. Borders `1 px` hairline. Focus ring = 2 px bg gap + 2 px tide.
**Motion:** water level eases 900 ms; surface drifts 7 s; everything off under `prefers-reduced-motion`.
**Status is never colour alone:** icon + word + colour (`components/status/badges.tsx`).
**Tank cylinder:** graduations every 10 %, labels at 0/50/100 on the right; warn/crit/empty as dashed coloured rules on the left; `?` and empty vessel when no data.
**Charts:** ECharts, level % up = more water; thresholds as mark lines; gaps stay gaps; theme read from tokens at draw time.
**Don't:** gradients on text, glassmorphism, neon on near-black, identical rounded cards in a grid, emoji as icons, centered-everything.

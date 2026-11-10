# Rules for AI-generated frontend code

These rules govern all front-end contributions across Prompts 1, 2, and 3. **Paste the preamble below at the top of every AI coding prompt.**

## Preamble (copy-paste)
```
You are writing ONE file for an existing Next.js 15 (App Router) + React 19 + TypeScript (strict) project using the OHTMS-DS Design System.
Return the COMPLETE file, nothing else. Do not invent dependencies; allowed: react, next, swr, zustand, echarts, clsx, lucide-react.
- Client components start with "use client". Path alias "@/" = src/.
- Data: only via SWR hooks in "@/lib/hooks" or fetcher/post/put/patch/del in "@/lib/api". NEVER import from "@/server/*" except `import type`. No direct fetch() in components.
- Types: import API types from "@/contracts" and "@/lib/types". Never redefine them.
- Colours & Tokens: ONLY CSS custom properties defined in "@/styles/tokens.css" (var(--brand-*), var(--accent-*), var(--data-*), etc.) or shared design-system classes (btn, card, kpi, plot, chip, etc.). No hex or rgb() literals in component code or CSS.
- Fonts: Display = Merriweather (var(--f-display)), UI = Inter (var(--f-ui)), Mono = Menlo (var(--f-mono)).
- Icons: lucide-react mapped via `ICON` in "@/components/ui/icons".
- Numbers use className="num" (tabular figures). Formats via "@/lib/format" (fmtFill, fmtLitres, fmtCm, stamp, ago) and the tz from useUi().
- Missing data is null → render "—" or a chart gap. Never 0.
- Every screen handles loading (Skeleton), empty (EmptyState), error (ErrorState with retry), keyboard access, aria labels, and passes WCAG AA at 375px and 1440px in both light (default) and dark themes. Respect prefers-reduced-motion.
- Status = icon + text + colour, never colour alone.
- Both Day (24h) and Week (7d) views co-exist; time window state is kept in the URL via "@/lib/windows".
```

## Where generated files go
Screen body → `src/features/<area>/X.tsx` · route wrapper → `src/app/(app)/<route>/page.tsx` (thin: metadata + the feature component) · reusable atom → `src/components/ui|status|charts/`.

## Review checklist before committing AI output
- [ ] `npm run typecheck && npm run lint` pass; strict TypeScript, no `any`; no unexpected dependency in `package.json`
- [ ] No hex colour literals in UI code or CSS
- [ ] No `fetch(` outside `src/lib/`
- [ ] Tested and verified in light (default) and dark themes
- [ ] Responsive across 375px, 768px, 1024px, 1440px, 1920px with zero horizontal scroll
- [ ] Tab through with keyboard; focus visible ring (3px amber) present
- [ ] Loading, empty, and error states properly handled
- [ ] Works with live API and with `x-mock: 1` sample data badges

# Rules for AI-generated frontend code

You'll generate UI with other AI tools. These rules stop them from breaking the architecture. **Paste the preamble below at the top of every prompt, then add the screen spec.**

## Preamble (copy-paste)
```
You are writing ONE file for an existing Next.js 15 (App Router) + React 19 + TypeScript (strict) + Tailwind 3 project.
Return the COMPLETE file, nothing else. Do not invent dependencies; allowed: react, next, swr, zustand, echarts, clsx, lucide-react.
- Client components start with "use client". Path alias "@/" = src/.
- Data: only via SWR hooks in "@/lib/hooks" or fetcher/post in "@/lib/api". NEVER import from "@/server/*" except `import type`. No fetch() in components.
- Types: import API types from "@/contracts" and "@/lib/types". Do not redefine them.
- Colours: ONLY Tailwind token classes (bg-bg, bg-surface, bg-raised, border-line / .hairline, text-ink, text-muted, text-tide, text-ok, text-warn, text-crit, text-emerg). No hex, no arbitrary colours.
- Numbers use className="num". Times via "@/lib/format" (stamp, ago) and the tz from useUi().
- Missing data is null → render "—" or a chart gap. Never 0.
- Every screen needs loading (Skeleton), empty (EmptyState), error (ErrorState with retry), keyboard access, aria labels, and works at 375px and 1440px. Respect prefers-reduced-motion.
- Status = icon + text + colour, never colour alone.
- Design: hydrographic-chart control-room look (see docs/DESIGN.md). No glassmorphism, no gradient text, no neon, no identical card grids.
```

## Where generated files go
Screen body → `src/features/<area>/X.tsx` · route wrapper → `src/app/(app)/<route>/page.tsx` (thin: metadata + the feature component) · reusable atom → `src/components/ui|status|charts/`.

## Review checklist before committing AI output
- [ ] `npm run typecheck && npm run lint` pass; no `any`; no new dependency in `package.json`
- [ ] No colour literals (`grep -rn "#[0-9a-fA-F]\{3,6\}" src/features src/components`)
- [ ] No `fetch(` outside `src/lib/`
- [ ] Looks right in dark **and** light, at 375 px and 1440 px
- [ ] Tab through it; screen-reader labels present
- [ ] Loading, empty, error states actually reachable (test by killing the API)
- [ ] It works when the response header is `x-mock: 1` AND when the real endpoint ships (same contract)

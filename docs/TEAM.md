# Team split

| | **Frontend (you)** | **Backend & integrations (teammate)** |
|---|---|---|
| Mission | Premium, accessible, fast UI. Every screen, every state. | Correct data, reliable alerts, secure API, live hardware, deployment. |
| Owns (paths) | `src/app/(app)/**` `src/app/login` `src/app/kiosk` `src/app/*.tsx` `src/features/**` `src/components/**` `src/lib/**` `src/styles/**` `public/**` `e2e/**` `playwright.config.ts` | `src/app/api/**` `src/server/**` `src/domain/**` `src/analytics/**` `src/dataset/**` `scripts/**` `data/**` `infra/**` `tests/**` `Dockerfile` `docker-compose.yml` `.github/workflows/**` |
| Shared (both approve) | `src/contracts/**` · `package.json` / lock · `docs/API-CONTRACT.md` · `.env.example` · `tailwind.config.ts` (tokens) · `.eslintrc.json` | ← same |
| Never touches | `src/server/**`, `src/domain/**` (call the API instead) | `src/features/**`, `src/components/**` (ask for a contract change instead) |

## The 4 rules that make parallel work possible
1. **Contract first.** A new or changed endpoint starts as a PR to `src/contracts/*` (zod schema + fixture). Both approve. Then backend implements and frontend consumes. Nobody codes against an undocumented shape.
2. **Mocks keep you unblocked.** With `ENABLE_MOCKS=1` (default in `.env.example`) every unbuilt endpoint returns contract-valid sample data with header `x-mock: 1`. The backend removes the `mockOr501(...)` call when the real endpoint lands; the fixture becomes a test fixture. **If the response has `x-mock: 1`, it is fake.**
3. **Stay in your lane by path.** `.github/CODEOWNERS` enforces it: PRs touching the other person's paths need their approval.
4. **`main` is always green.** CI = typecheck + lint + tests + build. No direct pushes to `main`.

## What each of you must send the other
- **Backend → Frontend:** when an endpoint goes from mock to real (post in chat + tick `docs/API-CONTRACT.md`); any contract change (PR); real tank dimensions once known.
- **Frontend → Backend:** any need for a new field/endpoint (PR to contracts, not a chat message); UX rules that affect data (e.g. "heatmap needs IST hours").

## Teammate onboarding (send him this)
1. Clone `https://github.com/DST-Dashboard/Mams-Hospital.git`, `nvm use`, `npm install`, `cp .env.example .env`, `npm run setup`, `npm run dev`; sign in as `admin@mams.local`.
2. Read, in order: `README.md` → `docs/ARCHITECTURE.md` → `docs/DATA.md` → `docs/ALERTING.md` → `docs/API-CONTRACT.md` → `docs/TASKS.md` (the BE-xx rows).
3. Start with **BE-01** (migrations), then **BE-02** (alerts API + engine). Everything the frontend needs first is there.
4. **Answer these (they block correctness):** real tank height / radius (or W×L) / dead zone per tank · which nodes are real vs simulated · hosting target (VPS with persistent disk recommended) · email provider for alerts (SMTP/SendGrid) and SMS/WhatsApp choice.

## Your onboarding (frontend)
Same setup. Read `docs/DESIGN.md`, `docs/SCREENS.md`, `docs/AI-FRONTEND-RULES.md`, `docs/API-CONTRACT.md`. Start with **FE-01** (UI kit) and **FE-07 DimensionsModal** — the API for it is live today and it unlocks real percentages and alerts for everyone.

## Definition of done (any task)
Typecheck, lint, tests pass · contract updated · loading / empty / error states exist (frontend) · audit + role check present (backend writes) · no hard-coded colours or `fetch` outside `lib/` · works at 375 px and 1440 px · keyboard + screen-reader labels (frontend).

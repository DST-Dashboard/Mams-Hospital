# Project structure

Generated map of every file with its **owner** and **status**.
Owner: `FE` frontend · `BE` backend/integrations · `SHARED` both approve · `BOTH` anyone.
Status: `BUILT` working · `MOCK` endpoint returns sample data until backend implements it · `STUB` page shows a placeholder · `TODO` file exists with a header describing what to build (`grep -rn "STATUS: TODO" src`).

```
├─ .github/
│  ├─ ISSUE_TEMPLATE/
│  │  └─ task.md   [BOTH · BUILT]
│  ├─ workflows/
│  │  └─ ci.yml   [BE · BUILT]
│  ├─ CODEOWNERS   [BOTH · BUILT]
│  └─ pull_request_template.md   [BOTH · BUILT]
├─ .vscode/
│  ├─ extensions.json   [BOTH · BUILT]
│  └─ settings.json   [BOTH · BUILT]
├─ data/
│  └─ processed/
│     ├─ readings/
│     │  └─ wio-e5-node-0{1..5}.json   [BE · BUILT]
│     ├─ devices.json   [BE · BUILT]
│     └─ manifest.json   [BE · BUILT]
├─ docs/
│  ├─ 00-project-definition.md   [BOTH · BUILT]
│  ├─ AI-FRONTEND-RULES.md   [BOTH · BUILT]
│  ├─ ALERTING.md   [BOTH · BUILT]
│  ├─ API-CONTRACT.md   [SHARED · BUILT]
│  ├─ ARCHITECTURE.md   [BOTH · BUILT]
│  ├─ DATA.md   [BOTH · BUILT]
│  ├─ DESIGN.md   [BOTH · BUILT]
│  ├─ FEATURES.md   [BOTH · BUILT]
│  ├─ GIT-WORKFLOW.md   [BOTH · BUILT]
│  ├─ RUNBOOK.md   [BOTH · BUILT]
│  ├─ SCREENS.md   [BOTH · BUILT]
│  ├─ TASKS.md   [BOTH · BUILT]
│  └─ TEAM.md   [BOTH · BUILT]
├─ e2e/
│  ├─ alert-ack.spec.ts   [FE · TODO]
│  ├─ dashboard.spec.ts   [FE · TODO]
│  ├─ login.spec.ts   [FE · TODO]
│  └─ node-crud.spec.ts   [FE · TODO]
├─ infra/
│  ├─ backup/
│  │  └─ cron.sh   [BE · TODO]
│  └─ Caddyfile   [BE · BUILT]
├─ public/
│  ├─ icons/
│  │  └─ .gitkeep   [FE · BUILT]
│  ├─ manifest.webmanifest   [FE · BUILT]
│  └─ sw.js   [FE · TODO]
├─ scripts/
│  ├─ backup-db.ts   [BE · TODO]
│  ├─ build-dataset.ts   [BE · BUILT]
│  ├─ export-fixtures.ts   [BE · TODO]
│  ├─ replay-alerts.ts   [BE · BUILT]
│  ├─ replay-check.ts   [BE · BUILT]
│  ├─ reset-admin.ts   [BE · BUILT]
│  ├─ restore-db.ts   [BE · TODO]
│  └─ seed-db.ts   [BE · BUILT]
├─ src/
│  ├─ analytics/
│  │  ├─ anomaly.ts   [BE · TODO]
│  │  ├─ compare.ts   [BE · TODO]
│  │  ├─ completeness.ts   [BE · TODO]
│  │  ├─ cost.ts   [BE · TODO]
│  │  ├─ events.ts   [BE · BUILT]
│  │  ├─ forecast.ts   [BE · BUILT]
│  │  ├─ heatmap.ts   [BE · TODO]
│  │  ├─ index.ts   [BE · BUILT]
│  │  ├─ leak.ts   [BE · TODO]
│  │  ├─ rollup.ts   [BE · BUILT]
│  │  └─ stats.ts   [BE · BUILT]
│  ├─ app/
│  │  ├─ (app)/
│  │  │  ├─ about/
│  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  ├─ admin/
│  │  │  │  ├─ audit/
│  │  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  │  ├─ nodes/
│  │  │  │  │  ├─ [id]/
│  │  │  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  │  │  ├─ deleted/
│  │  │  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  │  │  ├─ new/
│  │  │  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  │  ├─ system/
│  │  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  │  └─ users/
│  │  │  │     └─ page.tsx   [FE · STUB]
│  │  │  ├─ alerts/
│  │  │  │  ├─ [id]/
│  │  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  ├─ analytics/
│  │  │  │  ├─ compare/
│  │  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  │  ├─ playback/
│  │  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  │  ├─ reports/
│  │  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  ├─ dashboard/
│  │  │  │  └─ page.tsx   [FE · BUILT]
│  │  │  ├─ settings/
│  │  │  │  ├─ notifications/
│  │  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  │  ├─ thresholds/
│  │  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  │  └─ page.tsx   [FE · STUB]
│  │  │  ├─ tanks/
│  │  │  │  └─ [id]/
│  │  │  │     └─ page.tsx   [FE · BUILT]
│  │  │  └─ layout.tsx   [FE · BUILT]
│  │  ├─ api/
│  │  │  ├─ alerts/
│  │  │  │  ├─ [id]/
│  │  │  │  │  ├─ ack/
│  │  │  │  │  │  └─ route.ts   [BE · BUILT]
│  │  │  │  │  ├─ resolve/
│  │  │  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  │  │  ├─ snooze/
│  │  │  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  │  └─ route.ts   [BE · BUILT]
│  │  │  ├─ analytics/
│  │  │  │  ├─ compare/
│  │  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  │  └─ heatmap/
│  │  │  │     └─ route.ts   [BE · MOCK]
│  │  │  ├─ audit/
│  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  ├─ auth/
│  │  │  │  ├─ forgot/
│  │  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  │  ├─ login/
│  │  │  │  │  └─ route.ts   [BE · BUILT]
│  │  │  │  ├─ logout/
│  │  │  │  │  └─ route.ts   [BE · BUILT]
│  │  │  │  ├─ me/
│  │  │  │  │  └─ route.ts   [BE · BUILT]
│  │  │  │  ├─ password/
│  │  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  │  └─ reset/
│  │  │  │     └─ route.ts   [BE · MOCK]
│  │  │  ├─ dashboard/
│  │  │  │  └─ route.ts   [BE · BUILT]
│  │  │  ├─ health/
│  │  │  │  └─ route.ts   [BE · BUILT]
│  │  │  ├─ ingest/
│  │  │  │  └─ tts/
│  │  │  │     └─ route.ts   [BE · BUILT]
│  │  │  ├─ readings/
│  │  │  │  ├─ export/
│  │  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  │  └─ route.ts   [BE · BUILT]
│  │  │  ├─ reports/
│  │  │  │  ├─ incident/
│  │  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  │  ├─ monthly/
│  │  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  │  └─ weekly/
│  │  │  │     └─ route.ts   [BE · MOCK]
│  │  │  ├─ settings/
│  │  │  │  └─ notifications/
│  │  │  │     └─ route.ts   [BE · MOCK]
│  │  │  ├─ system/
│  │  │  │  └─ status/
│  │  │  │     └─ route.ts   [BE · MOCK]
│  │  │  ├─ tanks/
│  │  │  │  ├─ [id]/
│  │  │  │  │  ├─ analytics/
│  │  │  │  │  │  └─ route.ts   [BE · BUILT]
│  │  │  │  │  └─ route.ts   [BE · BUILT]
│  │  │  │  ├─ bulk/
│  │  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  │  ├─ clone/
│  │  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  │  ├─ export/
│  │  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  │  ├─ import/
│  │  │  │  │  └─ route.ts   [BE · MOCK]
│  │  │  │  └─ route.ts   [BE · BUILT]
│  │  │  └─ users/
│  │  │     ├─ [id]/
│  │  │     │  └─ route.ts   [BE · MOCK]
│  │  │     └─ route.ts   [BE · MOCK]
│  │  ├─ forgot-password/
│  │  │  └─ page.tsx   [FE · STUB]
│  │  ├─ kiosk/
│  │  │  └─ page.tsx   [FE · STUB]
│  │  ├─ login/
│  │  │  └─ page.tsx   [FE · BUILT]
│  │  ├─ reset-password/
│  │  │  └─ page.tsx   [FE · STUB]
│  │  ├─ error.tsx   [FE · BUILT]
│  │  ├─ layout.tsx   [FE · BUILT]
│  │  ├─ loading.tsx   [FE · BUILT]
│  │  ├─ not-found.tsx   [FE · BUILT]
│  │  └─ page.tsx   [FE · BUILT]
│  ├─ components/
│  │  ├─ charts/
│  │  │  ├─ EChart.tsx   [FE · BUILT]
│  │  │  ├─ Heatmap.tsx   [FE · TODO]
│  │  │  ├─ MultiTankChart.tsx   [FE · TODO]
│  │  │  ├─ Sparkline.tsx   [FE · TODO]
│  │  │  └─ TrendChart.tsx   [FE · BUILT]
│  │  ├─ status/
│  │  │  ├─ badges.tsx   [FE · BUILT]
│  │  │  ├─ BatteryIcon.tsx   [FE · TODO]
│  │  │  ├─ CompletenessMeter.tsx   [FE · TODO]
│  │  │  └─ SignalBars.tsx   [FE · TODO]
│  │  ├─ tank/
│  │  │  └─ TankSvg.tsx   [FE · BUILT]
│  │  └─ ui/
│  │     ├─ Button.tsx   [FE · TODO]
│  │     ├─ ConfirmDialog.tsx   [FE · TODO]
│  │     ├─ Dialog.tsx   [FE · TODO]
│  │     ├─ EmptyState.tsx   [FE · TODO]
│  │     ├─ Field.tsx   [FE · TODO]
│  │     ├─ primitives.tsx   [FE · STUB]
│  │     ├─ Select.tsx   [FE · TODO]
│  │     ├─ Table.tsx   [FE · TODO]
│  │     ├─ Tabs.tsx   [FE · TODO]
│  │     ├─ Toast.tsx   [FE · TODO]
│  │     └─ Tooltip.tsx   [FE · TODO]
│  ├─ contracts/
│  │  ├─ alerts.ts   [SHARED · BUILT]
│  │  ├─ analytics.ts   [SHARED · BUILT]
│  │  ├─ audit.ts   [SHARED · BUILT]
│  │  ├─ common.ts   [SHARED · BUILT]
│  │  ├─ fixtures.ts   [SHARED · BUILT]
│  │  ├─ index.ts   [SHARED · BUILT]
│  │  ├─ settings.ts   [SHARED · BUILT]
│  │  ├─ system.ts   [SHARED · BUILT]
│  │  ├─ tanks.ts   [SHARED · BUILT]
│  │  └─ users.ts   [SHARED · BUILT]
│  ├─ dataset/
│  │  ├─ files.ts   [BE · BUILT]
│  │  ├─ normalize.ts   [BE · BUILT]
│  │  ├─ schema.ts   [BE · BUILT]
│  │  └─ validate.ts   [BE · BUILT]
│  ├─ domain/
│  │  ├─ rules/
│  │  │  ├─ battery-low.ts   [BE · TODO]
│  │  │  ├─ data-gap.ts   [BE · TODO]
│  │  │  ├─ flapping.ts   [BE · TODO]
│  │  │  ├─ flatline.ts   [BE · TODO]
│  │  │  ├─ predicted-empty.ts   [BE · TODO]
│  │  │  └─ rapid-drain.ts   [BE · TODO]
│  │  ├─ alert-state.ts   [BE · TODO]
│  │  ├─ derive.ts   [BE · BUILT]
│  │  ├─ geometry.ts   [BE · BUILT]
│  │  ├─ index.ts   [BE · BUILT]
│  │  ├─ rules.ts   [BE · BUILT]
│  │  ├─ time.ts   [BE · BUILT]
│  │  └─ types.ts   [BE · BUILT]
│  ├─ features/
│  │  ├─ about/
│  │  │  ├─ Glossary.tsx   [FE · TODO]
│  │  │  ├─ Methodology.tsx   [FE · TODO]
│  │  │  └─ SystemDiagram.tsx   [FE · TODO]
│  │  ├─ alerts/
│  │  │  ├─ AckDialog.tsx   [FE · TODO]
│  │  │  ├─ AlertDetail.tsx   [FE · TODO]
│  │  │  ├─ AlertFilters.tsx   [FE · TODO]
│  │  │  ├─ AlertTable.tsx   [FE · TODO]
│  │  │  └─ SnoozeMenu.tsx   [FE · TODO]
│  │  ├─ analytics/
│  │  │  ├─ CompareView.tsx   [FE · TODO]
│  │  │  ├─ ConsumptionRanking.tsx   [FE · TODO]
│  │  │  ├─ Playback.tsx   [FE · TODO]
│  │  │  └─ ReportsList.tsx   [FE · TODO]
│  │  ├─ audit/
│  │  │  └─ AuditTable.tsx   [FE · TODO]
│  │  ├─ auth/
│  │  │  ├─ ChangePasswordForm.tsx   [FE · TODO]
│  │  │  ├─ ForgotForm.tsx   [FE · TODO]
│  │  │  └─ LoginForm.tsx   [FE · BUILT]
│  │  ├─ dashboard/
│  │  │  ├─ AllTanksTrend.tsx   [FE · TODO]
│  │  │  ├─ DashboardView.tsx   [FE · BUILT]
│  │  │  ├─ NodeHealthGrid.tsx   [FE · TODO]
│  │  │  └─ WeekHeatmap.tsx   [FE · TODO]
│  │  ├─ nodes-admin/
│  │  │  ├─ AddNodeWizard/
│  │  │  │  ├─ Dimensions.tsx   [FE · TODO]
│  │  │  │  ├─ Identity.tsx   [FE · TODO]
│  │  │  │  ├─ Recipients.tsx   [FE · TODO]
│  │  │  │  ├─ Review.tsx   [FE · TODO]
│  │  │  │  └─ Thresholds.tsx   [FE · TODO]
│  │  │  ├─ DeleteNodeDialog.tsx   [FE · TODO]
│  │  │  ├─ DimensionsModal.tsx   [FE · TODO]
│  │  │  ├─ EditNodeForm.tsx   [FE · TODO]
│  │  │  ├─ NodeTable.tsx   [FE · TODO]
│  │  │  └─ StatusMenu.tsx   [FE · TODO]
│  │  ├─ settings/
│  │  │  ├─ NotificationPrefs.tsx   [FE · TODO]
│  │  │  ├─ QuietHours.tsx   [FE · TODO]
│  │  │  └─ ThresholdForm.tsx   [FE · TODO]
│  │  ├─ shell/
│  │  │  ├─ AlertBell.tsx   [FE · TODO]
│  │  │  ├─ GlobalAlertBanner.tsx   [FE · TODO]
│  │  │  ├─ ModeToggle.tsx   [FE · TODO]
│  │  │  └─ Shell.tsx   [FE · BUILT]
│  │  ├─ tank-detail/
│  │  │  ├─ AlertHistory.tsx   [FE · TODO]
│  │  │  ├─ EventTimeline.tsx   [FE · TODO]
│  │  │  ├─ RawInspector.tsx   [FE · TODO]
│  │  │  ├─ SignalPanel.tsx   [FE · TODO]
│  │  │  └─ TankDetailView.tsx   [FE · BUILT]
│  │  ├─ time-nav/
│  │  │  ├─ BrushSync.tsx   [FE · TODO]
│  │  │  ├─ DaySelector.tsx   [FE · TODO]
│  │  │  └─ RangePresets.tsx   [FE · TODO]
│  │  └─ users/
│  │     ├─ UserForm.tsx   [FE · TODO]
│  │     └─ UserTable.tsx   [FE · TODO]
│  ├─ lib/
│  │  ├─ a11y.ts   [FE · TODO]
│  │  ├─ api.ts   [FE · BUILT]
│  │  ├─ csv.ts   [FE · TODO]
│  │  ├─ format.ts   [FE · BUILT]
│  │  ├─ hooks.ts   [FE · TODO]
│  │  ├─ store.ts   [FE · BUILT]
│  │  ├─ types.ts   [FE · BUILT]
│  │  └─ url-state.ts   [FE · TODO]
│  ├─ server/
│  │  ├─ auth/
│  │  │  ├─ guard.ts   [BE · BUILT]
│  │  │  ├─ password-policy.ts   [BE · TODO]
│  │  │  ├─ session.ts   [BE · BUILT]
│  │  │  └─ totp.ts   [BE · TODO]
│  │  ├─ jobs/
│  │  │  ├─ escalation.ts   [BE · TODO]
│  │  │  ├─ node-health.ts   [BE · TODO]
│  │  │  ├─ retention.ts   [BE · TODO]
│  │  │  ├─ rollups.ts   [BE · TODO]
│  │  │  └─ scheduler.ts   [BE · BUILT]
│  │  ├─ migrations/
│  │  │  ├─ 001_init.sql   [BE · BUILT]
│  │  │  ├─ 002_notifications.sql   [BE · TODO]
│  │  │  ├─ 003_zones_templates.sql   [BE · TODO]
│  │  │  ├─ 004_sessions.sql   [BE · TODO]
│  │  │  └─ runner.ts   [BE · TODO]
│  │  ├─ notify/
│  │  │  ├─ dispatcher.ts   [BE · TODO]
│  │  │  ├─ email.ts   [BE · TODO]
│  │  │  ├─ push.ts   [BE · TODO]
│  │  │  ├─ sms.ts   [BE · TODO]
│  │  │  ├─ webhook.ts   [BE · TODO]
│  │  │  └─ whatsapp.ts   [BE · TODO]
│  │  ├─ repos/
│  │  │  ├─ alerts.ts   [BE · BUILT]
│  │  │  ├─ api-keys.ts   [BE · TODO]
│  │  │  ├─ audit.ts   [BE · BUILT]
│  │  │  ├─ notification-prefs.ts   [BE · TODO]
│  │  │  ├─ readings.ts   [BE · BUILT]
│  │  │  ├─ recipients.ts   [BE · TODO]
│  │  │  ├─ sessions.ts   [BE · TODO]
│  │  │  ├─ tanks.ts   [BE · BUILT]
│  │  │  ├─ templates.ts   [BE · TODO]
│  │  │  ├─ users.ts   [BE · BUILT]
│  │  │  └─ zones.ts   [BE · TODO]
│  │  ├─ services/
│  │  │  ├─ alert-engine.ts   [BE · BUILT]
│  │  │  ├─ analytics.ts   [BE · BUILT]
│  │  │  ├─ compare.ts   [BE · TODO]
│  │  │  ├─ dashboard.ts   [BE · BUILT]
│  │  │  ├─ escalation.ts   [BE · TODO]
│  │  │  ├─ heatmap.ts   [BE · TODO]
│  │  │  ├─ reports.ts   [BE · TODO]
│  │  │  └─ tank-import-export.ts   [BE · TODO]
│  │  ├─ clock.ts   [BE · BUILT]
│  │  ├─ db.ts   [BE · BUILT]
│  │  ├─ env.ts   [BE · BUILT]
│  │  ├─ http.ts   [BE · BUILT]
│  │  ├─ logger.ts   [BE · TODO]
│  │  ├─ mock.ts   [BE · BUILT]
│  │  ├─ rate-limit.ts   [BE · TODO]
│  │  └─ schema.sql   [BE · BUILT]
│  ├─ styles/
│  │  ├─ globals.css   [FE · BUILT]
│  │  ├─ print.css   [FE · TODO]
│  │  └─ tokens.css   [FE · BUILT]
│  ├─ instrumentation.ts   [BE · BUILT]
│  └─ middleware.ts   [BE · BUILT]
├─ tests/
│  ├─ alert-engine.test.ts   [BE · TODO]
│  ├─ analytics.test.ts   [BE · BUILT]
│  ├─ api-alerts.test.ts   [BE · TODO]
│  ├─ api-tanks.test.ts   [BE · TODO]
│  ├─ dataset.test.ts   [BE · BUILT]
│  ├─ domain.test.ts   [BE · BUILT]
│  └─ rules-phase2.test.ts   [BE · TODO]
├─ var/
├─ .dockerignore   [BE · BUILT]
├─ .editorconfig   [BOTH · BUILT]
├─ .env.example   [SHARED · BUILT]
├─ .eslintrc.json   [SHARED · BUILT]
├─ .gitignore   [BOTH · BUILT]
├─ .nvmrc   [BOTH · BUILT]
├─ .prettierrc   [BOTH · BUILT]
├─ docker-compose.yml   [BE · BUILT]
├─ Dockerfile   [BE · BUILT]
├─ next.config.ts   [BOTH · BUILT]
├─ package.json   [SHARED · BUILT]
├─ playwright.config.ts   [FE · BUILT]
├─ postcss.config.mjs   [FE · BUILT]
├─ README.md   [BOTH · BUILT]
├─ tailwind.config.ts   [FE · BUILT]
├─ tsconfig.json   [BOTH · BUILT]
└─ vitest.config.ts   [BE · BUILT]
```

## Counts
| Owner | BUILT | MOCK | STUB | TODO |
|---|---|---|---|---|
| FE | 28 | 0 | 21 | 69 |
| BE | 63 | 21 | 0 | 50 |
| SHARED | 14 | 0 | 0 | 0 |
| BOTH | 24 | 0 | 0 | 0 |


## Added by Prompt 1
- `docs/DESIGN-SPEC.md`
- `public/favicon.svg`
- `src/components/charts/chart-theme.ts`
- `src/components/ui/icons.ts`
- `src/components/ui/Logos.tsx`
- `src/features/shell/BackToTop.tsx`
- `src/features/shell/FirstLoadGate.tsx`
- `src/features/shell/Footer.tsx`
- `src/features/shell/GlassHeader.tsx`
- `src/features/shell/Hero.tsx`
- `src/features/shell/MegaNav.tsx`
- `src/features/shell/PageFrame.tsx`
- `src/features/shell/SessionGate.tsx`
- `src/features/shell/TabBar.tsx`
- `src/features/shell/UtilityStrip.tsx`
- `src/lib/copy.ts`
- `src/lib/windows.ts`
- `tests/fe-api.test.ts`
- `tests/fe-chart-theme.test.ts`
- `tests/fe-components.test.tsx`
- `tests/fe-format.test.ts`
- `tests/fe-store.test.ts`
- `tests/fe-windows.test.ts`


## Added by Prompt 2
- `src/lib/series.ts`
- `src/lib/heatmap.ts`
- `src/styles/views-monitoring.css`
- `src/components/charts/DistanceChart.tsx`
- `src/features/dashboard/TankTile.tsx`
- `src/features/dashboard/TankGrid.tsx`
- `src/features/dashboard/FleetHealth.tsx`
- `src/features/dashboard/SignalQualityCard.tsx`
- `src/features/dashboard/copy.ts`
- `src/features/time-nav/TimeNavPanel.tsx`
- `src/features/tank-detail/TankHeroCard.tsx`
- `src/features/tank-detail/ReadingCard.tsx`
- `src/features/tank-detail/StatusCard.tsx`
- `src/features/tank-detail/StatsGrid.tsx`
- `src/features/tank-detail/copy.ts`
- `tests/fe-series.test.ts`
- `tests/fe-heatmap.test.ts`
- `tests/fe-url-state.test.ts`
- `tests/fe-csv.test.ts`
- `tests/fe-tanks-monitoring.test.tsx`

## Added by Prompt 3
- `src/lib/validation.ts`
- `src/lib/roles.ts`
- `src/styles/views-ops.css`
- `src/features/alerts/registry.ts`
- `src/features/alerts/adapter.ts`
- `src/features/settings/TankConfigForm.tsx`
- `src/features/settings/DisplayPrefs.tsx`
- `src/features/nodes-admin/AddNodeDialog.tsx`
- `src/features/auth/ResetForm.tsx`
- `tests/fe-validation.test.ts`
- `tests/fe-alert-registry.test.ts`
- `tests/fe-alert-adapter.test.ts`
- `tests/fe-roles.test.ts`
- `tests/fe-alerts-components.test.tsx`

# OHTMS Architecture & Implementation Decisions

This document logs all architectural, database, runtime, and dependency decisions made during the OHTMS Final Build (Vercel Hobby + PostgreSQL).

---

## Phase 0: Recon, Baseline & Safety Net

- **Branch Selection**: Created and switched to `final/live-postgres`.
- **Baseline Verification**:
  - Vitest: 44 test files, 241 tests passing 100% green.
  - Playwright E2E: 14/14 tests passing.
  - Visual Baseline: 42 screenshots captured at 360px (mobile), 768px (tablet), and 1280px (desktop) across all 14 public and authenticated routes (`tests/screenshots/baseline/`).
- **Fixture Extraction**:
  - `tests/fixtures/ttn-uplink.json`: Real TTN uplink payload with `as.up.data.forward`, gateway telemetry, and `Node1_distance_cm`.
  - `tests/fixtures/readings/`: 300 rows per device (`wio-e5-node-01` through `05`) extracted from dataset, preserving Tank 4 refill transitions, Tank 3 flapping stretches, and battery carry-forward behavior.
  - `tests/fixtures/devices.json` & `tests/fixtures/manifest.json`: Standardized device metadata and manifest for offline test isolation.
- **Local Database Tooling**:
  - PostgreSQL runtime for local Mac dev & CI testing runs real PostgreSQL binaries via `embedded-postgres` or local instance, connecting via standard `pg` connection strings. No SQLite or better-sqlite3 in production code.

---

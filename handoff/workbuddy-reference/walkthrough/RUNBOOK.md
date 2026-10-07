# Local reference runbook

Prerequisites: Windows PowerShell, Node24.14.x, pnpm11.2.2. No WorkBuddy account, cloud/model key or AI credits are needed.

1. Install: `pnpm install --frozen-lockfile`.
2. First-time PostgreSQL: `pnpm db:setup` obtains the pinned official distribution and generates ignored local credentials.
3. Schema and restricted roles: `pnpm db:migrate`.
4. Fixtures: `pnpm db:seed`. Repeating seed preserves existing changes; it is not reset.
5. One command starts database, web, API and the API's bounded15-second scheduler: `pnpm dev`. Open http://127.0.0.1:5173.
6. Stop web/API/scheduler with Ctrl+C; database with `pnpm db:stop`. `pnpm db:start` starts the database separately. Restart with `pnpm dev`, without reseeding.
7. Optional owner Automation reset requires exact `RESET SYNTHETIC DEMO`. It removes synthetic changes, restores fixtures/clock, invalidates sessions and archives private files. Save wanted artifacts first; never reset just to checkpoint.

Keep .env/.local private. DATABASE_URL uses cb_runtime, WORKER_DATABASE_URL cb_worker, MIGRATION_DATABASE_URL local bootstrap. No VITE secrets. Loopback origins/hosts and127.0.0.1 binding are mandatory. Do not expose demo identity publicly. Missing schema: migrate then seed, preserving .env. Busy ports: stop the known dev process or configure WEB_PORT/API_PORT and exact matching ALLOWED_ORIGINS before restart.

Fresh seed clock is paused7 Oct2026 10:00MYT; retained clock may differ. Choose pickup≥48h ahead with available date quota. Quote30min, deposit50%, hold24h; sessions/leases use real time. In-app reminders need operational consent and09:00–20:00MYT delivery window. Downtime leaves work queued; Run due jobs handles max10 per batch. Retry max3 with1-minute business-time delay; failures remain visible. File archiving follows transactional reseeding: investigate archive failure before retrying reset.

Build each phase before its gate; no test watch/per-edit hooks. WorkBuddy deployment is a separate fresh rebuild.

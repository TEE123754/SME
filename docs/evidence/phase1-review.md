# Phase 1 foundation review

Reviewed 7 October 2026. Implementation: Codex local reference. Phase 1 is complete; business workflows and live AI are not implemented.

Story: open the bakery route -> React health panel -> Vite `/api` proxy -> validated Express health endpoint -> actual PostgreSQL `SELECT 1` -> API Online / PostgreSQL Connected in the browser.

| Check | Evidence |
| --- | --- |
| Phase-end gate | `pnpm gate:phase1` passed once; all four results in `phase1-gate.json` |
| TypeScript / lint | Passed; TypeScript 5.9.3, ESLint 10.12.0 |
| Builds | API bundled successfully; Vite web build succeeded (approximately 407 kB JS, 127 kB gzip) |
| Startup | Built API and Vite proxy returned actual connected database health |
| Local guards | Untrusted origin returned 403; missing route returned 404; production-mode configuration rejected |
| Browser | Bakery page renders; API Online and PostgreSQL Connected shown; persistent scripted disclosure |
| Navigation | Customer view opens its clearly labelled Phase 4–5 shell; owner workspace opens its Phase 2–5 shell |
| Responsive review | Wide layout and narrow mobile layout inspected; mobile menu opens, navigates and closes correctly; no horizontal overflow observed |
| Console | No browser warning/error entries returned during the desktop review |
| Scope of completion | Route shells and infrastructure only; no sessions, business schema, orders, assistant dispatch or jobs yet |

Screenshots: `phase1-desktop.jpg` and `phase1-mobile.jpg`. The requested narrow viewport was 360px, but the in-app browser enforced an observed 400px CSS viewport (document width 383px with scrollbar). Exact 360px acceptance remains a Phase 4 check; this review does not claim that measurement. The temporary viewport override was reset after review.

Database: official EDB PostgreSQL 17.11-5 native binaries installed under ignored `.local`; SCRAM-password-protected loopback port 54329 and empty `customerbuddy` database. No Docker, system service, cloud resource or global PATH modification. The bootstrap role is for Phase 1 initialization/readiness only; Phase 2 creates restricted runtime/worker roles and business schema.

Setup repair: this machine's Windows PowerShell did not expose `Get-FileHash`; the setup script now computes the observed archive SHA-256 with .NET. Setup succeeded after that change. This happened before the gate; no passing gate checks needed repair/repetition.

Runtime left available: web at `http://127.0.0.1:5173`, API at `http://127.0.0.1:3001`, local PostgreSQL on 54329. Use README startup/shutdown instructions. No application code changed after the passing gate; only evidence/checkpoint/status documentation was finalized.

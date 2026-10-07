# CustomerBuddy - Implementation Plan and Progress Checklist

Version 0.4 | Updated 7 October 2026 | Prototype checkpoint preserved; expanded WorkBuddy requirements planned, not built.

Related: [PRD](<C:/Users/Edison Tee/Downloads/SME/PRD.md>), [TRD](<C:/Users/Edison Tee/Downloads/SME/TRD.md>), [App Flow](<C:/Users/Edison Tee/Downloads/SME/APP_FLOW.md>), [Design Brief](<C:/Users/Edison Tee/Downloads/SME/DESIGN_BRIEF.md>), [Backend Schema](<C:/Users/Edison Tee/Downloads/SME/BACKEND_SCHEMA.md>), [WorkBuddy Rebuild Brief](<C:/Users/Edison Tee/Downloads/SME/WORKBUDDY_REBUILD_BRIEF.md>).

## 1. Operating contract

1. Codex builds a usable local reference prototype in Phases 1-6. Hardcode the assistant's intent handling and response templates; implement real persistent business workflows. WorkBuddy agentic implementation is deferred entirely to the fresh Phase 7 rebuild; do not merely import/publish the prototype.
2. Implement the current phase's full build checklist before running its test gate. Do not run a full test suite, lint, typecheck, or production build after each small edit.
3. Tests may be authored during a phase. Disable test watch mode and automatic test-on-save. Normal dev-server feedback can guide implementation without repeatedly triggering a suite.
4. Run one planned gate batch at phase end. After a failure, fix the issue and rerun the failed/affected checks only. Broaden verification only when the change affects an already-passed boundary.
5. Mark a phase Complete only when its build items and required gate pass. Built-but-untested is a real status, not Complete. Advance only after the current gate is resolved, unless a documented external dependency blocks it and independent work is explicitly identified.
6. Before ending a turn, switching tools, or approaching a usage/context limit, update this file with completed items, remaining work, changed files, test state, blockers, and the exact next action.
7. Preserve passed evidence instead of rerunning it merely because a new session starts. Resume from the checkpoint after inspecting relevant files and uncommitted changes.
8. Never mark fixture responses as live AI, synthetic payments as revenue, or Codex-created artifacts as WorkBuddy-authored. Prototype pass results are reference expectations; the new WorkBuddy implementation needs its own phase-end tests.

The original exclusive-tool competition rule and this requested build approach are distinguished in the PRD. That distinction is recorded; no additional permission flow is introduced into routine local implementation.

**Current completion target:** A demonstrator can sign in as synthetic customers/owner, order through forms or scripted chat, confirm a quote, review an exception, verify a synthetic payment, download documents, run due reminders and inspect a reconciled digest. All business state persists across restarts. The prototype runs with local Node/PostgreSQL and no WorkBuddy, cloud or model credentials. Completing Phase 6 does not depend on Phase 7.

**Requested expansion, specification only:** PRD FR-18–FR-27 add the owner customer-agent board, owner/customer AI queries, stock/sales management and forecasts, controlled pricing, engagement/after-sales, multilingual content/visual generation, transaction-risk review and ethical controls to the independent WorkBuddy project. Existing mechanics are reused. All expansion requirements are needed to claim the expanded release complete; optional model upgrades/external delivery have capability/data gates. This request does not authorise app implementation, reopen Phases 1–4 or require new packages/migrations. The saved deferred Phase 4 accessibility action remains the next implementation action.

## 2. Stack and tool ownership

| Area | Stack | Tool / phase |
| --- | --- | --- |
| Reference workspace | pnpm, Git, compatible Node LTS, TypeScript | Codex, Phase 1 |
| Web | React, Vite, Router, Tailwind, shadcn/ui, TanStack Query, React Hook Form, Zod | Codex, Phases 1 and 4 |
| Backend | Express, TypeScript, Zod, shared domain services | Codex, Phases 2-5 |
| Data | PostgreSQL, Drizzle/SQL, pg, local Docker/native Postgres | Codex prototype, Phases 1-3; WorkBuddy authors new cloud schema/migrations in 7A |
| Documents/jobs | pdf-lib, storage adapter, Postgres jobs/outbox | Codex, Phase 5; private CloudBase storage in Phase 7 |
| Demo assistant | Hardcoded intent rules, BM/English templates, quick actions, real scoped service calls | Codex, Phase 5; no LLM SDK or model adapter |
| Agent release | Newly authored scoped orchestration and CloudBase-managed AI | WorkBuddy, rebuild Phase 7D |
| Owner tools | Official MCP SDK, WorkBuddy connector/skills and Automation | Deferred to WorkBuddy 7D; Codex implements ordinary owner UI/API controls |
| Expanded operations | Customer-agent projection, stock lots/movements, reconciled sales/invoices, forecasts, price proposals, risk cases | Planned WorkBuddy 7A-7D; not prototype additions |
| Expanded growth / AI | Separate owner/customer tool registries, approved campaigns/content/assets; optional StatsForecast/scikit-learn/BGE/Presidio | Planned WorkBuddy 7D; Tencent-hosted only after checks; repository register in TRD Section 15 |
| Verification | Vitest, Supertest, Playwright, compiler/linter/build commands | Current phase's end gate only |
| Final rebuild/deployment | Fresh WorkBuddy source/tests/docs; CloudBase API, Postgres, Auth, storage and AI | WorkBuddy, Phases 7A-7E |

Phase 1 has pinned/installed local dependencies and initialized Git. Node 24.14.0, pnpm 11.2.2, TypeScript 5.9.3, React 19.3.0, Vite 8.3.3, Express 5.2.1 and PostgreSQL 17.11-5 are the selected local foundation. WorkBuddy verifies cloud compatibility in 7A. No cloud resources/deployment have been created; gate status is recorded below.

## 3. Current progress

| Phase | Build status | Gate status | Primary tool |
| --- | --- | --- | --- |
| 0 - Specifications | Complete | Document consistency reviewed; application tests not applicable | Codex |
| 1 - Foundation | Complete | Passed once; typecheck/lint/build/startup and browser review recorded | Codex |
| 2 - Data and identity | Complete | Passed; compiler repair then remaining checks; 24 integration cases | Codex |
| 3 - Business API | Complete | Passed after affected repairs; 25 integration cases plus type/lint/build | Codex |
| 4 - App flows | Built - gate pending | Type/lint/build +6 API cases and browser B01–B08 passed; B09 partial, 200% zoom pending by user choice | Codex |
| 5 - Scripted assistant and local jobs | Not started | Not run | Codex |
| 6 - Usable prototype acceptance and handoff | Not started | Not run | Codex |
| 7 - Independent rebuild (7A-7E) | Not started | Not run; actual account capabilities unverified | WorkBuddy |

**Active checkpoint:** Phase 4 build finished. Final compiler/lint/build and six API cases pass; browser P4-B01–B08 pass and P4-B09 is partial. 200% browser zoom remains pending at the user’s explicit request. Mobile runtime clamps360px to 400px. Evidence/screenshots and repairs are saved under docs/evidence/phase4-*. Phase 5 has not started; preserve passed checks.

## 4. Phase 0 - Specifications

**Tool:** Codex. **Output:** A consistent product, technical, UX, data and delivery plan.

- [x] Update PRD for the requested Codex-first / WorkBuddy-final strategy.
- [x] Create TRD with stack, API/tool contracts, deployment boundaries and limits.
- [x] Create App Flow with customer, owner, handoff and scheduled-work paths.
- [x] Create Design Brief with tokens, layouts, components and accessibility targets.
- [x] Create Backend Schema with constraints, scoped access and transactions.
- [x] Create this phase checklist and usage-limit handoff protocol.
- [x] Add workspace agent guidance for phase-end checks and progress persistence.
- [x] Revise the strategy to a Codex reference prototype followed by a fresh full WorkBuddy rebuild.
- [x] Create the WorkBuddy Rebuild Brief and reference-pack requirements.
- [x] Specify a usable Codex demo with hardcoded assistant behaviour and real saved workflows; defer all WorkBuddy agentic integration to Phase 7.
- [x] Review documents for consistent phase names, business rules and implementation status.
- [x] Specify the 7 October requested expansion across the seven documents, retaining existing feature contracts and prototype checkpoint; add researched GitHub/Hugging Face candidates with licence/runtime/authority limits.

**Gate:** Document review only. No app tests, package installation, migrations or build commands are required for this phase.

## 5. Phase 1 - Foundation

**Tool:** Codex. **Stack:** pnpm workspace, compatible Node LTS, TypeScript, React/Vite, Express, PostgreSQL development runtime.

**Build checklist**

- [x] Inspect local tool availability and select compatible local Node/dependency versions. Cloud runtime selection belongs to WorkBuddy 7A.
- [x] Scaffold planned workspace folders and package names from the TRD.
- [x] Add reproducible pnpm lockfile, TypeScript settings, lint/format configuration and ignores.
- [x] Set up local Postgres using available Docker Compose or native PostgreSQL; chosen method: official EDB 17.11-5 portable Windows runtime in .local, SCRAM-protected loopback port 54329, no system service.
- [x] Add safe environment templates and validated configuration; no credentials in committed files.
- [x] Create web route shell, shared visual tokens and API health endpoint.
- [x] Define local identity, storage, clock and scripted-assistant boundaries. Scaffold only prototype modules; omit MCP, cloud deployment and managed-AI implementation.
- [x] Add explicit phase gate scripts; no watch tests or per-edit hooks.
- [x] Update this phase's checkpoint with files and pending issues before testing.

**End gate:** One batch: typecheck/lint/build the scaffold and a minimal web/API startup check. Do not add trivial tests that just restate config. Resolve failures using affected checks only.

- [x] Gate passed; pnpm gate:phase1 passed once; docs/evidence/phase1-gate.json and phase1-review.md record gate/browser results.
- [x] Checkpoint updated; Phase 1 marked Complete.

## 6. Phase 2 - Data and identity

**Tool:** Codex. **Stack:** PostgreSQL, Drizzle/SQL, pg, Zod; loopback-only synthetic auth behind a provider-independent identity boundary.

**Build checklist**

- [x] Implement schema/migrations and indexes from Backend Schema, with any simplifications documented.
- [x] Implement repositories with trusted business/customer scope and transaction-local DB context.
- [x] Implement migration/runtime/local-worker role boundaries and RLS/grants; document future restricted-integration permissions without provisioning WorkBuddy credentials.
- [x] Seed one owner, ten synthetic customers, catalogue, consent/history and pickup/capacity fixtures.
- [x] Implement `/me`, scoped profile/consent/preference operations and read APIs needed by later phases.
- [x] Implement development auth only for local synthetic mode; block production role selectors.
- [x] Persist synthetic identities and trusted scopes; document future CloudBase subject mapping without implementing cloud authentication.
- [x] Author phase tests for scope, composite integrity, consent and migration replay.
- [x] Save a checkpoint before starting the gate.

**End gate:** Apply/replay migrations against an empty disposable local database; run focused repository/auth/RLS integration cases. Prove two-customer and two-business isolation, invalid cross-scope foreign-key denial, missing-context denial, and clean pool context reuse.

- [x] Gate passed; Node 24.14.0/PostgreSQL 17.11-5; compiler/lint/build and 24 integration cases passed. Evidence: docs/evidence/phase2-gate.json and phase2-integration.json.
- [x] Checkpoint updated; Phase 2 marked Complete.

## 7. Phase 3 - Business API

**Tool:** Codex. **Stack:** Express/Zod, TypeScript domain services, Postgres transactions, idempotency and audit.

**Build checklist**

- [x] Implement published knowledge/catalogue and pickup-option APIs.
- [x] Implement deterministic quotes, policy/version checks, lead time and deposit arithmetic.
- [x] Implement explicit customer confirmation challenges and idempotent order creation.
- [x] Implement atomic capacity allocation, unpaid holds, lazy expiry and reviewed cancellation.
- [x] Implement pending approvals, exact-proposal decisions, human takeover and explicit resume.
- [x] Implement owner payment verification and held-to-committed capacity transition.
- [x] Implement order/status/dashboard views and immutable commercial audit records.
- [x] Persist conversation/message records required by the UI; scripted assistant dispatch is added in Phase 5.
- [x] Insert document/reminder outbox records; actual workers are Phase 5.
- [x] Author business/concurrency/API tests and update checkpoint.

**End gate:** Focused domain/API batch covering RM78/RM39 and RM48/RM24, quote expiry/change, forged confirmation denial, last-unit contention, duplicate confirmation/payment, stale approval, expiry/payment race and owner authority. Include only Phase 2 regressions affected by new writes.

- [x] Gate passed; Node 24.14.0/PostgreSQL 17.11-5. Final typecheck/lint/build and 25 cases passed; repairs recorded in docs/evidence/phase3-gate.json and phase3-review.md.
- [x] Checkpoint updated; Phase 3 marked Complete.

## 8. Phase 4 - App flows

**Tool:** Codex. **Stack:** React/Vite, Tailwind/shadcn, Router, Query, Hook Form/Zod.

**Build checklist**

- [x] Build customer entry/sign-in, chat shell, consent and preferences routes.
- [x] Build catalogue/quote cards with exact date/slot, pricing and server-bound Confirm/Edit controls.
- [x] Connect quote/order APIs; display pending, committed, expired and failed states accurately.
- [x] Provide an explicit product/quantity/date/slot order form so ordering never depends on free-text recognition.
- [x] Build order history/detail and document status UI; do not fake available documents.
- [x] Build owner overview, order/payment detail, approval queue and human-takeover controls.
- [x] Build knowledge/version and capacity editing; prevent invalid client submissions and rely on server enforcement.
- [x] Build local automation/evidence panels with synthetic/scripted labels and real record-derived totals.
- [x] Add mobile layouts, BM/English copy, focus/keyboard behaviour and error/empty/loading states.
- [x] Keep temporary chat UI fixtures labelled; the scripted assistant arrives in Phase 5. Core owner/customer controls must already call real APIs and persist changes.
- [x] Author focused browser scenarios; update checkpoint before the gate.

**End gate:** One browser batch for customer confirmation, owner rejection/payment verification, human takeover and preference change, plus visual/accessibility review at mobile and desktop sizes. Run build/quality checks once as part of the same gate; do not rerun every prior API test.

- [x] Automated checks and browser P4-B01–B08 passed; screenshots/viewports recorded in docs/evidence/phase4-review.md.
- [ ] Complete remaining P4-B09 200% browser-zoom inspection (left pending by user request); then mark the full gate passed.
- [x] Checkpoint updated with final build and passing evidence.
- [ ] Phase 4 marked Complete only after the remaining zoom check passes.

## 9. Phase 5 - Scripted assistant and local jobs

**Tool:** Codex. **Stack:** TypeScript/Zod intent dispatcher and templates, scoped domain services, Postgres jobs/outbox, local worker/clock, pdf-lib and local private storage. No AI or MCP SDK.

**Build checklist**

- [ ] Implement `DemoAssistant`: allowlisted intent rules for catalogue/FAQ, repeat order, quote, status, preference proposals and owner handoff. Bind scope from the authenticated session.
- [ ] Add BM/English response templates, supported mixed-language example phrases and quick actions; show "Demo assistant — scripted responses" permanently.
- [ ] Use current published knowledge, consented preferences and saved history. Render prices/status from real service results; never return unconditional hardcoded success.
- [ ] Collect missing product/quantity/exact date/slot through a structured form. Unknown/ambiguous text offers supported actions or owner handoff; no claim of general language comprehension.
- [ ] Persist messages and scripted runs, including matched intent/script version, service outcomes and failures. Confirmation, preference consent, approvals and payment verification remain explicit UI actions.
- [ ] Implement leased bounded job processing, retry limits, recovery and durable action keys.
- [ ] Implement invoice/summary/receipt generation and authorised download through the storage adapter.
- [ ] Implement one eligible in-app deposit reminder, quiet-hour deferral and all suppression checks.
- [ ] Implement owner digest and reconcilable metrics from records.
- [ ] Add a local bounded scheduler and owner-only Run due jobs/Generate digest controls; no WorkBuddy Automation dependency.
- [ ] Add a controlled demo clock: pause/resume/advance, show current demo time, and keep persisted deadlines consistent across restarts. Advancing time triggers or enables guarded due-job processing.
- [ ] Add explicit owner-confirmed Reset demo for the synthetic local database/files only; restore seeds, clock and jobs coherently. Never target an external database.
- [ ] Document supported scripted inputs and future agentic behaviour as reference contracts only; do not build WorkBuddy connectors, MCP manifests/protocol clients or managed-AI adapters.
- [ ] Author meaningful scripted-dispatch/job/document tests and save checkpoint.

**End gate:** One focused batch for scripted scope/authority denial, supported-intent routing, unknown-input fallback, real state updates, leased-worker retry, stale reminder suppression, quiet hours, duplicate documents/notifications and receipt/payment consistency. Verify local clock/job controls and reset isolation. No MCP protocol or live-model tests in Codex. Scripted cases verify workflow mechanics and policy, not language-model capability.

- [ ] Gate passed; record scripted-mode limitations and supported inputs.
- [ ] Checkpoint updated; Phase 5 marked Complete.

## 10. Phase 6 - Usable prototype acceptance and handoff

**Tool:** Codex. **Stack:** Prototype stack, local acceptance runner, browser screenshots, reference packaging.

**Build checklist**

- [ ] Finish outstanding local P0 mechanics and remove obsolete temporary UI data.
- [ ] Document install/migrate/seed/start/stop/reset steps and provide a single command to start the configured web/API/worker. Verify no WorkBuddy/cloud/model key is needed.
- [ ] Prove customer and owner workflows remain usable after restart; no dead primary buttons, fabricated totals or placeholder downloads.
- [ ] Prepare at least 30 supported scripted/unsupported-input cases, expected commercial actions, reviewer rubric and manual baseline template. Keep future real-AI evaluation separate.
- [ ] Verify configuration segregation, redaction, least-privilege boundaries and safe deployment defaults in code.
- [ ] Capture customer/owner screens at mobile and desktop sizes, including quote, awaiting deposit, approval, receipt, expiry and failure states.
- [ ] Create portable API/tool contracts, synthetic fixture data, expected outputs and a concise demo walkthrough.
- [ ] Package requirements, flow, design, schema, screenshots, scenarios and prototype evidence as `handoff/workbuddy-reference/`; add an indexed README with provenance and limitations.
- [ ] Include unbuilt expansion specifications, candidate register and FR-18–FR-27 acceptance expectations as future WorkBuddy targets; label them unimplemented and never fabricate expansion screenshots/results.
- [ ] Document desired cloud auth/storage/AI/scheduling behaviours without requiring copied prototype implementation.
- [ ] Write fresh WorkBuddy rebuild tasks 7A-7E; record account/hosting assumptions still unverified.
- [ ] Keep Codex source/build output outside the primary reference pack; any later code consultation is read-only reference, not an imported final app.
- [ ] Update PRD/TRD/schema/flow only for actual implementation changes; record changed requirements.
- [ ] Save checkpoint, then run the local release gate once.

**End gate:** One cumulative prototype acceptance batch plus typecheck/lint/build. Review the reference pack for completeness, secrets and broken portable links. This is the planned combined regression point, not an every-phase full-suite policy. Record prototype mechanics/owner effort; scripted runs are not managed-AI accuracy or revenue.

- [ ] Local release gate passed; usable Codex prototype complete independently of WorkBuddy; store concise evidence and unresolved limitations.
- [ ] Reference pack complete; prototype results, limitations and WorkBuddy rebuild tasks indexed.
- [ ] Phase 6 marked Complete; Phase 7 remains Not started until actual WorkBuddy work begins.

## 11. Phase 7 - Independent WorkBuddy rebuild

**Tool:** Tencent WorkBuddy for all new source, tests, documentation and deployment. **Recommended stack:** equivalent React/TypeScript, Node API, PostgreSQL and typed tools, adapted to supported WorkBuddy/CloudBase services.

Use a fresh workspace and separate cloud environment. References are inputs; frontend/backend/tool/migration/test code is generated anew in WorkBuddy. WorkBuddy keeps a copy of this progress plan within its own project and updates its rebuild checkpoint there.

The requested expansion is sequenced after stable core workflows within these subphases, before expanded release acceptance in 7E. Track core acceptance separately from expansion acceptance; a core-only deployment is not a completed expanded release. All added checkboxes below are **Not started**. Data-dependent model upgrades may remain disabled with baseline/unavailable evidence; external delivery is conditional, while reviewed draft/export and in-app engagement are required.

### 7A - Fresh foundation, data and identity

- [ ] Read the reference index, rebuild brief and expected behaviours; record source provenance.
- [ ] Verify WorkBuddy account/runtime/region/quotas/charges and select supported package versions.
- [ ] Review TRD Section 15 repository candidates: pin adopted source/package/model revision, licence/notice and integrity; distinguish supported SDK distributions from archived GitHub mirrors. Verify optional Python/GPU Tencent packaging and managed-image entitlement/costs; install no competing orchestration or unrestricted customer connector.
- [ ] Generate new scaffolding/configuration and CloudBase staging environment.
- [ ] Generate new schema/migrations, restricted roles and cloud identity mapping from the data specification.
- [ ] Author expansion schema for unique customer-agent contexts, separate owner chat, stock lots/movements/allocations, forecast/price/offer proposals, campaigns/content/assets, purpose/channel consent and support/risk reviews. Keep existing orders/payments/documents authoritative.
- [ ] Seed synthetic input data; never import a production customer database.
- [ ] Author setup/schema/auth tests in WorkBuddy; save checkpoint.
- [ ] After this subphase is built, run one setup/migration/scope gate against the new project and record results.
- [ ] Include scoped expansion FKs/RLS, unique agent contexts, default-off new consent purposes, aggregate worker views and denied integration decision/payment/publication authority in the same end gate.

### 7B - Rebuild business API and tools

- [ ] Implement new catalogue/quote/confirmation/capacity/expiry services from contracts and expected behaviour.
- [ ] Implement approvals, takeover, owner payment verification, order state, audit and idempotency.
- [ ] Implement deterministic stock receipt/production/expiry/waste/adjustments, ready-stock vs preorder allocations and reconciled sales/invoice views; do not use capacity as physical inventory.
- [ ] Implement bounded price proposals/owner publication, immutable confirmed snapshots and offer redemption limits; reject stale quotes/proposals and out-of-bound prices.
- [ ] Implement campaign/content revision approval and delivery eligibility, cross-channel promotional counter, support cases and deterministic transaction-risk signals with explicit owner clearance.
- [ ] Generate new tests from the scenario expectations; do not copy prototype pass records as results.
- [ ] Save checkpoint, then run one commercial/API/concurrency gate with scoped records and the RM78/RM39 fixture.
- [ ] Include last-lot contention, cancellation/expiry release, waste/negative-stock denial, duplicate offer redemption, stale price publication, invoice/cash reconciliation and duplicate-reference/benign-risk scenarios in this end gate.

### 7C - Recreate UI, documents and jobs

- [ ] Recreate customer/owner screens using screenshots, tokens and flow references; use new components/source.
- [ ] Build one-box-per-customer agent board with all active/inactive contexts, processing states, real review reasons and scoped interaction history; reuse takeover/resume/case screens.
- [ ] Build owner query, stock/sales/invoice, forecast/pricing, campaign/content/assets and risk screens from expansion design/flows; mark model outputs unavailable until integration exists.
- [ ] Implement private documents/downloads, leased jobs/outbox, reminders, quiet hours and digest records.
- [ ] Add bounded forecast/content/visual/campaign job types, private generated assets/provenance, approved draft export and last-moment consent/suppression/frequency checks. No connector means no claimed external delivery.
- [ ] Complete responsive, language, empty/error/pending/expiry states and owner controls.
- [ ] Save checkpoint, then run one UI/job/document gate including separate-customer access, duplicate prevention and payment/receipt consistency.
- [ ] Include inactive/no-history board cards, multiple review reasons, owner/customer transcript separation, stock/capacity labelling, chart/table parity, draft approval invalidation, expired offers/batches, changed consent and pending/failed/uncertain job states in this same gate.

### 7D - Build actual agentic behaviour in WorkBuddy

Build the following blocks in order, saving checkpoints between them. Complete all required 7D build items before its end gate; no per-edit suites. Optional advanced models require data/runtime evidence, not merely installation.

**7D.1 - Scoped customer and owner queries**

- [ ] Author request-local customer orchestration and scoped business tools in the new project.
- [ ] Replace reference-only hardcoded intent/response behaviour with genuine managed-AI orchestration; do not present the scripted prototype as a completed agentic integration.
- [ ] Enable supported managed AI and bounded tool/deadline handling; keep approvals/payments outside model authority.
- [ ] Add separate read-only owner query tools for authorised stock/sales/invoices/reviews/forecasts with periods, source links and clarification; prevent customer tools from gaining owner scope.
- [ ] Generate/connect new owner MCP tools/skills and permitted WorkBuddy automations.
- [ ] Document actual schedule frequency/offline behaviour and enable truthful managed-AI mode labels.

**7D.2 - Engagement, content and visual generation**

- [ ] Implement current-request and explicitly consented personalised recommendations/promotions, recorded-batch announcements and permitted after-sales service; human escalation for complaints/safety/refunds.
- [ ] Generate fact-grounded BM/English SEO product descriptions, marketing/email/social/PR drafts; exact revision owner review and export/publication boundaries. Additional languages require reviewer evidence.
- [ ] Implement supported Tencent-managed visual jobs with rights/provenance/illustration labels, bounded cost/time, private storage and explicit owner approval; never invent an asset on service failure.
- [ ] Configure guarded in-app campaigns/automation; verify restricted external connector identity/acknowledgement before enabling email/social sends. Recheck consent, cap, quiet hours, takeover, pause, stock/offer validity and deduplication at delivery.

**7D.3 - Forecasting, controlled pricing, risk and ethics**

- [ ] Implement transparent baseline forecasts and Insufficient data/stale/synthetic states, known-order/incremental-demand split, shelf-life/stock/capacity-bound production suggestions and sales-value price assumptions.
- [ ] Evaluate richer StatsForecast or equivalent supported Tencent-hosted statistical models only when data suffices; rolling-origin backtest vs baseline, no future-data leakage or unsupported accuracy claim.
- [ ] Ground deterministic price suggestions in current stock/expiry/demand and owner bounds; model text cannot publish or set individual trait-based prices.
- [ ] Add optional anomaly/retrieval/redaction adapters only after runtime/data checks. Fraud models stay advisory; measure owner-clearance/false positives, not just flagged events.
- [ ] Implement/test policy for sparse-data bias, new/opted-out customer alternatives, no cross-platform tracking, consent withdrawal/deletion, truthful AI/image disclosures, human appeal and rejected manipulative drafts.

**7D end gate**

- [ ] Save checkpoint, then run the core 30-conversation managed-AI evaluation plus expanded owner/customer queries, forecasting/content/visual/risk/ethical scenarios and one actual owner automation workflow as a single planned gate batch.
- [ ] Record model usage, latency, commercial accuracy, failures, corrections and handoff outcomes.
- [ ] Record forecast coverage/cutoff/backtest errors, draft fact/language correctness, actual generated assets, campaign suppression/caps/opt-outs, risk false positives and capability limitations. Disabled optional upgrades do not imply the required baseline/workflow is built.

### 7E - Deploy and document the rebuilt project

- [ ] Finish cloud packaging, secrets, private storage, database-role/configuration segregation and rollback procedure.
- [ ] Deploy the new WorkBuddy project to reviewable staging; prototype build outputs are excluded.
- [ ] Author final PRD/TRD/schema/flow/setup/evaluation documentation and slides in WorkBuddy from the rebuilt app.
- [ ] Save checkpoint, then run one deployment-focused browser-to-API-to-data/document acceptance batch and critical cloud auth/capacity/retry checks.
- [ ] Verify FR-18–FR-27 on deployed services: unique agent board, scoped queries, physical-stock transactions, forecast uncertainty, controlled price publication, approved consented campaigns/content/assets and private risk/ethical review. Record external delivery/model upgrades separately from required baseline/in-app/export acceptance.
- [ ] Reuse passed WorkBuddy subphase evidence for unchanged new components; do not rerun every suite solely to publish.
- [ ] Publish the rebuilt app through WorkBuddy and capture final URL, environment, new source version, tests and task evidence.
- [ ] Keep reference/rebuild provenance accurate; synthetic transactions remain labelled.
- [ ] Mark Phase 7 / expanded release Complete only when 7A-7E, core P0 and FR-18–FR-27 required workflows pass; disclose unfinished conditional model/channel upgrades without claiming their success.

If a required rebuild/platform feature is unsupported, mark Phase 7 Blocked/Partial and retain the labelled Codex reference. Do not present that prototype as the completed WorkBuddy app or silently change the deployment/agent platform.

## 12. Planned gate commands and evidence

`pnpm gate:phase1` through `pnpm gate:phase4` exist. Phases 1–3 passed; Phase 4 automated checks passed and its remaining zoom review is pending. Add each later phase's bounded runner when its implementation is built; do not create empty passing gates for unbuilt phases. During WorkBuddy 7A, generate that new project's own gate commands for 7A-7E. Each runner selects the bounded checks above, rather than running every suite by default.

Each gate entry records implementation (Codex reference or WorkBuddy rebuild), phase/subphase, date, environment, command, result, scenario IDs and evidence. Keep long logs in the respective project's evidence folder. Live AI is verified in 7D, not on every commit. Never carry a prototype Complete/pass status into the fresh rebuild.

At a failed gate: retain the failing output, repair the underlying issue, run the failed/affected case(s), then mark the gate resolved when all required cases have passed against relevant final code. Passed unaffected suites do not need another run. A material dependency/auth/schema change justifies a documented broader rerun.

## 13. Usage-limit and session handoff protocol

Save progress after each meaningful work chunk and before the end of every implementation turn. Also checkpoint before a large new chunk when remaining usage/context is low, before the WorkBuddy handoff, or before an interruption. If usage information is available, check it at sensible boundaries; do not poll it after every file edit.

For efficient resumption, read the active checkpoint, current phase, and relevant specification sections first. Reuse known context instead of reprinting or rereading the entire document set after each small task. Update checklist/checkpoint sections with small edits and keep handoff commentary concise.

Update in this order:

1. Tick only completed build items; leave incomplete items unchecked.
2. Set phase status to In progress, Built - gate pending, Gate failed, Complete, or Blocked/Partial.
3. Fill the active checkpoint with exact files/functions touched, what remains, test state, errors, external dependencies and the first executable next action.
4. Record relevant evidence/commit reference if one exists. Do not invent a commit or claim a test was run.
5. Save the plan and source. A partial phase does not require a test run merely to create a handoff.

### Active checkpoint - current saved state

| Field | Value |
| --- | --- |
| Updated | 7 October 2026 |
| Current phase | Phase 4 Built - gate pending |
| Latest completed work | Persisted customer/owner flows, scoped session/query/mutation helpers, confirmation/edit, offers/review, payments, takeover/reply/resume, consent/preferences, versioned knowledge/capacity and truthful evidence panels |
| Changed files | apps/web/src/App/main/styles, pages/Account/Customer/Owner, lib/api/types/session-context/session/hooks, components/workflow and readiness copy; apps/api commerce-routes/app; packages/db commerce/repositories; shared health contract; package scripts; scripts/gate-phase4.mjs and test-phase4-api.ts; specifications and phase4 evidence/screenshots |
| Data/runtime | Migrations001–003 unchanged. Local synthetic PostgreSQL connected, runtime secrets ignored. Preview http://127.0.0.1:5173; owner verified order displayed. Dev session 28836. Two new Hana orders and one RM39 synthetic payment retained; knowledge v3 with original prices, capacity max 10 restored |
| Tests/build checks | Final pnpm typecheck/lint/build pass. Six Phase 4 API cases pass; disposable database removed. Browser B01–B08 pass. B09 reflow/labels/focus/menu/contrast pass, 200% zoom pending. Repairs and original gate failure retained |
| Evidence | docs/evidence/phase4-gate.json, phase4-api.json, phase4-browser.json, phase4-review.md, phase4-desktop/mobile/payment.png; earlier phase evidence preserved |
| Remaining in Phase 4 | 200% browser zoom inspection, left pending by explicit user reply. Exact360 CSSpx is also unverified because supported viewport clamps to 400; record this limit rather than claiming a pass |
| Limitations | Owner UI and some technical/status copy remain English; core customer actions/preferences support BM/EN. Historical pre-repair tied message timestamps are retained; new writes preserve order. Documents/replies/jobs/clock controls remain Phase 5; no liveAI/cloud/WorkBuddy integration |
| Blockers | No implementation blocker. Browser API cannot set actual 200% zoom; user chose to defer this manual accessibility check |
| Exact next action | Resume pending zoom inspection when requested: set real browser zoom200%, inspect customer and owner forms/text/menu for clipping, record actual result, restore zoom, then mark Phase 4 Complete. Preserve existing passes; do not rerun entire gates. Next build phase is5 after Phase 4 gate is resolved |
| Avoid repeating | No reinstall/scaffold/old suites. No test watch. No WorkBuddy provenance claims or import of prototype source as final app |

### Specification expansion checkpoint - 7 October 2026

| Field | Value |
| --- | --- |
| Request/status | Update seven specification files and add suitable GitHub/Hugging Face options; documentation only. Expansion application work Not started |
| Completed chunk | Existing capabilities reused; FR-18–FR-27, owner/card and query flows, stock/forecast/pricing rules, engagement/content/visual/risk/ethical requirements, planned schema/API/UI and WorkBuddy build/gate items aligned |
| Changed files | PRD.md, TRD.md, APP_FLOW.md, DESIGN_BRIEF.md, BACKEND_SCHEMA.md, IMPLEMENTATION_PLAN.md, WORKBUDDY_REBUILD_BRIEF.md only |
| Repository research | Primary sources reviewed 7 October; TRD Section 15 records sources, licences, use cases and authority/runtime limits; archived CloudBase SDK mirrors excluded as build sources; Hunyuan weights are evaluation-only under custom terms |
| Check state | Documentation consistency reviewed; local file links, balanced Markdown fences, unique FR-18–FR-27 rows and git diff whitespace check passed. No application tests, lint, typecheck, builds, migrations or dependency installation run. Earlier evidence preserved |
| Remaining / dependencies | All expanded implementation and new WorkBuddy evidence remain pending; account/runtime/region, model/image credits, Python/GPU support, data sufficiency, external connectors and track dependency rules still require actual verification |
| Exact next action | Documentation request complete; report the seven-file update. A later implementation request resumes the saved Phase 4 zoom action; do not start Phase 5 or any WorkBuddy/expansion build from this documentation request |

This checkpoint supplements, and does not overwrite, the active Phase 4 implementation state or repository publication record below. No new commit, push, deployment or passing application gate is claimed.

### Repository publication checkpoint - 7 October 2026

- User requested publishing the existing workspace to `https://github.com/TEE123754/SME` and a professional business README without demo/WorkBuddy framing.
- Adopted **CustomerLane** as the public product name. `README.md` now covers business value, current customer/owner workflows, roadmap, setup, architecture, configuration and contributions. `PRD.md` records the name; internal CustomerBuddy identifiers/UI remain unchanged pending a separately requested branding migration.
- Existing implementation and Phase 4 gate status are unchanged. Planned assistance, documents, jobs, production identity and deployment are distinguished from current capabilities. No application tests, lint, typecheck or builds were rerun for these documentation changes; existing passing evidence is preserved.
- Target repository inspection returned no refs (empty repository). Source, specifications and saved evidence are included; ignored credentials, local database/runtime, dependencies and build outputs are excluded. Initial publication commit `cd4c771` was pushed successfully to `origin/main`; remote main was verified against local HEAD. README local links, requested wording and staged whitespace checks passed.
- This publication request is complete. Implementation next action remains the deferred Phase 4 accessibility check above; application branding migration has not been requested.

### README and documentation publication update - 7 October 2026

- User requested a README focused on **1 Customer, 1 Agent**, the expanded features and a GitHub push.
- Updated README.md with the persistent customer-agent concept, one-box-per-customer owner oversight, scoped history/consent/human takeover, and an explicitly planned roadmap covering FR-18–FR-27. Current local capabilities, setup and implementation status remain accurate.
- Publication scope is README.md plus the seven specification updates from the preceding request. No application source, migration, dependency or prior gate evidence changes are included.
- README local-link/fence checks and git diff whitespace review passed. Remote main matches local HEAD `b3ec8a26ce7007941d03d4d43d349c5c1ed18079`; a normal push can proceed. No application tests, lint, typecheck or build were run for this documentation-only change.
- Commit `dbb4a4674da499c4347741f45395ef28ea4d66bc` was pushed successfully to origin/main; `git ls-remote` confirmed GitHub main matches that commit. This follow-up record captures the verified publication result.
- README/publication request complete. No further implementation is requested; a later implementation turn resumes the deferred Phase 4 checkpoint. Current features and new roadmap items remain accurately separated.

### Business-product README revision - 7 October 2026

- User requested the exact tagline "Customer relationships. Clear orders. Confident operations." and a business-product-only README using the linked 404Hire README as a presentation reference.
- Rewrote README.md with a centred product identity, internal navigation, business overview, 1 Customer/1 Agent principles, audience/features tables, customer/owner experience, order journey, real existing previews and a clearly labelled product roadmap. Wrote original CustomerLane copy; the reference's competition, author, architecture and setup material was not adopted.
- Removed technical setup/configuration, package details, implementation phases, provenance, repository administration, dependency references and contribution/licence sections from README. Available and planned product capabilities remain distinguished; no application behaviour or gate status changed.
- Product-only wording, exact tagline, navigation anchors, image links, balanced fences and staged whitespace checks passed. Only README.md and this progress record changed; no app tests/builds were run.
- Commit `b27756462b8c734bdd9de0b1b45203dc3c78df83` was pushed successfully; remote main was verified against local HEAD. Product README revision complete. A later implementation request resumes the preserved deferred Phase 4 checkpoint; no new implementation work is requested.

### Technical README expansion - 7 October 2026

- User requested the technology stack, run instructions and complete product documentation, retaining the CustomerLane identity, "1 Customer, 1 Agent" and "Customer relationships. Clear orders. Confident operations." tagline.
- README now includes the current stack, architecture and authority boundaries, Windows prerequisites, pinned installation/start/stop commands, customer/owner walkthrough, configuration, command reference, repository structure, implemented API overview, data/security notes, troubleshooting and specification links.
- Setup and API descriptions were cross-checked against the published scripts, manifests, configuration, routes and seed behaviour. Roadmap features and assistant/worker foundations remain distinguished from released functionality. No application tests, builds, migration, seed or dependency installation were run for this documentation change.
- Independent application edits and checkpoint updates are present in the shared workspace. Preserve them and their verification state; publish only README and this documentation checkpoint, excluding unrelated implementation hunks.
- README local links, navigation/document anchors, Markdown fences, published command names and documentation whitespace checks passed. Commit ba5821facf69cb7d82be92ea5b70a319c1e5d990 was pushed to origin/main and the remote commit was verified. README request complete; follow the independent active checkpoint for later implementation work.

### Template for later checkpoints

```text
Updated:
Phase / status:
Completed this chunk:
Files and key functions changed:
Remaining items in this phase:
Tests: not run / gate pending / failed affected cases / passed (commands):
Known issues and exact error:
External dependencies:
Evidence / commit reference if available:
Exact next action:
Checks already passed that need not be repeated:
```

### Resume prompt

```text
Continue CustomerBuddy from IMPLEMENTATION_PLAN.md and AGENTS.md.
Read the active checkpoint and the current phase checklist first.
Inspect the relevant files and local changes; do not recreate completed work.
Build the remaining items for the current phase. Do not run automated tests,
lint/typecheck/build batches until that phase's build checklist is complete.
Then run its defined gate once; after fixes, rerun only failed/affected checks.
Save completed/remaining items, unverified changes, and the exact next action
in IMPLEMENTATION_PLAN.md before ending the turn or approaching usage limits.
Codex handles usable prototype Phases 1-6: hardcoded intent rules/templates,
real persistent business workflows, local documents/jobs and owner demo controls.
Do not implement live AI, managed-model adapters, MCP packages or WorkBuddy
Automation in Codex. Phase 6 completion is independent of future WorkBuddy access.
WorkBuddy independently rebuilds the full
final project in a fresh workspace in Phases 7A-7E; do not import/deploy the
Codex prototype or inherit its passing tests as final implementation evidence.
```

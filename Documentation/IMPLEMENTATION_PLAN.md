# BizBuddy — WorkBuddy Implementation Plan and Progress

Version 1.0 · 8 October 2026 · Fresh independent rebuild · Final authoring tool: Tencent WorkBuddy

Specification set: [PRD](PRD.md), [TRD](TRD.md), [App Flow](APP_FLOW.md), [Design Brief](DESIGN_BRIEF.md), [Backend Schema](BACKEND_SCHEMA.md). Start with [README](README.md).

## 1. Non-negotiable working rules

1. WorkBuddy builds the whole final project in a fresh workspace. Preserve every F01–F25 requirement, latest owner/customer layouts and listed routes. The prior Codex app is a behaviour/design reference.
2. Finish the current phase's entire build checklist before running automated tests, typecheck, lint or production build. Author meaningful tests during building; leave them unrun until the phase gate. No test watch mode, on-save testing, edit-triggered hooks or repeated full-suite checks.
3. Execute one planned gate batch at phase end. After failure, fix and rerun only the failed/affected checks. Broaden only for a material cross-boundary change; record why. An incremental repair is not a new excuse to run every suite.
4. `Built - gate pending` is a valid state. `Complete` means all build items and required gate pass. Prototype results and document preparation never count as WorkBuddy passes.
5. After a meaningful chunk, before ending a turn/tool handoff, and before usage/context limits, save done/left checkboxes, changed files, unverified changes, test evidence/errors/blockers and one exact next action here. Do not run tests simply to checkpoint.
6. On resume read this checkpoint, current phase and affected specs/files first. Inspect saved changes and evidence before repeating work. Do not reread all documents or rerun passed checks without a reason.
7. Model output never controls identity, money, owner approval, payment verification or capacity. Live AI is required where promised; fallback and explicit forms keep deterministic operations usable.
8. Keep synthetic fixtures isolated and labelled. No GitHub push, remote repo creation, HF upload, alternate provider switch or invented deployment/WorkBuddy evidence. Prepare release artifacts before seeking final publication authorisation.

## 2. Current status and checkpoint

**Reference-document preparation:** Complete in Codex; this status concerns only the specification folder. WorkBuddy app rebuild is **Not started**, all WorkBuddy gates **Not run**, account/model/cloud capability **Unverified**. Do not inherit root prototype phase numbers/completion.

| Phase | Required outcome | Stack/tools | Build | Gate |
| --- | --- | --- | --- | --- |
| WB0 | Account/runtime capability, locked stack, fresh scaffold | WorkBuddy, official Tencent docs/connector, Node/pnpm/Git | Not started | Not run |
| WB1 | Identity, schema, tenant scope, seeds, abuse infrastructure | WorkBuddy, Auth, PostgreSQL/SQL, Zod | Not started | Not run |
| WB2 | Deterministic commerce, loyalty/offer/review/payment services | WorkBuddy, TypeScript/domain/SQL/API | Not started | Not run |
| WB3 | Landing/manual, onboarding, ecommerce and core owner UI | WorkBuddy preview, React/Vite/Router/Tailwind/forms/query | Not started | Not run |
| WB4 | Agent board, operations, inventory/forecast/pricing/risk/calendar | WorkBuddy, UI/API/SQL, TS baseline | Not started | Not run |
| WB5 | Private PDFs, durable jobs/reminders/digests, Automation | WorkBuddy, worker/outbox/storage/pdf-lib/MCP | Not started | Not run |
| WB6 | Genuine customer/owner agents, scoped memory/tools/fallback | WorkBuddy, managed Tencent text AI, typed tool registries | Not started | Not run |
| WB7 | Generative growth/content/visuals and guarded engagement | WorkBuddy, managed text/image AI, assets/offers/consent/jobs | Not started | Not run |
| WB8 | Complete integration/security/AI/accessibility release candidate | WorkBuddy, phase gates/Playwright/AI rubric | Not started | Not run |
| WB9 | Tencent release package, final docs/slides and authorised publishing | WorkBuddy publishing/preview, Tencent deployment | Not started | Not run |

**Active checkpoint — ready for WorkBuddy intake, 8 October 2026:** All six specifications and README are written and reviewed against the current core/E1/UX1/S1 features, route source, exact commercial rounding and 14 requested must-have groups. The folder contains 23 unedited, indexed prototype screenshots (9 S1, 8 UX1, 6 E1) with clear provenance/precedence. Document review covered local links/fences, F01–F25 coverage, routes, phase dependencies, schema/authority, money/consent/AI limits and truthful rebuild status. No app source, packages or migrations changed; no application tests, lint, typecheck or builds run. Changed files: this folder's seven Markdown files and screenshot references; the original root Implementation Plan has a concise documentation checkpoint. No documentation blocker remains. Required future work: all WB0–WB9 build/gate checklists, actual account capability, live agents/images and final WorkBuddy evidence. Exact next action in a fresh WorkBuddy workspace: read README and this checkpoint, then perform WB0 account/runtime intake and scaffold; do not import prototype passing statuses. Remote publication: Not requested; no GitHub push.

Reference preparation checklist (Codex provenance):

- [x] Read latest checkpoint/specifications/rebuild brief and inspect implemented features.
- [x] Define F01–F25 and map all 14 user must-have groups.
- [x] Write fresh WorkBuddy PRD and TRD with live AI, scoped tools and dependency references.
- [x] Write independent phase plan and checkpoint protocol without importing prototype passes.
- [x] Finish App Flow, Design Brief and Backend Schema.
- [x] Copy/index current screenshot references with provenance/limitations.
- [x] Review all documents for feature/rule/phase/link consistency; application gates not applicable.

## 3. Gate/evidence protocol

WorkBuddy creates commands `pnpm gate:wb0` through `pnpm gate:wb8` and a documented WB9 deployed acceptance command where appropriate. These are target command names, not existing scripts. Each gate runs scoped tests plus current quality/build checks once after the phase is built. Include earlier regression checks only for actually affected boundaries. WB8 is the single broad final acceptance gate; WB9 checks deployment-specific differences.

Evidence goes to `Documentation/evidence/wbN/`: command/exit status, environment/runtime/model/version, implementation commit or content identifier, case IDs and results, failure/repair history, browser/PDF screenshots where relevant. Use synthetic data; redact credentials and private content. Preserve passing evidence across sessions. A manual check that was not exercised remains Pending, including exact mobile widths/actual zoom.

The suggested case groups below should become runnable assertions, not tests that just restate the implementation. Testing model adapters with mocks is useful for failure/scope mechanics, but real managed-model/provider cases are required in WB6/WB7/WB8.

## 4. WB0 — WorkBuddy intake, capabilities and foundation

**Outcome:** A fresh, runnable WorkBuddy project with verified feasible Tencent integrations. **Stack/tools:** WorkBuddy, official CloudBase connector/skills, supported Node LTS/pnpm/Git, React/Vite/Express/TypeScript scaffolds, capability/dependency records.

Build checklist:

- [ ] Read this folder and latest screenshots; record provenance, feature inventory and current checkpoint.
- [ ] Verify account edition/region, Auth, PostgreSQL atomic SQL/RLS access, private storage, managed text/tool calls, managed images, quotas, MCP transport, Automation and publishing.
- [ ] Resolve current CloudBase SDK migration/image-binding compatibility with actual official distributions; record versions/APIs, not guessed model IDs.
- [ ] Confirm native WorkBuddy app bindings or a supported Tencent server path enforce required scope/limits.
- [ ] Create new module layout, safe env templates, lockfile, route shells, health endpoint and local/Tencent packaging.
- [ ] Create capability/dependency registers and named phase gate runners; disable watch/on-save/per-edit hooks.
- [ ] Save checkpoint before gate.

End gate:

- [ ] One scaffold type/lint/build/startup gate; verified minimal Auth/DB/private-storage/text/image capability probes in an isolated test environment.
- [ ] Capture redacted account/runtime evidence and list missing capability blockers precisely; no unavailable feature marked complete.
- [ ] Update checkpoint/status. Proceed independently only on unaffected work while an external capability is pending.

## 5. WB1 — Identity, schema and scope

**Features:** F01, F03, F05 foundation, F24/F25 infrastructure. **Stack/tools:** WorkBuddy, verified Auth, new PostgreSQL migrations/restricted roles, SQL/pg adapter, Zod, synthetic fixture builder.

Build checklist:

- [ ] Generate full schema from Backend Schema with migration versioning/checksums; keep applied migrations immutable.
- [ ] Implement provider-subject mapping, owner business creation, pending customer invitations/linking, anonymous published storefront reads and production-safe sessions.
- [ ] Implement trusted request/transaction-local scope, composite foreign keys, RLS/grants, private file metadata scope and restricted worker/integration roles.
- [ ] Separate owner authority, customer record and club membership; append consent events and current versioned snapshots.
- [ ] Seed bakery plus isolated florist/service business, ten bakery customers, Farah/Jason histories, default policies/capacity, no-history/opt-out fixtures; clearly synthetic.
- [ ] Add shared rate/concurrency/budget state and safe audit/idempotency infrastructure without enabling AI yet.
- [ ] Author scoped identity/migration/integrity tests; save checkpoint.

End gate:

- [ ] Fresh migration/replay; two-business/two-customer read/write/file isolation; missing scope denied; pool context does not leak; forged role/subject rejected.
- [ ] Public store response contains no accounts/private records; business bootstrap cannot elevate an existing tenant role; invitation cannot impersonate recipient.
- [ ] Consent/club independence and security-definer/restricted-role paths checked; current type/lint/build once.
- [ ] Save results/errors and mark Complete only after all required checks pass.

## 6. WB2 — Commerce and deterministic decisions

**Features:** F05, F08–F10, F12/F17/F21/F22 service foundation. **Stack/tools:** WorkBuddy, shared TypeScript/Zod domain/API, SQL locks/transactions, immutable snapshots.

Build checklist:

- [ ] Implement profile/facts/catalogue/policies/slots/capacity publishing and current version lookup.
- [ ] Implement multi-item quotes, exact integer rounding, club/ethics snapshot, approved offer eligibility/expiry/redemption, and no stacking.
- [ ] Implement explicit confirmation challenge, quote/hash/benefit revalidation, stock/capacity lock ordering and atomic order/hold/outbox/idempotency commit.
- [ ] Implement unpaid expiry/lazy reconciliation, review/cancellation and immutable confirmed prices.
- [ ] Implement owner payment verification, duplicate/excess/late/risk guards, partial/deposit/full balance, threshold transition and receipt enqueue.
- [ ] Implement fulfilment states/tracking, full-balance completion and allocation/debit/cancellation-once mechanics.
- [ ] Implement exact-hash/version approvals, stale/expired decisions, support/takeover state and explicit resume.
- [ ] Author money/concurrency/authority/replay tests and save checkpoint.

End gate:

- [ ] PRD A02/A03/A06–A10 service expectations, including RM126/RM63, RM119.70/RM59.85, RM74.10/RM37.05 and odd-sen rounding.
- [ ] Last-capacity/last-stock contention, expiry/payment race, stale membership/policy/offer, changed idempotency payload, duplicate payment and full-balance completion.
- [ ] Customer/model/integration denied owner financial decisions; current quality/build plus only WB1 regressions affected by new writes.
- [ ] Update evidence/checkpoint.

## 7. WB3 — Landing, owner setup and core shopping UI

**Features:** F01–F05, F08–F10, F12. **Stack/tools:** WorkBuddy browser preview, React/Vite/Router/Tailwind/Lucide, Query, Hook Form/Zod, accessible dialogs.

Build checklist:

- [ ] Recreate separate product landing and user manual, with clear owner setup and demo/store entry.
- [ ] Real owner signup/login and resumable profile/collection/policy-availability/store-preview setup; readiness from saved data.
- [ ] Recreate cream/forest/terracotta ecommerce shell; images/prices/detail/search/product-service filters; actual published media.
- [ ] Scoped persistent guest/customer bag, safe guest merge, multi-item date/window checkout, exact quote card, review/Confirm/Edit and uncertain-write recovery.
- [ ] Club join/leave, separate newsletter/preferences, real discount display and owner programme editor.
- [ ] Customer own orders/detail/timeline/payment/documents/inbox shell and human contact; forms usable before AI phase.
- [ ] Recreate indigo owner shell/navigation/search/account/language, overview, orders/detail/reviews and saved settings.
- [ ] Build loading/empty/error/pending/stale/denied states; avoid placeholder successful controls; author browser cases and save checkpoint.

End gate:

- [ ] PRD A01–A04/A07 and A09 payment-control browser flow against real services; signup/reload/bag/membership isolation; one order after double click. Document links accurately show queued/preparing status here; actual generated PDFs are checked after WB5.
- [ ] Desktop/mobile visual comparison to latest references; keyboard/dialog focus; exact 360/400/768/1440 widths and actual 200% zoom.
- [ ] Current type/lint/build; targeted APIs only where UI integration changed service behaviour.
- [ ] Save screenshots, limitations and checkpoint.

## 8. WB4 — Operations, agent board, stock/forecast, risk and calendar

**Features:** F07, F11–F14, F21/F22, F23 calendar. **Stack/tools:** WorkBuddy, React/API/SQL views, inventory/lot ledger, TypeScript baseline; optional CPU library only if approved.

Build checklist:

- [ ] One card per business/customer, inactive/no-history contexts, latest interaction/counters, review filters and focused transcript drawer.
- [ ] Owner takeover/reply/resume; directory “View buddy” deep links; persistent lifecycle versus processing-state separation.
- [ ] Searchable members/orders, reconciled sales/invoice register, record drill-down and correct reporting-period labels.
- [ ] Stock receipt/adjustment/fulfilment, lots/expiry/waste, physical versus date capacity, atomic allocation/availability and shortage review.
- [ ] 28-day baseline/seven-day units/value, observed/missing/constrained data, synthetic/insufficient states, known-order split, replenishment/overflow explanations.
- [ ] Bounded price proposals and exact-version owner Approve and publish; immutable old orders.
- [ ] Private risk cases with deterministic signals and clear/block reason/appeal; no implicit payment verification.
- [ ] Monthly calendar, daily order/task agenda, task completion, profile opening hours/business time and ethics controls.
- [ ] Author meaningful operations/reporting tests and save checkpoint.

End gate:

- [ ] PRD A11/A12/A15: one-card projection, report/ledger reconciliation, stock/date concurrency, cancelled stock restore once, sparse forecast and stale price rejection.
- [ ] Review drawer keyboard/deep-link isolation; month/date/timezone and task-versus-booking distinction; no-history/long-language UI.
- [ ] Current quality/build and only affected commerce/scope checks justified by allocation/report changes.
- [ ] Preserve evidence/checkpoint; richer ML remains disabled without evidence, but required baseline must work.

## 9. WB5 — Private documents, jobs and WorkBuddy scheduling

**Features:** F10, F18 delivery foundation, F23. **Stack/tools:** WorkBuddy, private CloudBase storage, pdf-lib/licensed fonts, leased PostgreSQL jobs/outbox, verified Automation/restricted MCP.

Build checklist:

- [ ] Implement actual quote/summary/invoice/verified-receipt PDFs, scoped download and truthful availability/failure states.
- [ ] Implement bounded leasing/retry/recovery/deduplication and separate business action from document/delivery status.
- [ ] Implement deposit reminders, quiet hours, suppression, paused/takeover/opt-out guards and in-app inbox.
- [ ] Implement reconciled owner digest and visible job health, eligible retry/pause controls.
- [ ] Implement isolated synthetic demo clock/pause/advance/Run due jobs/digest/typed reset; production hard denial.
- [ ] Implement compatible restricted MCP tools and actual WorkBuddy Automation schedule; document desktop/background dependency and supported backend trigger if available.
- [ ] Author job/restart/private-document/scheduling tests; save checkpoint.

End gate:

- [ ] PRD A09/A10/A18: real PDF download/render inspection, receipt/payment match, scope denial, repeated job/restart no duplicates, quiet-hours/expiry/opt-out race.
- [ ] Protocol/schema/credential-permission checks and actual bounded Automation invocation; offline scheduler cannot cause overbooking.
- [ ] Current quality/build and only affected commerce/document regressions. Save evidence/checkpoint.

## 10. WB6 — Real customer and owner AI agents

**Features:** F06/F07, F16/F21, F24/F25. **Stack/tools:** WorkBuddy, verified managed Tencent text AI/tool calling, request-local typed registries, scoped knowledge/memory, shared rate/budget/circuit services.

Build checklist:

- [ ] Replace scripted dispatcher with actual managed model for customer and separate owner registry; record exact enabled model/binding and real usage.
- [ ] Implement BM/English/mixed-language grounding, published source references, consented memory correction/deletion and repeat-order clarification.
- [ ] Implement eligible recommendation explanation with neutral current-request/catalogue fallback for opted-out/no-history users.
- [ ] Implement request-local scope, tool argument/result validation, ordered runs, structured authoritative cards and no model purchase/owner authority.
- [ ] Implement TRD time/tool/model/token/rate/concurrency/day/credit limits, circuit breaker, cooldown, safe log redaction and cancellation/uncertain-write status.
- [ ] Implement prompt/knowledge/OCR/tool-output injection handling, customer-to-owner escalation denial and safe rendering.
- [ ] Truthful live-AI/fallback disclosure, quick actions/order forms and human help; no unknown-input fake success.
- [ ] Author adversarial/mechanics tests and at least 30 live-AI evaluation cases, without running them during edits; checkpoint first.

End gate:

- [ ] PRD A05/A08/A16 with real live model paraphrases/ambiguities/languages, source fidelity and correct customer history.
- [ ] Tool/role/scope injection, shared-request contamination, timeout/quota/provider failure, burst rate/concurrency, unknown-status write recovery and takeover suppression.
- [ ] Deterministic amounts 100% match services; one run never grants payment/approval/confirmation authority; report actual latency/usage/failures.
- [ ] Current quality/build and affected conversation/consent checks. Save evidence/checkpoint; mocks alone do not pass live AI acceptance.

## 11. WB7 — Functional engagement, generative content and visual AI

**Features:** F15–F20/F22/F24/F25. **Stack/tools:** WorkBuddy, managed text/image AI, async asset worker, draft revisions, offers/consent/delivery guard, editable Markdown/SVG composition.

Build checklist:

- [ ] General/custom batch announcements, recommendations, personalised promotion and after-sales campaign types with actual grounded drafts.
- [ ] Real approved offer entitlement/expiry/redemption wired to standard quotes; no stacked/invented discount or marketing disguised as service.
- [ ] Purpose/channel/personalisation/service consent, eligible audience preview, contact/quiet-hour/takeover/pause/stock/offer guard recheck on dispatch.
- [ ] After-sales cases/replies and one optional check-in; complaints/dietary safety/refunds require owner review.
- [ ] Live SEO/product/marketing/email/newsletter/social/PR drafts; BM/English facts consistent; Chinese draft/review; preserve editing, revisions and Markdown export.
- [ ] Actual Tencent image job/status/private stored asset; rights/alt text/generated illustration label; editable poster headline/colour/layout/SVG export.
- [ ] Exact content/asset/audience/terms revision approval and invalidation after edit; actual in-app delivery outcome. Optional external connector only after restricted supported acknowledgement path.
- [ ] Image/text generation quotas, async timeout/retry/cost controls, failure recovery, opt-out-after-enqueue, ethical content checks and meaningful test authoring; checkpoint first.

End gate:

- [ ] PRD A13/A14: recorded Orange Cake batch → real AI copy/image → exact owner review → only eligible inboxes; provider asset persists after URL expiry.
- [ ] Revision invalidation, queued opt-out, expired offer/batch, full cross-channel cap, quiet hours, takeover and duplicate/uncertain sends.
- [ ] Facts/languages/recommendation eligibility, false scarcity/manipulation rejection, actual applied promotion quote; failed generation labelled accurately.
- [ ] Current quality/build plus affected consent/offer/stock/job checks. Save actual provider evidence; a template alone cannot pass generative AI.

## 12. WB8 — Full release-candidate acceptance

**Features:** All F01–F25. **Stack/tools:** WorkBuddy, accumulated gates/evidence, one broad release batch, Playwright, AI scenario rubric, privacy/security review.

Build checklist:

- [ ] Finish required features and remove dead primary controls/fixed totals/mock AI/fake downloads.
- [ ] Review feature-to-route-to-schema coverage; reconcile adapted contracts and ensure every original must-have is present.
- [ ] Prepare representative synthetic fixtures, scenario expected outcomes, manual baseline and evaluation reporting.
- [ ] Finish exact mobile/actual zoom/keyboard/contrast and generated-content/document failure states left pending by previous phases.
- [ ] Finish restart/recovery/retention/consent-derived deletion, secret segregation and deployment-safe configuration.
- [ ] Save checkpoint with all remaining blockers before final gate.

End gate:

- [ ] One full PRD A01–A18 acceptance and required deterministic/security/concurrency/job/browser/live-AI/visual scenarios.
- [ ] Verify all F01–F25 and final quality/build; report actual sample size/model/usage/failures and no fabricated efficiency/revenue/forecast/fraud claims.
- [ ] Inspect mobile/desktop screenshots, actual PDFs/assets, recovery and UI accessibility; record limitations honestly.
- [ ] Repair failures with affected checks only; materially broad fixes justify specific regression expansion. Record release candidate as Complete only when required checks pass.

## 13. WB9 — Deployment, final docs/slides and release

**Outcome:** Reviewable Tencent deployment and competition deliverables generated in WorkBuddy. **Stack/tools:** WorkBuddy publish/preview, supported Tencent hosting/Auth/DB/storage/worker, WorkBuddy document/slide creation tools.

Build checklist:

- [ ] Create safe deployment/migration/configuration and rollback/recovery instructions; restricted credentials, allowed origins, quotas and private storage policies.
- [ ] Prepare isolated demo environment with live AI plus labelled synthetic transactions; production mode denies demo identities/clock/reset.
- [ ] Generate final README/user manual/architecture/schema/setup/privacy/limitations/evaluation/dependency/deployment documents in WorkBuddy.
- [ ] Generate final presentation slides in WorkBuddy: problem, general SME flow, owner/customer demo, real agents, forecast/growth/human control, measured evidence and provenance.
- [ ] Prepare a working demo script and actual screenshots/recordings from the rebuilt app; never reuse Codex screenshots as final implementation evidence.
- [ ] Prepare publication for review; record pending authorisation. Do not push to GitHub or upload HF artifacts.

Deployment end gate and release checklist:

- [ ] Test the actual isolated Tencent preview/staging environment: auth/scope/private downloads, cold start, restart, retried worker, schedule, quotas and live AI/images.
- [ ] Only deployment-affected checks are repeated; use WB8 evidence for unchanged application boundaries.
- [ ] Verify final document/slide rendering, links, demo completeness, provenance and organiser-rule evidence.
- [ ] Publish only after explicit authorisation; record real URL/time/environment and rollback result, or truthfully mark publication Pending.
- [ ] Final checklist and checkpoint identify completed features, conditional integrations disabled and any required unfinished work. No release Complete while required work remains.

## 14. Checkpoint template — overwrite active state, append concise evidence

```markdown
### Active checkpoint — <date/time and timezone>
Phase/subphase: WB<N> — <name>
Implementation identity: <local commit or content identifier; no invented hash>
Build status: Not started / In progress / Built - gate pending / Complete
Gate status: Not run / Failed / Passed / Partially passed (list pending checks)

Completed this chunk:
- [x] <specific delivered behaviour and relevant Fxx>

Remaining in this phase:
- [ ] <specific next build item>
- [ ] <gate only after all build items complete>

Changed files: <exact paths and purpose>
Unverified changes: <what has not been checked; never infer a pass>
Passing evidence to preserve: <path, command, content identity, cases>
Failures/repairs: <exact failing checks and affected rerun plan>
Blockers/decisions: <dependency and impacted work; None if clear>
Exact next action: <one actionable step/file/function/scenario>
Regression scope if needed: <specific boundary and reason>
AI/cloud state: <actual model/runtime capability; Unverified if not checked>
Remote publication state: <Not requested / Pending approval / actual verified URL>
```

When usage is low, save this checkpoint immediately and stop cleanly at a recoverable boundary. Never rush a full suite, mark unchecked work complete or use elapsed time as approval. On the next session continue from the exact next action with existing passing evidence intact.

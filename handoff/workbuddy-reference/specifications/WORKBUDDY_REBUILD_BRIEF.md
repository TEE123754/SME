# CustomerBuddy - WorkBuddy Independent Rebuild Brief

Version 0.4 | 7 October 2026 | Prototype checkpoint preserved; expanded final requirements specified, not built; rebuild Not started.

## 1. Purpose

The Codex project is a local reference prototype. Its purpose is to make the product behaviour and design concrete enough for Tencent WorkBuddy to recreate the project independently.

The prototype must be usable: real persisted orders, owner decisions, synthetic payment verification, documents, local reminders and reconciled digest. Only assistant intent handling/wording is hardcoded. It has no live AI, WorkBuddy MCP connector or WorkBuddy Automation, and needs no model/cloud keys. This is a complete local milestone at Phase 6; agentic implementation is intentionally deferred to WorkBuddy Phase 7.

| Reference implementation | Required future WorkBuddy replacement |
| --- | --- |
| Hardcoded intent rules/templates and quick actions | Genuine request-local managed-AI orchestration; preserve explicit forms/confirmation |
| Local worker and owner demo clock/job controls | Supported backend workers plus WorkBuddy Automation; disable demo controls in production |
| Loopback synthetic identity | Verified cloud identity and newly implemented scoped access |
| Local PostgreSQL migrations | Independently authored cloud schema/migrations with the same invariants |
| Scoped local document storage | Newly implemented private cloud storage/downloads |
| Real prototype business services and owner UI | Newly authored equivalent workflows, tested against reference outcomes |

WorkBuddy starts a fresh project and builds the final frontend, backend, database migrations, agent tools, tests, cloud configuration, deployment and documentation. This is a full rebuild from references, not an import/deployment of Codex source or build output.

**Added final target:** PRD FR-18–FR-27 cover the owner customer-agent board, owner/customer AI queries, stock/sales forecasts and management, controlled dynamic pricing, engagement/after-sales, multilingual content/visual generation, transaction-risk review and ethical safeguards. Existing core features are reused. All requested expansion workflows are required to claim the expanded release complete, sequenced after the core. Optional advanced models and external delivery depend on supported infrastructure/data; honest baseline/unavailable and approved draft/export/in-app workflows still need implementation. This documentation update builds no feature and leaves the saved Phase 4 prototype gate unchanged.

Reference materials retain their Codex provenance. The final implementation and documents retain their WorkBuddy generation evidence. Whether external reference preparation is permitted by the track is not established by this brief.

## 2. Source references available now

- [PRD](<PRD.md>): product scope, business rules, requirements and acceptance expectations.
- [TRD](<TRD.md>): architecture, recommended stack, API and tool boundaries.
- [App Flow](<APP_FLOW.md>): routes and customer/owner/state journeys.
- [Design Brief](<DESIGN_BRIEF.md>): visual tokens, layouts, components and accessibility targets.
- [Backend Schema](<BACKEND_SCHEMA.md>): record meaning, constraints, isolation and transaction requirements.
- [Implementation Plan](<IMPLEMENTATION_PLAN.md>): reference phases, rebuild subphases and progress/checkpoint contract.

These are planning documents. Codex Phases 1–3 have built and verified the route shell/API/database foundation, synthetic sessions, scoped data and commerce APIs; screenshots and gate results are in docs/evidence. The complete handoff recordings, business fixtures, sample commercial documents and acceptance evidence are still Phase 6 deliverables; foundation evidence is not a completed business demo.

## 3. Reference pack to produce in Codex Phase 6

Planned location: `handoff/workbuddy-reference/`. Keep it portable and remove credentials/customer secrets.

| Material | Contents and purpose |
| --- | --- |
| `REFERENCE_INDEX.md` | Version/date, file index, prototype status, provenance, limitations and reading order |
| `specifications/` | Updated PRD, TRD, flow, design and schema requirements with links made portable |
| `screenshots/` | Customer and owner screens at mobile/desktop sizes; quote, deposit, review, payment/receipt, expiry and error variants |
| `walkthrough/` | Short step-by-step demo with visible state transitions; optional screen recording |
| `fixtures/` | Ten synthetic customers, approved catalogue/policies, consent, capacity and sample orders; identifiers contain no real personal data |
| `contracts/` | API inputs/outputs, error cases, tool permissions and sample authoritative response cards |
| `scenarios/` | At least 30 conversation inputs plus commerce/security/concurrency/job cases and expected outcomes |
| `sample-documents/` | Fictional quote, invoice, order summary and verified-demo-payment receipt showing required fields |
| `prototype-evidence/` | Actual prototype gate results, measured mechanics and known limitations; scripted mode is explicit and not model accuracy |
| `scripted-demo/` | Supported intents/phrases, template versions, quick actions, fallback behaviour and local clock/job walkthrough; clearly mark what genuine AI must replace |
| `expansion-specifications/` | FR-18–FR-27 flows/design/schema/API and acceptance expectations, labelled unbuilt; no invented screenshots or model results |
| `dependency-candidates/` | Portable copy of TRD Section 15 repository/model register, primary links, checked date, licence/runtime/data/authority gates; no downloaded model weights, credentials or vendor code bundle |

Do not include compiled application output or make the Codex source repository the main handoff artifact. If source is consulted later to explain behaviour, retain its origin and treat it as reference, not as the final app to copy/publish.

Screenshots are visual targets, not proof of backend correctness. Fixture data may be reused as input; SQL migrations and tests are generated anew in WorkBuddy.

## 4. What the new WorkBuddy project must preserve

1. One persistent customer context with scoped order history and consented optional memory.
2. BM/English conversations and exact dates/slots; browser chat is the primary channel.
3. Integer-sen quotes and deposits using owner-approved versioned information.
4. Explicit customer confirmation bound to the visible proposal; a model cannot authorise a purchase.
5. Atomic capacity/hold handling, expiry reconciliation, payment/expiry race safety and idempotent retries.
6. Explicit owner approvals, human takeover/resume and payment verification; no model refund execution or fabricated receipt.
7. Private scoped documents, durable jobs/outbox, quiet-hour reminders, suppression and retry recovery.
8. Reconciled owner digest/metrics, accurate errors and separate synthetic/managed-AI labels.
9. Request-local managed AI tools and restricted owner MCP/Automation through supported Tencent services.
10. Actual cloud access controls and newly generated acceptance evidence for the rebuilt implementation.
11. One persistent customer-agent card per customer across conversations, including inactive/no-history contexts; real human-review reasons and safe interaction history with takeover/resume.
12. Separate owner AI queries and customer-scoped chat; typed sourced answers never grant publication, approval or payment authority.
13. Physical batch stock/waste/expiry and reconciled sales/invoices, distinct from production quotas; forecast uncertainty/data sufficiency and owner-reviewed price changes with immutable confirmed amounts.
14. Purpose/channel-consented recommendations, announcements, promotions and after-sales service; exact revision owner-approved multilingual content/assets, frequency/quiet-hour/opt-out suppression and truthful delivery states.
15. Advisory transaction-risk cases with evidence, owner clearance/appeal and ethical controls for sparse-data bias, privacy, manipulation and AI transparency.

The common stack recommendation is React/Vite/TypeScript, Node/Express/TypeScript, PostgreSQL and typed tools on CloudBase-backed WorkBuddy services. WorkBuddy selects supported versions and generates suitable deployment adapters. Necessary differences are recorded against the required behaviours rather than hidden.

## 5. Rebuild sequence and completion

Use the detailed checklists in Implementation Plan:

- **7A:** Fresh scaffold, configuration, cloud environment, core/expansion schema and identity; verify candidate dependency/model licences and Tencent runtime capability.
- **7B:** New deterministic business services/API, commerce/stock/offer transactions, price publication, risk/review/consent authority and reconciled sales/invoice views.
- **7C:** Recreated core UI plus agent board/owner queries/planning/content/risk screens, private documents/assets and guarded background jobs.
- **7D:** Build genuine customer/owner managed-AI orchestration, restricted MCP/Automation, recommendations/content/visual generation and forecast/risk/ethical behaviour. Build 7D.1–7D.3 before the single defined subphase end gate.
- **7E:** Deployment-specific core and expansion acceptance, final publishing and WorkBuddy-authored documents/slides; distinguish baseline acceptance from disabled conditional upgrades.

Build each subphase fully, then run its gate. After repair, rerun failed/affected checks only. Do not reuse the prototype's passing status to mark a new feature verified. Save a WorkBuddy progress plan/checkpoint after meaningful chunks and before usage-limit handoffs.

Final completion requires a new WorkBuddy source/project, its own valid migrations/tests, a functioning managed-AI flow, final deployment evidence and documentation generated in WorkBuddy. The existence of this reference brief does not fulfil those items.

### Expanded reference-to-rebuild mapping

| Requested feature | Existing reference / new requirement | Required WorkBuddy evidence |
| --- | --- | --- |
| Owner agent dashboard | Reuse customers/conversations/runs/review data; new one-card projection, active/inactive lifecycle and linked review reasons | Exactly one context per customer, inactive/history/no-message cards, scoped transcript and multiple-case/takeover states |
| Stock prediction and sales forecasting | Capacity remains a production quota; add real lots/movements/sales series, baseline/uncertainty and production suggestions | Concurrent last-lot allocation, waste/expiry reconciliation, insufficient history, cutoff/rolling backtest and known-order vs incremental-demand split |
| Dynamic pricing | Reuse deterministic quote/catalogue publication; new bounded signal-based immutable proposals | Explicit owner publication, stale-version rejection, bounds, customer requote and unchanged confirmed invoice/order amounts |
| Owner/customer chatbot and NLP | Customer AI already planned for 7D; add separate read-only owner registry and complex-query evaluation | BM/English/mixed-language clarification, sourced summaries and adversarial customer-to-owner scope denial |
| Announcements/recommendations/promotions/after-sales | Reuse optional consent and handoff; add channel/personalisation/service permissions, campaign revisions and support cases | Recorded sellable batch, current consent, cap/quiet hours/pause/takeover/expiry checks, opt-out after enqueue and real outcome states |
| Multilingual content and visual AI | New grounded SEO/marketing/email/social/PR drafts and Tencent-managed image jobs | Same verified facts/terms across BM/English, exact-revision approval/export, generated illustration provenance/rights and async failure recovery |
| Fraud detection | Reuse duplicate-payment/integrity/owner verification; add explainable risk signals, private cases and optional anomaly scores | Invalid duplicate denial, benign anomaly clearance/appeal, false-positive reporting; no risk-model financial authority or scam-prevention guarantee |
| Invoice + sales + stock | Invoices/payments/orders already specified; extend views and batch stock without another ledger | Record-reconciled completed sales/booked value/cash/outstanding amounts and actual private documents |
| Ethics and risks | Reuse scope/consent/scripted disclosure; extend sparse-data bias, no tracking/manipulation and AI provenance | Neutral choices for new/opted-out users, derived-data deletion, rejected manipulative drafts, honest forecasts/AI imagery and human appeal |

### Repository / model compatibility contract

Use the primary-source register in **TRD Section 15**, checked 7 October 2026: [CloudBase AI Toolkit](https://github.com/TencentCloudBase/CloudBase-AI-Toolkit) and [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) for supported authoring/restricted integration; [StatsForecast](https://github.com/Nixtla/statsforecast) for optional forecasting; [scikit-learn](https://github.com/scikit-learn/scikit-learn) for optional ranking/anomalies; [FlagEmbedding](https://github.com/FlagOpen/FlagEmbedding)/[BGE-M3](https://huggingface.co/BAAI/bge-m3) for optional multilingual retrieval; [Presidio](https://github.com/data-privacy-stack/presidio) for optional redaction; existing [pdf-lib](https://github.com/Hopding/pdf-lib) for documents. These utilities do not replace WorkBuddy orchestration or Tencent hosting and cannot inherit owner authority.

Prefer currently supported official CloudBase managed text and server-side Hunyuan image services; verify actual model catalogue, SDK, region/credits/timeouts. [Official image Node guide](https://docs.cloudbase.net/en/ai/image-model/node-sdk). [HunyuanImage-3.0 GitHub](https://github.com/Tencent-Hunyuan/HunyuanImage-3.0) and [HF weights](https://huggingface.co/tencent/HunyuanImage-3.0) are evaluation references under a custom licence with territory/use restrictions and large GPU requirements, not default dependencies or proof of managed-image entitlement. Check the actual selected revision and service terms. Archived CloudBase SDK GitHub mirrors are not build-source recommendations.

No external HF inference account/API, competing agent framework, replacement cloud, unrestricted admin MCP exposed to customers or copied vendor demo app is selected. A supported private Tencent statistical/retrieval service is conditional on packaging evidence; a documented simple baseline is the first choice. Record adopted package/model version, licence/notice, integrity, data access and costs in the new dependency register. The architecture is designed to avoid orchestration/provider conflicts; full runtime compatibility and competition eligibility require actual account/rule evidence and are not claimed by source browsing.

## 6. Prompt to give WorkBuddy after the reference pack is ready

```text
Rebuild CustomerBuddy completely in a fresh WorkBuddy project using the
attached reference pack. Read REFERENCE_INDEX.md, then the PRD, TRD,
App Flow, Design Brief, Backend Schema, fixtures and acceptance cases.

The existing Codex project is only a reference prototype. Generate new
frontend, backend, schema/migrations, agent tools, tests, cloud configuration,
deployment and final documentation using WorkBuddy. Do not import/publish
the Codex app or treat its compiled output/source as the final project.
Keep references and their provenance separate from your new implementation.

The reference app uses hardcoded intent rules and response templates, with
real saved business workflows and local jobs. Its demo is usable without
WorkBuddy or model keys. Replace the scripted assistant/local scheduling
with actual scoped managed AI and supported WorkBuddy tools/Automation in
your new implementation. Scripted prototype results are workflow expectations,
not proof of live-AI accuracy or an existing completed agent integration.

Use the required behaviours and design as the acceptance target. Preserve
customer isolation, consent, integer-sen prices, explicit confirmation,
atomic reservations, owner decisions/payment verification, private files,
idempotency, reminder suppression and honest failure states. Use supported
Tencent CloudBase-backed WorkBuddy services and managed AI. Verify the
account/runtime/region/quotas/charges before relying on cloud features.

Implement the requested expansion FR-18 through FR-27 after the rebuilt
core: one box per persistent customer-agent context with all active/inactive
history and human-review reasons; separate scoped owner/customer AI queries;
physical batch stock and reconciled sales/invoices; transparent demand/sales
forecasts; bounded owner-approved dynamic price publication; recorded-batch
announcements, consented recommendations/promotions and after-sales cases;
reviewed BM/English SEO, marketing, email, social/PR drafts and supported
Tencent visual jobs; advisory fraud-risk review and ethical controls.
Reuse existing invoice/approval/payment/consent services. Keep physical stock
separate from production quota, confirmed price snapshots immutable and all
financial/price/content decisions outside model and integration authority.
Recheck consent, frequency, quiet hours, takeover, stock/offer validity and
deduplication before customer sends. No silent cross-platform tracking,
manipulative shopping prompts, public scammer labels or fabricated images,
forecasts, payments or delivery results.

Read TRD Section 15 before adopting GitHub/Hugging Face candidates. Keep
WorkBuddy orchestration and Tencent hosting/managed AI; optional statistical,
retrieval/redaction packages are narrow private backend utilities, not a new
agent platform. Pin versions/model revisions and licence notices; verify
Python/GPU packaging and account capability. Start forecasts with transparent
baselines and an honest Insufficient data state. Use supported server-side
Tencent image services; open Hunyuan weights are evaluation references, not
a default local dependency. External email/social delivery stays disabled
until restricted identity/consent/acknowledgement is verified; approved draft
export and in-app engagement still need to work.

Follow rebuild subphases 7A-7E. Finish each subphase's build checklist before
running its defined test gate. Generate and execute your own tests; use
prototype results only as expectations. After a failed gate, rerun only
failed/affected checks unless a documented broader change requires more.

Create IMPLEMENTATION_PLAN.md in your new project. Update completed and
remaining items, changed files, gate status, blockers and the exact next
action after meaningful chunks and before reaching usage limits. Do not
repeat completed work or mark built-but-untested work as complete.

Finish with the rebuilt app, deployment evidence, new project documentation,
evaluation results and slides authored in WorkBuddy. Clearly label synthetic
customers/payments and describe the Codex reference and WorkBuddy rebuild
accurately. If a required feature is unavailable, record the rebuild as
partial/blocked rather than presenting the reference prototype as final.
Record core and expansion acceptance separately. Do not mark the expanded
release complete while required FR-18 through FR-27 workflows remain unbuilt.
Report unavailable conditional model/channel upgrades with truthful baseline,
draft/export/in-app behaviour and measured limitations; no simulated pass.
```

## Current Phase 4 references

Connected customer/owner workflows and screenshots are available as behaviour/design references. Six API cases and browser B01–B08 pass, while200% zoom remains pending by user choice; exact360px was clamped to 400px by the browser. These are Codex reference results, not WorkBuddy-authored source or rebuild passes. Phase 5 assistant/files/jobs and Phase 6 acceptance/reference pack are not built yet. Preserve this distinction when preparing the later independent rebuild.

## Phase 5 implementation checkpoint — 7 October 2026

Phase 5 is complete after its focused gate and affected repairs. The prototype now runs persisted, customer-scoped scripted responses with BM/English templates, private snapshot PDFs, bounded local jobs, in-app deposit reminders, saved owner digests and owner clock/pause/reset controls. This supersedes earlier Phase 4 notes that deferred these mechanics. Phase 4's 200% zoom remains pending by user choice. Phase 6 acceptance/reference packaging and all Phase 7 WorkBuddy/FR-18–FR-27 expansion work remain unimplemented. Evidence: [Phase 5 review](../prototype-evidence/phase5-review.md); [supported inputs](../scripted-demo/SCRIPTED_INPUTS.md).

Use Phase5 scenarios, rendered receipt and saved gate results as behaviour expectations only. Independently implement cloud identity/private download delivery, worker leases/idempotency, reminder guards and real managed-AI/tool boundaries. Prototype authenticated streaming and local file archives describe reference choices, not deployed Tencent capabilities. Source import and inherited prototype passes do not count as a WorkBuddy rebuild.

## Phase 6 completed local-reference milestone

Phase6 is Complete: usable scripted local prototype,111 integration/acceptance checks, quality/build, actual restart and screenshot/PDF inspection passed after affected repairs. Portable behaviour/design/schema/fixture/contracts/scenarios/evidence pack is handoff/workbuddy-reference, with no app source/migrations/builds/secrets. Health reports phase6; saved messages await scripted dispatch; expired quotes require a fresh quote. No commercial authority/schema change in this phase. Phase4 actual200%zoom remains pending by user choice; exact360px is tool-clamped400. Manual savings baseline is unmeasured. Tencent WorkBuddy independently generates/tests/deploys its new project in7A–7E; all FR18–27/cloud/managedAI expansion work remains Not started. Earlier checkpoints are historical records superseded by this current milestone.

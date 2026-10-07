# CustomerBuddy - WorkBuddy Independent Rebuild Brief

Version 0.3 | 7 October 2026 | Phases 1–3 complete; Phase 4 UI built, zoom gate pending; usable prototype and final rebuild not complete.

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

Reference materials retain their Codex provenance. The final implementation and documents retain their WorkBuddy generation evidence. Whether external reference preparation is permitted by the track is not established by this brief.

## 2. Source references available now

- [PRD](<C:/Users/Edison Tee/Downloads/SME/PRD.md>): product scope, business rules, requirements and acceptance expectations.
- [TRD](<C:/Users/Edison Tee/Downloads/SME/TRD.md>): architecture, recommended stack, API and tool boundaries.
- [App Flow](<C:/Users/Edison Tee/Downloads/SME/APP_FLOW.md>): routes and customer/owner/state journeys.
- [Design Brief](<C:/Users/Edison Tee/Downloads/SME/DESIGN_BRIEF.md>): visual tokens, layouts, components and accessibility targets.
- [Backend Schema](<C:/Users/Edison Tee/Downloads/SME/BACKEND_SCHEMA.md>): record meaning, constraints, isolation and transaction requirements.
- [Implementation Plan](<C:/Users/Edison Tee/Downloads/SME/IMPLEMENTATION_PLAN.md>): reference phases, rebuild subphases and progress/checkpoint contract.

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

The common stack recommendation is React/Vite/TypeScript, Node/Express/TypeScript, PostgreSQL and typed tools on CloudBase-backed WorkBuddy services. WorkBuddy selects supported versions and generates suitable deployment adapters. Necessary differences are recorded against the required behaviours rather than hidden.

## 5. Rebuild sequence and completion

Use the detailed checklists in Implementation Plan:

- **7A:** Fresh scaffold, configuration, cloud environment, schema and identity.
- **7B:** New deterministic business services/API, transactions and permissions.
- **7C:** Recreated customer/owner UI, documents and background jobs.
- **7D:** Replace scripted assistance with new actual managed AI orchestration, restricted owner tools and automations; build these features for the first time here.
- **7E:** Deployment-specific acceptance, final publishing and WorkBuddy-authored documents/slides.

Build each subphase fully, then run its gate. After repair, rerun failed/affected checks only. Do not reuse the prototype's passing status to mark a new feature verified. Save a WorkBuddy progress plan/checkpoint after meaningful chunks and before usage-limit handoffs.

Final completion requires a new WorkBuddy source/project, its own valid migrations/tests, a functioning managed-AI flow, final deployment evidence and documentation generated in WorkBuddy. The existence of this reference brief does not fulfil those items.

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
```

## Current Phase 4 references

Connected customer/owner workflows and screenshots are available as behaviour/design references. Six API cases and browser B01–B08 pass, while200% zoom remains pending by user choice; exact360px was clamped to 400px by the browser. These are Codex reference results, not WorkBuddy-authored source or rebuild passes. Phase 5 assistant/files/jobs and Phase 6 acceptance/reference pack are not built yet. Preserve this distinction when preparing the later independent rebuild.

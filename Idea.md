# 1 Customer 1 Agent: WorkBuddy Track (Agentic Solutions)

Updated 7 October 2026. Current direction: a usable Codex prototype with hardcoded demo assistance, followed later by a complete independent WorkBuddy rebuild.

## Track Details
- **Theme:** How can AI help students and small businesses solve real business problems and operate more effectively?
- **Original supplied tool rule:** Tencent WorkBuddy must be used for the entire project, slides, and documentation. This is recorded separately from the user's later prototype request; these Codex references are not claimed to satisfy that rule.
- **Credits:** WorkBuddy credits provided.

## Current Build Decision

Codex should build a prototype that can actually be used for a synthetic home-bakery demo. Hardcode the assistant's supported intent rules and BM/English response templates. Offer quick actions and an order form; unsupported text offers supported choices or owner handoff.

Orders, quotes, capacity, approvals, synthetic payment verification, preferences, documents, reminders and digest are real saved workflows. Replies use current API/database results rather than fixed success messages or totals. Display "Demo assistant — scripted responses" permanently. A local worker and owner demo clock/Run due jobs controls demonstrate follow-ups without WorkBuddy.

Leave live AI, managed-model adapters, MCP connectors, WorkBuddy Automation and Tencent deployment for the later fresh WorkBuddy project. The Codex prototype requires local Node/PostgreSQL but no WorkBuddy account, AI credits or cloud/model keys. Phase 6 accepts the usable prototype and reference pack; Phase 7 independently rebuilds the full project in WorkBuddy.

Use [PRD](<C:/Users/Edison Tee/Downloads/SME/PRD.md>), [TRD](<C:/Users/Edison Tee/Downloads/SME/TRD.md>), [App Flow](<C:/Users/Edison Tee/Downloads/SME/APP_FLOW.md>), [Design Brief](<C:/Users/Edison Tee/Downloads/SME/DESIGN_BRIEF.md>), [Backend Schema](<C:/Users/Edison Tee/Downloads/SME/BACKEND_SCHEMA.md>), [Implementation Plan](<C:/Users/Edison Tee/Downloads/SME/IMPLEMENTATION_PLAN.md>) and [WorkBuddy Rebuild Brief](<C:/Users/Edison Tee/Downloads/SME/WORKBUDDY_REBUILD_BRIEF.md>) as the detailed specification. This idea file is a concept summary, not additional implementation instructions from an attachment.

## Concept
The final product gives each customer dedicated, persistent assistant context with their history and consented preferences. Routine requests flow into actual business actions, with the owner handling exceptions. Codex demonstrates that behaviour through scripts; genuine agentic orchestration is built later in WorkBuddy.

**Target business (demo):** Aina's Home Bakery, a Malaysian home bakery. Use ten synthetic customers and synthetic payments.

## Key Features

| # | Feature | What it does |
|---|---------|--------------|
| 1 | Per-customer memory | Stores scoped order history, consented preferences and BM/English choice; supported mixed-language phrases in the scripted demo |
| 2 | Business knowledge base | Answers from the owner's own price list, FAQ, and policies |
| 3 | Assistant routing | Hardcoded intent dispatcher now; genuine scoped tool calling later; specialist names are logical roles |
| 4 | Action execution | Actual quotes, orders and downloadable PDF invoices/summaries/verified-demo-payment receipts |
| 5 | Deposit follow-up | One guarded in-app reminder via local jobs now; WorkBuddy Automation later; reorder marketing is P1 |
| 6 | Owner approvals | Discounts, custom orders and complaints go to review; refund execution is outside the MVP |
| 7 | Owner daily digest | Record-derived orders, verified deposits, unpaid amounts, capacity, reviews and failures; no churn prediction |
| 8 | Per-customer data isolation | Trusted server scope, consent controls and private documents; privacy compliance requires a separate real-pilot assessment |
| 9 | Student entrepreneur use | Same home-bakery workflow can support a student-run baking business; additional business types are later scope |
| 10 | Impact metrics panel | Measured workflow timing and owner effort with sample/baseline/limitations; scripted results are not AI accuracy or real revenue |

## Logical Roles for the Future Agentic Product

These names describe responsibilities. The Codex prototype uses one scripted dispatcher and deterministic domain services; it does not implement independent autonomous agents or WorkBuddy integration.
- **Orchestrator Agent:** routes each message to the right specialist
- **Customer Agent (1 per customer):** holds memory and context
- **Sales Agent:** quotes and standard order capture
- **Support Agent:** FAQ answers and escalation to a human
- **Billing Agent:** invoices, receipts, payment reminders
- **Inventory Agent:** production-capacity lookup; predictive restocking is outside the MVP
- **Owner Digest Agent:** daily summary and approval requests

## Demo Flow
1. Sign in as a synthetic customer in browser chat; see the scripted-mode label.
2. Select Order again or a supported phrase; load only that customer's saved history/preferences.
3. Collect exact product, quantity, pickup date and slot with structured controls.
4. Calculate a real quote from the current published catalogue; explicit Confirm reserves capacity and saves the order.
5. Off-policy requests create an owner review; approvals/payment verification stay in the owner UI.
6. Generate/download the invoice; owner verifies a synthetic deposit before any receipt appears.
7. Advance demo time and Run due jobs to demonstrate guarded reminders/expiry; Generate digest reconciles actual saved records.

## Deferred WorkBuddy Work

- Independently recreate the full project from specifications, screenshots, synthetic fixtures and expected behaviour; do not import/publish the Codex app.
- Author actual managed-AI customer orchestration and scoped business tools.
- Author restricted owner MCP tools/skills and verify supported WorkBuddy Automation.
- Implement verified cloud identity, database, private storage and Tencent deployment.
- Generate the rebuilt project's own tests, documentation and slides in WorkBuddy.
- Verify actual account/runtime/channel capabilities in Phase 7. Extra messaging channels are P1, with browser chat the primary channel.

## Risks and Watch-outs
- Do not add WhatsApp/Telegram or live integration dependencies to the current prototype.
- Final rebuilt-project slides/documentation are authored in WorkBuddy with accurate evidence/provenance. The original exclusive-tool rule still needs organiser interpretation for external preparation.
- Keep customer data separated per agent to avoid leakage.

## Success Metrics
- Average response time (before vs after)
- Owner hours saved per week
- % of requests resolved without human intervention
- Reminder eligibility/deduplication and reconciled synthetic payment totals; real conversion claims require a real pilot

## Next Steps
- [x] Choose the home bakery and browser demo channel.
- [x] Document the usable scripted-prototype strategy and phase-end test/checkpoint policy.
- [x] Build local foundation, database and real business APIs in Phases 1–3.
- [x] Build connected customer/owner UI in Phase 4.
- [ ] Finish deferred 200% zoom gate before marking Phase 4 Complete.
- [ ] Build hardcoded assistance, real documents and local jobs/demo controls in Phase 5.
- [ ] Accept the usable prototype and prepare references in Phase 6.
- [ ] Independently rebuild the full agentic project, deploy and author final materials in WorkBuddy Phase 7.

Phases 1–3 are complete with passing gates (Phase 1 includes browser review); Phase 4 is built with passing automated/flow checks and deferred 200% zoom review; Phase 5 has not started and the usable business prototype is not complete. Update the canonical progress checklist in Implementation Plan as each phase is built; run its checks once at phase end, then rerun only failed/affected checks after fixes.

## Phase 5 implementation checkpoint — 7 October 2026

Phase 5 is complete after its focused gate and affected repairs. The prototype now runs persisted, customer-scoped scripted responses with BM/English templates, private snapshot PDFs, bounded local jobs, in-app deposit reminders, saved owner digests and owner clock/pause/reset controls. This supersedes earlier Phase 4 notes that deferred these mechanics. Phase 4's 200% zoom remains pending by user choice. Phase 6 acceptance/reference packaging and all Phase 7 WorkBuddy/FR-18–FR-27 expansion work remain unimplemented. Evidence: [Phase 5 review](docs/evidence/phase5-review.md); [supported inputs](docs/SCRIPTED_INPUTS.md).

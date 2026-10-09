# BizBuddy — WorkBuddy rebuild instructions

Version 1.0 · 8 October 2026 · Reference author: Codex · WorkBuddy implementation: Not started

This folder is the current specification for a fresh Tencent WorkBuddy rebuild of BizBuddy. It includes the latest local prototype's core commerce, E1 business features, UX1 navigation and S1 onboarding/shopping. The finished WorkBuddy app must preserve those workflows and appearance while replacing scripted chat and content templates with working managed AI and agent tools.

## Read and use these files

1. [PRD.md](PRD.md): product requirements, all 14 requested feature groups, commercial rules and acceptance scenarios.
2. [TRD.md](TRD.md): WorkBuddy/Tencent architecture, tools, GitHub/Hugging Face dependency candidates, agent permissions and limits.
3. [APP_FLOW.md](APP_FLOW.md): exact customer/owner routes, navigation, journeys and failure states.
4. [DESIGN_BRIEF.md](DESIGN_BRIEF.md): separate owner and ecommerce designs, tokens, components and screenshot references.
5. [BACKEND_SCHEMA.md](BACKEND_SCHEMA.md): backend/database schema for WorkBuddy, including identity, commerce, stock, loyalty, AI, jobs and access policies. This is the requested “Background Schema”.
6. [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): fresh phase checklists, tools/stack for each phase, phase-end gates and resumable progress record.

Use these six files together. Product scope belongs to the PRD; authority, runtime limits and API contracts to the TRD; data integrity to the schema; navigation to App Flow; presentation to Design Brief; actual completion to the Implementation Plan. Record material adaptations in the affected documents. Resolve a contradiction explicitly instead of quietly dropping a feature.

All specification links are relative so this folder can be moved into a new WorkBuddy workspace. The `reference/screenshots/` images are copied, unedited Codex prototype references, indexed in Design Brief. Their example totals, historical messages and scripted-mode labels are reference data, not finished WorkBuddy evidence. The written requirements stand on their own if only Markdown files are supplied; attach the images for closer visual matching.

## Important rebuild boundaries

- WorkBuddy authors the final source, migrations, tools, tests, deployment configuration, documentation and slides in a fresh workspace. This is a complete rebuild from references.
- Preserve every F01–F25 requirement and every route in App Flow. Additional AI capability must call actual services and save actual records. No fixed success responses, static dashboard totals, simulated AI generation or fake downloads in release acceptance.
- Keep the customer storefront visually different from the owner's operational workspace. Keep the product introduction/user manual separate from the store and owner demo.
- Use the supported Tencent ecosystem. GitHub and Hugging Face links are dependency/model references, not alternative hosting or model API providers.
- Run automated tests, typecheck, lint and production build only when the current phase is fully built. After a failed gate, rerun only failed/affected checks. Save progress before context/usage limits; do not test just to save a checkpoint.
- Do not push to GitHub, create a remote repository, or upload artifacts to Hugging Face. Local version control is allowed. Publication in Tencent WorkBuddy is a later explicit release action.
- Synthetic customer/payment data remains labelled. A real managed-AI run can use synthetic business fixtures; these two labels describe different things.

The original track requires the end-to-end solution, slides and project documentation to be built exclusively in WorkBuddy. This folder and its screenshots were prepared in Codex. Disclose that provenance; these references do not establish competition eligibility. WorkBuddy must create its final deliverables and retain its own evidence.

The older Phase 6 reference ZIP predates E1/UX1/S1 and must not override this specification. Prototype passing tests are examples of expected mechanics, never passing results for the independent rebuild. Actual 200% zoom and exact small-mobile viewports were not fully verified in the prototype; WorkBuddy must verify them itself.

## Paste this into WorkBuddy

```text
Rebuild BizBuddy as a complete working Tencent WorkBuddy project in this fresh workspace. Read Documentation/README.md and all six linked specifications, then start from the active checkpoint in Documentation/IMPLEMENTATION_PLAN.md.

Preserve all F01–F25 requirements, existing owner/ecommerce layouts and listed routes. Implement real authenticated persistent services, managed-AI customer and owner assistants, consented memory, recommendations, reviewed campaigns, generative content and visual jobs. Keep money, capacity, stock, payment verification and approvals deterministic and server-authorised. Do not deploy the Codex prototype or copy its scripted assistant as the final AI.

Use WorkBuddy's supported Tencent cloud/model bindings and verify actual account capability before choosing SDK versions, model IDs, PostgreSQL transport, scheduling or MCP transport. Do not silently switch cloud providers. GitHub/Hugging Face sources are optional approved dependencies; do not push/upload there.

Build one complete phase before its planned gate. Author meaningful tests while building, but disable watch mode and per-edit test/lint/build hooks. After failures rerun only affected checks and preserve passing evidence. A built but untested phase is Built - gate pending. Update the Implementation Plan after meaningful chunks and before usage/context limits with changed files, done/left items, test state, errors, blockers and one exact next action.

Show functional workflows and truthful AI/synthetic/fallback states. Do not mark release complete until all required features and WorkBuddy-owned acceptance gates pass. Prepare a reviewable deployment and final documentation/slides in WorkBuddy; publish only when explicitly authorised.
```

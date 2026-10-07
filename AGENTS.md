# CustomerBuddy workspace guidance

This workspace contains the CustomerBuddy specifications. Follow the user's current request; the existence of an implementation plan does not itself request that code be built.

## Specifications and progress

- Read `IMPLEMENTATION_PLAN.md` and its active checkpoint before implementation.
- Use `PRD.md`, `TRD.md`, `APP_FLOW.md`, `DESIGN_BRIEF.md`, and `BACKEND_SCHEMA.md` as the agreed specification set.
- Codex implements a local reference prototype in Phases 1-6. Tencent WorkBuddy independently rebuilds the full final project in a separate workspace in Phase 7, including source, migrations, tools, tests, deployment and documentation.
- The Codex prototype must be usable end to end. Implement a hardcoded, rule-based demo assistant with supported intents, response templates, quick actions and an order form. Read current records and invoke real business services; do not hardcode successful orders, payments, available capacity, documents or dashboard totals.
- Defer live AI, managed-model adapters, WorkBuddy MCP packages/connectors, WorkBuddy Automation and Tencent cloud provisioning to Phase 7. No WorkBuddy account, model API key or AI credits are required to run the local prototype.
- Local job processing and owner demo clock/Run due jobs controls must make reminders, documents and digests demonstrable without WorkBuddy. Phase 6 is a complete usable-prototype milestone even while Phase 7 remains Not started.
- Phase 6 produces a portable behaviour/design/schema/fixture/screenshot reference pack. Do not treat the Codex app as the source package to import or deploy as the final WorkBuddy project.
- Read `WORKBUDDY_REBUILD_BRIEF.md` before preparing the reference pack or rebuilding in WorkBuddy.
- Do not claim this Codex-first approach meets the original WorkBuddy-only competition requirement. The distinction is recorded in the PRD.
- Keep specifications aligned with material implementation changes; avoid rewriting unrelated sections.

## Phase-end checks

- Complete one phase/subphase's build checklist before executing its automated test/quality/build gate.
- Do not run full suites, lint, typecheck or production builds after each edit. Do not enable test watch mode, automatic test-on-save, or per-edit hooks.
- Author meaningful tests during the phase, then execute its gate once at phase end.
- After a failed gate, rerun only failed/affected checks. A material cross-boundary change may justify broader verification; record why.
- Preserve passing evidence across sessions within the same implementation. The independent WorkBuddy rebuild needs its own tests; prototype passes are only reference expectations. A built phase with an unrun gate is `Built - gate pending`, not Complete.

## Checkpoints and limits

- Update `IMPLEMENTATION_PLAN.md` after each meaningful work chunk, before ending an implementation turn, before a tool handoff, and when usage/context is getting low.
- Save completed and remaining checklist items, changed files, test state, errors, blockers and the exact next action.
- Do not run tests merely to checkpoint a partial phase. Record that its changes remain unverified.
- Resume from the saved checkpoint; inspect relevant changes before repeating work.
- Once specifications are familiar, read the checkpoint/current phase and relevant sections instead of rereading the whole document set after every edit.
- Do not invent completion, test results, deployment URLs, commits or WorkBuddy evidence.

## Product boundaries

- Use synthetic customers and payments for the demo; permanently label the Codex assistant "Demo assistant — scripted responses". Never present rule matching as live AI or general language understanding.
- Enforce customer scope and owner authority outside model prompts. Money, payment verification and capacity are deterministic business operations.
- Keep owner approvals/payment verification out of customer model tools and WorkBuddy integration credentials.
- Never expose database credentials or integration secrets in browser code or generated artifacts.
- Do not silently replace the specified Tencent deployment/agent integration with another provider.

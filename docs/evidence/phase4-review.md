# Phase 4 review — built, accessibility gate pending

7 October 2026 · Codex local reference · Node 24.14.0/PostgreSQL 17.11-5 · No cloud, real payments or model calls.

Customer sign-in, consent/preferences, saved conversations, catalogue/order form, quote editing, confirmation and order detail now call the persisted API. Owner overview, payment verification, exact proposal decisions, takeover/reply/resume, publication and capacity editing are usable. Automation/Evidence report saved counts and clearly defer jobs/documents/replies to Phase 5.

## Verification

Final `pnpm typecheck`, `pnpm lint` and `pnpm build` passed. Six focused API cases passed in a disposable database which was removed. Initial gate failures and affected repair runs are retained in phase4-gate.json. API tests were repeated after the shared message-write repair; unchanged earlier-phase suites were preserved.

Browser P4-B01–B08 passed. P4-B09 is partial: desktop and mobile reflow, BM text, labelled fields, visible keyboard focus, skip link, menu close/Escape, status/alert roles and core text contrast passed. This is DOM/visual inspection, not a full assistive-technology audit. Requested1280 desktop measured 1422 CSS pixels under existing90% browser scaling. Requested360 mobile was clamped to 400, with383px client/scroll width. Owner default measured 1298 CSS pixels. Temporary overrides were reset. Final customer reload had no console errors.

**Remaining:** 200% browser zoom. The supported locator shortcut did not change browser zoom; the user explicitly chose “Leave this check pending”. No 200% or exact360px pass is claimed. Phase 4 remains Built — gate pending, and Phase 5 has not started.

## Repairs

- Separate session context and mutation hooks for Fast Refresh; use Hook Form useWatch.
- Fix duplicate imports caught by the affected compiler/build run.
- Read persisted preference `value`; keep profile language aligned with the topbar's saved language.
- Preserve message insertion order while business time is paused, using the serialized conversation write and a monotonically increasing timestamp (minimum1ms). Earlier synthetic equal-timestamp messages are retained as historical ties.
- Persist the selected conversation per customer/business in sessionStorage and distinguish same-minute conversations with a short ID. Server scope still controls every read/write.

## Synthetic evidence

DEMO-0A9FC590: totalRM78, verifiedRM39, balanceRM39, production booked, persisted after reload. DEMO-DF29A65B: owner approved10% quote, explicit customer confirmation, totalRM70.20/depositRM35.10, unpaid hold. Jason could not read Hana's order. Evidence reconciled four orders and RM165 verified synthetic payments. Capacity10→11→10 and catalogue7800→7900→7800 were exercised through owner UI; knowledge version3 remains published. Optional favourites were removed by consent withdrawal; payment/order history retained.

Desktop, BM mobile and owner-payment screenshots are adjacent. No generated invoice/receipt file or delivery is claimed. Full scripted dispatch, documents, reminders, leases, demo clock/jobs/reset controls remain Phase 5. WorkBuddy independently rebuilds in Phase 7.

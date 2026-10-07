# UX1 review — 8 October 2026

Completed local UI/UX redesign. The optional Instagram reel could not be fetched; the implemented design uses the observed app problems and agreed product workflows. This is a Codex reference demo, with scripted assistant labels and synthetic records/payments. No WorkBuddy, model, backend, migration or deployment changes.

## Delivered

- One role-aware grouped sidebar replaces the customer sidebar plus nineteen competing owner tabs. Collapsed settings, page search/Ctrl or Meta K, compact account/language controls and native mobile navigation.
- Overview uses actual saved values: five active orders, RM556.20 non-cancelled booked value, RM204 verified synthetic payments, three pending reviews and seven order-stage records. Names, schedules and amounts link to the corresponding business flows. Twelve members after the synthetic browser fixture was added. No invented trends or sales growth.
- Search/status order directory, searchable member directory, explicit detail links, useful empty/reset states and labelled mobile cards. Add member is a native modal with pending/error/success feedback from the existing service.
- One agent card per customer; review-first ordering, consistent cards and a native interaction drawer. Member-to-agent URL linkage and close/focus return preserve existing authorised owner controls.
- Restrained canvas/white/indigo theme, consistent spacing/type/statuses and clear forms. Customer chat emphasises booking, with optional forms/facts/reviews in native disclosures. Checkout makes basket, exact quote and explicit review/confirmation distinct; mobile quote review receives focus/scroll.

## Phase-end quality

Initial [gate](gate.json) retained a missing Dashboard type import and mutable chart offset lint failure. Repaired affected checks, then production build passed. The [final affected gate](final-affected.json) passed after route-focus, mobile labels, disclosures and quote-focus refinements.

Final accessibility acceptance found backward Tab leaving a native modal and one preparing-state colour at4.42:1. Added shared keyboard containment to all four dialog types and darkened that status colour. [Affected accessibility gate](focus-affected.json) passed compiler, lint and production build. Six core text/action/status pairs now meet4.5:1 in [contrast evidence](contrast.json). This is not a comprehensive inherited-style audit. The build still reports its non-failing603.78KB chunk-size advisory (181.27KB gzip).

React review: hook listeners clean up, effects focus/navigate without changing business data, stable record keys, semantic table headers/labels, disabled/pending controls, native dialog naming/inertness plus explicit Tab containment, quote validity/review reset, real record-derived totals and role-scoped route guards. No new dependency or per-edit test/watch hook.

E1's65 passing business scenarios are preserved; no integration suite was repeated for frontend presentation. Browser acceptance is separate from the compiler/lint/build gate.

## Browser acceptance

1. Overview priorities and stage counts rendered; awaiting-deposit priority opens three of seven saved orders.
2. Order search for Avery narrows to one; unknown search shows reset; Clear filters restores seven.
3. Member search for Hana narrows to one. Created synthetic Demo Morgan; real success closes modal, returns focus, and its account appears at sign-in. This is the only new member fixture.
4. Hana's View buddy deep link opens the saved transcript in a drawer; Escape clears the parameter. Card opening, backward/forward Tab wrapping and Escape/card focus return verified after the repair. No takeover/reply/approval submitted.
5. CtrlK opens focused page search; no-match feedback, typed stock/member result, Tab/Enter navigation and Escape verified. Settings expansion exposes real destinations.
6. Mobile navigation opens/closes and Escape restores menu focus; repaired keyboard traversal stays inside. Member form backward Tab wraps to Create and Escape returns Add member. Search backward Tab wraps to a result.
7. New Morgan account has empty scoped order history with a booking entry point. Optional chat order/help disclosures open their real existing controls; legacy business slug has the correct Your buddy label.
8. Two-item checkout returns the actual RM126 quote/RM63 deposit and Malaysia time window. Confirm is disabled before the review checkbox, enabled afterward; changing the schedule discards the quote and review state. Quote receives focus and mobile scroll. No confirmation/payment performed.
9. Calendar, Sales, Risk and Content headings render with no alert banners or horizontal document overflow. Existing E1 behaviour evidence remains authoritative for their business writes.
10. Requested400px runtime viewport measured428px. Stock, order cards, agent drawer, checkout, member directory and final overview match document/scroll width428px. Final mobile language control remains visible at44px height. Default desktop viewport restored and owner overview left open.

Browser details: [record](browser.json). Screenshots: [overview desktop](overview-desktop.png), [overview mobile](overview-mobile.png), [agents](agents-desktop.png), [interaction](agent-interaction.png), [orders desktop](orders-desktop.png), [orders mobile](orders-mobile.png), [members mobile](members-mobile.png), [checkout mobile](checkout-mobile.png).

## Limits and continuity

Actual200% zoom remains pending by the user's prior choice; exact360px remains unverified because this runtime clamps the requested width. No general accessibility certification is claimed. The reference ZIP from Phase6 remains historical. Specifications and README preview links are aligned; no commit/push, reset, real payment, external message or WorkBuddy rebuild evidence was created.

No required UX1 implementation remains. Later user requests should preserve this evidence and the independent WorkBuddy boundary.

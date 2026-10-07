# CustomerBuddy - Design Brief

Version 0.3 | 7 October 2026 | Phase 1 visual route shell complete and reviewed; full customer/owner app remains later-phase work.

Related: [App Flow](<C:/Users/Edison Tee/Downloads/SME/APP_FLOW.md>), [PRD](<C:/Users/Edison Tee/Downloads/SME/PRD.md>).

## 1. Direction

Create a calm, practical assistant for a Malaysian home bakery. The customer experience should feel personal and clear; the owner experience should make today's decisions and upcoming pickup workload easy to scan.

Working identity: **CustomerBuddy**, presented to customers as **Aina's Home Bakery assistant**. Use a simple CB mark or Lucide bakery icon. Photography and generated illustrations are optional future enhancements; the MVP can communicate the product with typography, catalogue cards and transaction details.

The main design priority is confidence in the next business action: what is being ordered, what it costs, what has been reserved, and who must act next.

## 2. Users and devices

- Customers: mobile-first chat and order confirmation, beginning at 360px viewport width.
- Owner/student entrepreneur: desktop overview at 1280-1440px, with usable mobile views for reviewing exceptions and payments.
- Demonstrator: side-by-side customer and owner views, clearly labelled synthetic records and scripted prototype mode. Managed-AI labels apply only to the future rebuilt app.

Support BM and English without fixed-width labels that break when translated. In Codex, support a documented set of Manglish/example phrases and quick actions; do not imply general comprehension. Business cards retain clear standard labels and exact amounts.

## 3. Visual tokens

| Token | Proposed value | Use |
| --- | --- | --- |
| Page background | `#F7F4EF` | Warm neutral canvas |
| Surface | `#FFFFFF` | Cards, chat, forms |
| Primary text | `#242D28` | Body and headings |
| Secondary text | `#56635C` | Supporting copy |
| Primary action | `#28604D` with white text | Confirm, Save, publish controlled changes |
| Soft green | `#EAF2ED` | Assistant/confirmed-state background |
| Accent | `#E8B69A` | Decorative emphasis, never essential status text |
| Border | `#D7DDD7` | Card and input separation |
| Warning | `#875300` on `#FFF4DA` | Awaiting review, expiring hold |
| Error | `#A12D2D` on `#FFF0F0` | Failed action or blocked state |
| Success | `#246044` on `#EAF5ED` | Verified deposit or completed action |

Use accessible contrast rather than assuming every colour combination passes. Target at least 4.5:1 for normal text and verify chosen combinations at the Phase 4 gate. Accent peach is a background/decorative token, not small text on white.

Typography: system sans-serif with optional self-hosted Inter. Body 16px/1.5, supporting text 14px, card heading 18px, page heading 28-32px. Display money with tabular numerals and `RM78.00`. Preserve raw integer-sen values in the data layer.

Spacing scale: 4, 8, 12, 16, 24, 32 and 48px. Card radius 12px; controls 8px. Use subtle borders and minimal shadows. Buttons and primary tap targets should be at least 44px high. Provide visible focus outlines and reduced-motion support.

## 4. Customer chat layout

At desktop widths, centre a conversation panel of approximately 760px with an optional 320px order-summary panel. On mobile, use one column; quote and status cards appear inline. A sticky composer must not cover confirmation controls or the last message.

Header shows bakery name, the permanent "Demo assistant — scripted responses" label, language control, and Ask owner. User and assistant bubbles have distinct alignment and readable surfaces. Timestamps are secondary; order state is explicit text. Use genuine AI disclosure only in the future WorkBuddy implementation.

Provide View products, Order again, New order, Check order and Ask owner quick actions. New order opens labelled product, quantity, exact date and pickup-slot fields. Unknown text shows these choices without losing the message. A customer must be able to complete a standard order without guessing a scripted phrase.

Quote card hierarchy:

1. Product and quantity.
2. Exact pickup date and slot.
3. Itemised total and deposit.
4. Quote validity and reservation notice.
5. Confirm order, Edit, Ask owner.

After confirmation, replace the proposal's action area with committed order state. Do not leave a second active Confirm control on an old card. Links to invoices/receipts show Preparing, Available, or Failed states.

Consent is a small onboarding panel with independent controls. Promotional follow-up is off initially. Memory consent is never bundled into Confirm order.

## 5. Owner workspace layout

Desktop uses a 220-240px sidebar and a flexible main panel. Navigation: Overview, Orders, Reviews, Customers, Knowledge, Capacity, Automation, Evidence. On mobile, collapse navigation into a labelled menu and convert dense tables to summary cards where practical.

Overview contains a date/reporting-period selector, four concise operating cards, pending review list, pickup workload, and failed-job alert. Suggested cards: confirmed orders, verified deposits collected, awaiting-deposit orders, pending owner decisions. Do not label an unpaid order total as cash received.

Orders show code, customer, pickup, total, verified paid amount, status, and next action. A row opens details; payment verification is an explicit action inside the detail view rather than an accidental row-click side effect.

Review detail places the proposed response/action beside business facts and the relevant conversation summary. Display amount, policy exception, object version and expiry before Approve/Edit/Reject. Rejection and financial decisions require clear labels; avoid ambiguous icon-only actions.

Capacity uses product/date rows with held, committed and remaining units. No predictive stock chart is needed for the MVP. Knowledge editing uses Preview then Publish and shows the active version.

Automation includes owner-only demo controls: visible current demo time, Pause/Resume clock, Advance time, Run due jobs, Generate digest and Reset demo. Keep these controls distinct from customer ordering; show synthetic-only confirmation for Reset. Report processed/suppressed/failed outcomes from the backend. The paused initial clock and lack of WorkBuddy integration must not prevent a full walkthrough.

## 6. Reusable components

Build shared Button, Input, Select, Textarea, Dialog, StatusBadge, EmptyState, ErrorBanner, LoadingState, DataTable/MobileCard, LanguageToggle and MoneyDisplay components.

Domain components: MessageBubble, ScriptedModeBadge, QuickActions, OrderForm, QuoteCard, OrderTimeline, DepositDeadline, ConsentPanel, ApprovalCard, PaymentVerificationForm, CapacityCell, DocumentLink, JobStatus, DemoControls and EvidenceTrace.

Keep presentation components free of commercial calculations. API totals and statuses drive the UI. Confirmation/approval components pass exact server object versions rather than recomputing authority in browser state.

## 7. Content and state design

Use plain, specific labels:

- "Quote prepared" before customer confirmation.
- "Reserved - awaiting deposit" only after capacity commits.
- "Deposit verified" only after owner verification.
- "Waiting for the owner" during takeover.
- "Reservation expired" when unpaid capacity was released.
- "Demo assistant — scripted responses" throughout the Codex prototype.

Prototype introduction: "I'm Aina's demo assistant, using scripted replies. Choose an action or use the order form to order. You can ask for the owner anytime."

All primary controls must perform their documented action, show a useful error or explain a state-based restriction. Do not use toast-only fake success, static KPI totals or placeholder document links. Hardcoded reply wording reads live saved amounts/statuses; owner changes must appear in subsequent customer views. Keep model/token metrics absent or Not applicable in scripted mode.

BM equivalent should be reviewed for natural phrasing while preserving the same promise. Avoid exaggerated claims such as "always available," "guaranteed allergen-free," or "payment received" without verified business state.

Show an inline error with a useful next action; reserve technical details for the owner Evidence view. For pending writes, retain the action identifier and show Checking status instead of suggesting a duplicate submission.

## 8. Accessibility and acceptance

At the Phase 4 end gate, inspect keyboard navigation, labelled fields, focus return after dialogs, screen-reader status announcements, colour contrast, zoom at 200%, mobile overflow, and language-length changes. Approval/confirmation must not depend solely on colour.

The independent WorkBuddy rebuild has its own UI acceptance gate in 7C and checks cloud/AI-affected states in 7D/7E. Prototype visual passes do not verify newly generated components. Model output must not replace a structured commercial card with contradictory pricing or status. Verify that labels and development identity controls follow the deployed mode.

## 9. Build and tooling

Codex implements prototype React/Tailwind/shadcn components during Phases 1 and 4. Phase 4 now supplies connected customer/owner business screens; quality/flow checks pass, with 200% zoom inspection pending by user choice. Phase 6 captures mobile/desktop screenshots, important state variants and tokens as references. No separate design platform is required. WorkBuddy recreates the components/screens independently in Phase 7, then creates presentation visuals from its rebuilt app. The reference pack and WorkBuddy implementation do not exist yet.

## Phase 4 visual evidence

Saved desktop customer, BM mobile and owner verified-payment screenshots are under docs/evidence/phase4-*. Customer desktop measured 1422 CSSpx; mobile request360 measured 400, no horizontal overflow. Core contrast: white/green7.32:1, body/cream12.92:1, muted/cream5.74:1, muted/white6.30:1. Labels, visible keyboard focus, skip link, status/alert roles and menu Escape/close were inspected; this is not a full screen-reader audit. Core customer copy is BM/EN; owner/technical labels remain English. Actual200% zoom is left pending by explicit user choice; do not mark Phase 4 Complete until recorded.

# BizBuddy - Design Brief

## Expanded local demo E1 (current user authorisation)

The user now explicitly requests a complete Codex local demo without WorkBuddy, using hardcoded/scripted methods. This supersedes earlier specification-only deferrals of expanded features for the local demo. Business profile/catalogue/facts support retail and services; dedicated agent cards, stock/forecasts/pricing, owner/customer assistants, engagement/content/visual templates, risk/ethical controls, calendar/tracking, checkout/members/appointments/sales are implemented with saved scoped records. See [expanded demo contracts and flows](docs/EXPANDED_DEMO.md) and [current checkpoint](IMPLEMENTATION_PLAN.md) for limits and verification status. Future WorkBuddy integration/rebuild remains separate; the existing Phase 6 ZIP is a historical pre-expansion snapshot.

Version 0.6 | 8 October 2026 | UX1 workspace redesign; expanded local demo retained; actual 200% zoom pending by user choice; independent WorkBuddy designs remain rebuild requirements.

Related: [App Flow](<C:/Users/Edison Tee/Downloads/SME/APP_FLOW.md>), [PRD](<C:/Users/Edison Tee/Downloads/SME/PRD.md>).

## 1. Direction

Create a calm, practical workspace for small retail and service businesses. The bakery remains the initial synthetic fixture. The customer experience should feel personal and clear; the owner experience should make decisions and upcoming fulfilment easy to scan.

Product and visible interface identity: **BizBuddy**, with the configured business name in the header. Existing internal package/database identifiers retain `customerbuddy` for compatibility; historical screenshots and reference packs retain their original branding. UX1 uses a general layered mark, restrained indigo accents and white panels. Typography, catalogue records and transaction details communicate the local demo without invented product photography. The Instagram reference was unavailable, so no unseen reference style is claimed. PRD FR-18–FR-27 continue to define the independent final-project requirements.

The main design priority is confidence in the next business action: what is being ordered, what it costs, what has been reserved, and who must act next.

## 2. Users and devices

- Customers: mobile-first chat and order confirmation, beginning at 360px viewport width.
- Owner/student entrepreneur: desktop overview at 1280-1440px, with usable mobile views for reviewing exceptions and payments.
- Demonstrator: side-by-side customer and owner views, clearly labelled synthetic records and scripted prototype mode. Managed-AI labels apply only to the future rebuilt app.

Support BM and English without fixed-width labels that break when translated. In Codex, support a documented set of Manglish/example phrases and quick actions; do not imply general comprehension. Business cards retain clear standard labels and exact amounts.

## 3. Visual tokens

| Token | Proposed value | Use |
| --- | --- | --- |
| Page background | `#F7F8FB` | Cool neutral canvas |
| Surface | `#FFFFFF` | Cards, chat, forms |
| Primary text | `#202534` | Body and headings |
| Secondary text | `#687082` | Supporting copy |
| Primary action | `#5651C8` with white text | Confirm, Save, publish controlled changes |
| Soft indigo | `#EFEFFB` | Selected navigation and assistant panel |
| Accent | `#D6B789` | Review-card border, never essential status text |
| Border | `#E6E8EF` | Card and input separation |
| Warning | `#8F662A` on `#FFF5E6` | Awaiting review, expiring hold |
| Error | `#A12D2D` on `#FFF0F0` | Failed action or blocked state |
| Success | `#437B58` on `#EDF6F0` | Verified deposit or completed action |

Use accessible contrast rather than assuming every colour combination passes. Target at least 4.5:1 for normal text and verify chosen combinations at the Phase 4 gate. Accent peach is a background/decorative token, not small text on white.

Typography: local system sans-serif. Workspace body 14px/1.5, form/table text 12-14px, supporting metadata 11-12px, card heading 16-17px, page heading 28px (25px mobile). Display money with tabular numerals and `RM78.00`. Preserve raw integer-sen values in the data layer. Verify legibility with real records; the deferred actual zoom check remains separate.

Spacing scale: 4, 8, 12, 16, 24, 32 and 48px. Card radius 12px; controls 8px. Use subtle borders and minimal shadows. Buttons and primary tap targets should be at least 44px high. Provide visible focus outlines and reduced-motion support.

## 4. Customer chat layout

At desktop widths, centre a conversation panel of approximately 760px with an optional 320px order-summary panel. On mobile, use one column; quote and status cards appear inline. A sticky composer must not cover confirmation controls or the last message.

Header shows the configured business, language and account controls. The shared sidebar, mobile navigation and footer permanently retain "Demo assistant — scripted responses". User and assistant bubbles have distinct alignment and readable surfaces. Timestamps are secondary; order state is explicit text. Use genuine AI disclosure only in the future WorkBuddy implementation. A primary Start a booking link opens checkout. Optional owner-help, single-item form, reviews and facts use native disclosures; existing offers open visibly when present. Quick-action wording is readable while dispatched scripted intents remain unchanged.

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

Desktop uses one 220-244px sidebar and a flexible main panel. Workspace groups Overview, Customer agents, Orders & appointments, Calendar and Members. Business groups Sales & invoices, Stock & forecast, Human reviews and Risk review. Growth groups Engagement, Content studio and Business assistant. Settings & tools is collapsed unless its current route is selected. It includes catalogue, knowledge, capacity, ethics, automation, evidence and conversation archive. The competing owner-tab row is removed. Header page search supports Ctrl/Meta+K, filter, Tab/Enter and Escape. On mobile, native modal navigation traps focus and restores it on Escape; order/member tables become labelled cards. Account switching and language remain reachable.

Overview contains four linked operating cards: active orders, non-cancelled booked value, verified synthetic payments and pending human reviews. Upcoming fulfilments show three actual orders with customer names, exact amounts and windows. The order-stage ring uses saved counts with a readable legend; it does not imply trends or a reporting period. Attention links open saved reviews and the awaiting-deposit order filter. Business time links to demo controls. Do not label an unpaid order total as cash received.

Orders show code, customer, schedule, total, verified paid amount and status. Search filters code/customer/items; a URL status filter supports deep links from priorities. Explicit order/Open links lead to details; payment verification remains inside that view. Members uses a searchable compact directory and native Add member modal; successful real synthetic-account creation closes the form with feedback. View buddy opens the matching agent interaction drawer using a customer URL parameter. Drawer focus returns to the matching card when closed.

Review detail places the proposed response/action beside business facts and the relevant conversation summary. Display amount, policy exception, object version and expiry before Approve/Edit/Reject. Rejection and financial decisions require clear labels; avoid ambiguous icon-only actions.

Capacity uses product/date rows with held, committed and remaining units. The core prototype needs no predictive chart; the expanded WorkBuddy Stock/Forecast surfaces below add physical-stock and forecast views without replacing capacity. Knowledge editing uses Preview then Publish and shows the active version.

Automation includes owner-only demo controls: visible current demo time, Pause/Resume clock, Advance time, Run due jobs, Generate digest and Reset demo. Keep these controls distinct from customer ordering; show synthetic-only confirmation for Reset. Report processed/suppressed/failed outcomes from the backend. The paused initial clock and lack of WorkBuddy integration must not prevent a full walkthrough.

## 6. Reusable components

Build shared Button, Input, Select, Textarea, Dialog, StatusBadge, EmptyState, ErrorBanner, LoadingState, DataTable/MobileCard, LanguageToggle and MoneyDisplay components.

Domain components: MessageBubble, ScriptedModeBadge, QuickActions, OrderForm, QuoteCard, OrderTimeline, DepositDeadline, ConsentPanel, ApprovalCard, PaymentVerificationForm, CapacityCell, DocumentLink, JobStatus, DemoControls and EvidenceTrace.

Planned WorkBuddy expansion components: CustomerAgentCard, AgentLifecycleBadge, ReviewReasonList, OwnerQueryAnswer, SourceLinks, StockLotRow, StockMovementTimeline, ForecastChart/DataTable, DataSufficiencyNotice, PriceProposalCard, CampaignAudiencePreview, ContentRevisionReview, GeneratedAssetPreview and RiskCaseCard. These are design requirements, not implemented components. Existing order, review, money, consent and document components are reused.

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

## 10. Expanded WorkBuddy owner surfaces

Keep the existing navigation and add Agents, Assistant, Stock, Sales/Invoices, Forecast, Pricing, Campaigns, Content/Assets and Risk under readable Operations and Growth groups. The core prototype retains its current routes. Mobile navigation stays labelled and keyboard accessible; long lists need pagination/filtering instead of an overloaded overview.

### Agent dashboard: one box = one agent = one customer

Use a responsive grid: three cards on wide desktop where text fits, two on medium screens, one on mobile. Filters: All, Active, Inactive, Needs human review, Paused, Error; search customer label/code. Display counts from records and retain empty/never-contacted contexts. Multiple conversations belong inside the same card.

Card hierarchy: customer name/code and logical agent label; Active/Inactive lifecycle; processing state (Idle/Working/Waiting for owner/Paused/Error); latest interaction excerpt and timestamp; current task; review reason and count; Open conversation/Review case. Separate statuses prevent an active-but-idle agent being mistaken for a running model. Inactive uses readable muted treatment, not hidden/low-contrast history. A text/icon review badge and linked reason are essential; colour alone is insufficient.

Detail uses a customer-scoped interaction timeline plus orders/open cases/consent and a safe action log. Show Take over and Resume as explicit controls with current state. Do not display private reasoning or invented avatars/connections that imply multiple independent processes. Owner-wide AI answers appear in the separate Assistant surface.

### Stock, sales and forecasts

Stock table/cards show product/lot, production/receipt time, expiry, on-hand, allocated, sellable, sold and waste. Units and cutoff are explicit. Add movement/adjustment dialogs with quantity, reason, expected version and current balance; show negative-stock conflicts inline. Place production quota in a separate panel with held/committed/remaining counts.

Sales/Invoices reuse existing order/document links. Distinguish Completed sales value, Booked order value, Verified cash collected and Outstanding balance. Every KPI has reporting-period/timezone labels and record drill-down; unavailable invoices show Preparing/Failed.

Forecast chart uses solid actual observations, visually distinct projected values and an interval band only when the method supports it. Provide the same values in an accessible table. Show cutoff, horizon, usable-history coverage, baseline/model, backtest error and known-order/incremental-demand split next to the chart. Insufficient data, synthetic simulation and Stale result banners are visible. Production suggestion explains stock expiry, shelf life, batch size and capacity constraint, with Review plan rather than automatic purchase/stock buttons.

### Controlled pricing and owner queries

Price card puts current/suggested RM price side by side with bounds, percentage change, stock/expiry/demand reasons, source versions, effective dates and expiry. Separate Review, Approve and Publish actions; invalid/stale proposals refresh before approval. Explain that confirmed orders retain their snapshot and old quotes need a new confirmation. Never show personal willingness-to-pay or vulnerability targeting controls.

Owner Assistant answers show period/product filters, concise record-derived results, source links and any forecast uncertainty. Action requests link to the controlled form/review screen; chat has no Approve payment or Publish campaign shortcut that grants model authority. Customer chat retains its own disclosure and scoped context.

## 11. Engagement, content, visual and risk design

Campaign builder steps: purpose -> product/batch/offer -> language/copy/assets -> audience eligibility -> exact revision review -> approved schedule/export. Show consent-eligible counts, suppression reasons, configured cross-channel cap and quiet-hour window. Fresh-batch copy must link to a sellable recorded batch; an expired batch disables sending. Marketing and optional after-sales service permissions use separate labelled controls.

Content workspace offers SEO product description, marketing copy, personalised email, social post and PR draft types. BM/English previews preserve verified facts; additional languages show translation-review status. Display title/meta description, offer terms, factual source links, draft revision and AI-generated label. A content edit removes its approval visibly. Owner-reviewed export is a completed draft export, never "Posted" or "Email sent" without delivery evidence.

Asset cards show Generated illustration or Genuine product photo, job status, model/provider provenance, rights/review state and accessible alt text. Queued/Generating/Failed states survive navigation. Generated cake artwork that differs from sold goods carries an illustration label; do not disguise it as a photo of fresh inventory. AI images are stored privately until approved for the intended use. No preview uses a provider URL as a permanent asset.

Customer recommendation cards explain a simple reason (current request or consented history), real current availability/terms, neutral alternatives and Stop promotions. Offer selection returns to the ordinary quote/Confirm path. Prohibit fake countdowns, guilt prompts, addictive shopping streaks and obstructive opt-out. After-sales cases use the existing waiting/owner-handoff patterns.

Risk list uses "Needs verification" and specific operational reasons; avoid public labels such as "Scammer". Detail shows minimised evidence, rule/model version, uncertainty, deadline and owner Clear/Escalate with reason. Payment verification is a separate existing ledger action. Customer has a human-contact/appeal path, without exposure of anti-abuse rules or other customers' evidence.

## 12. Expanded visual acceptance and repository fit

WorkBuddy 7C verifies keyboard/focus/mobile/200% zoom, card pagination and inactive history, text review reasons, chart/table parity, stock-vs-capacity labels and copy revisions. 7D verifies truthful AI/generated-asset/forecast labels and unavailable/failed/suppressed states; 7E checks the deployed expanded journeys. Include long BM/English text, multi-reason cases, no-history customers and consent withdrawal after scheduling. None of these passes is claimed by this specification update.

Keep the established React/Tailwind/shadcn design system. The TRD Section 15 repository register provides backend forecasting/retrieval/redaction/document and Tencent visual options; no replacement UI, agent framework or external model-hosting provider is selected. Capture only built prototype screenshots in Phase 6; unbuilt expansion designs are labelled specifications rather than fabricated app evidence.

## Phase 4 visual evidence

Saved desktop customer, BM mobile and owner verified-payment screenshots are under docs/evidence/phase4-*. Customer desktop measured 1422 CSSpx; mobile request360 measured 400, no horizontal overflow. Core contrast: white/green7.32:1, body/cream12.92:1, muted/cream5.74:1, muted/white6.30:1. Labels, visible keyboard focus, skip link, status/alert roles and menu Escape/close were inspected; this is not a full screen-reader audit. Core customer copy is BM/EN; owner/technical labels remain English. Actual200% zoom is left pending by explicit user choice; do not mark Phase 4 Complete until recorded.

## Phase 5 implementation checkpoint — 7 October 2026

Phase 5 is complete after its focused gate and affected repairs. The prototype now runs persisted, customer-scoped scripted responses with BM/English templates, private snapshot PDFs, bounded local jobs, in-app deposit reminders, saved owner digests and owner clock/pause/reset controls. This supersedes earlier Phase 4 notes that deferred these mechanics. Phase 4's 200% zoom remains pending by user choice. Phase 6 acceptance/reference packaging and all Phase 7 WorkBuddy/FR-18–FR-27 expansion work remain unimplemented. Evidence: [Phase 5 review](docs/evidence/phase5-review.md); [supported inputs](docs/SCRIPTED_INPUTS.md).

Implemented Automation uses labelled clock/advance, bounded job processing, reminder pause, saved job/error/digest states and an explicitly typed reset section. Customer quick actions and saved scripted replies keep permanent scripted disclosure; historical reminders tell users to check the current order balance. Order pages show only available authenticated Download PDF links. Browser desktop and actual400px mobile views were inspected without horizontal content overflow; requested360px is clamped by the tool. Actual200%zoom remains pending, not passed.

## Phase 6 completed local-reference milestone

Phase6 is Complete: usable scripted local prototype,111 integration/acceptance checks, quality/build, actual restart and screenshot/PDF inspection passed after affected repairs. Portable behaviour/design/schema/fixture/contracts/scenarios/evidence pack is handoff/workbuddy-reference, with no app source/migrations/builds/secrets. Health reports phase6; saved messages await scripted dispatch; expired quotes require a fresh quote. No commercial authority/schema change in this phase. Phase4 actual200%zoom remains pending by user choice; exact360px is tool-clamped400. Manual savings baseline is unmeasured. Tencent WorkBuddy independently generates/tests/deploys its new project in7A–7E; all FR18–27/cloud/managedAI expansion work remains Not started. Earlier checkpoints are historical records superseded by this current milestone.

## S1 — Owner setup and customer shopping (8 October 2026)

S1 customer experience uses a separate ecommerce shell: cream canvas, forest text, terracotta actions, serif collection headings, illustrated product cards, top shopping navigation and mobile bottom navigation. Owner workspace retains its operational sidebar and a four-step setup checklist. Product illustrations are explicitly labelled, selectable from five local SVG assets (general parcel, brownie, cupcake, flowers, service). Never imply illustrations are product photographs or date capacity is current stock. Loading/error/empty states and visible keyboard focus are required. Existing deferred actual 200% zoom gate remains pending.


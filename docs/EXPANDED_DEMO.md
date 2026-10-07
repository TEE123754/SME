# CustomerLane — Expanded local business demo

This release is a Codex-authored, local, synthetic demonstration. CustomerBuddy remains the internal package name. It covers the user's expanded feature list through real saved services and labelled scripted/template simulations. It is not a live AI release or a WorkBuddy-authored competition submission.

## Feature map and demo walkthrough

| Requested feature | Screen / usable behaviour | Boundaries |
| --- | --- | --- |
| Agent dashboard | Owner → Agents; exactly one card per customer, latest message/run, activity filters, review flags, message/order/payment counts; review/take over/reply/resume | A persistent customer relationship projected from saved records, not a background live model |
| Stock / sales forecasting | Owner → Stock / Forecast; receive/adjust stock, ledger, 28-day demand baseline, seven-day units/sales estimate, sparse-data confidence, overflow/replenishment suggestions | Simple moving average; ranges are heuristic, no accuracy claims |
| Dynamic pricing | Suggest, review, approve/reject a proposal; approval publishes a fresh catalogue for everyone | Ethical bounds enforced; existing order prices retained; no customer-specific price discrimination |
| Chatbots | Customer chat and Owner → Assistant; read current records through supported intents/quick actions, recommendation and after-sales handoff | Demo assistant — scripted responses. Complex language can fall back; no claim of general NLP |
| Customer engagement | Owner → Engagement; announcement/recommendation/promotion/after-sales draft, audience preview, consent-aware approved delivery | Local customer inbox only. Promotions propose an owner-reviewed offer; do not automatically change checkout totals |
| Content and visual creation | Owner → Content Studio; SEO/marketing/email/social/PR copy; EN/BM/Chinese framing; editable copy/headline/colour; approve/export Markdown and SVG | Templates, not live generative AI. Names/descriptions preserved; translations/claims need review. Email placeholders are not sent |
| Fraud detection | Owner → Risk Review; amount/reference/cancelled/high-value flags, reasons and human clear/block decision | Rule screening cannot prove authenticity or guarantee scam prevention. Open/blocked cases gate verification; duplicate reference/overpayment rules remain absolute |
| Invoice + sales management | Owner → Sales and Appointments / Orders; booked/cancelled values, synthetic payments, product breakdown, invoice register/downloads | PDFs become available after real job processing; synthetic records only; cash/bookings differ from accounting revenue |
| Ethics and risk | Owner → Ethics plus customer Preferences; marketing pause, personalisation pause, daily contact cap and pricing limits | No cross-platform tracking, sensitive-attribute ranking, invented scarcity or hidden AI claims |
| Calendar | Owner → Calendar; monthly order/booking overview, selected-day agenda, task creation/completion | Asia/Kuala_Lumpur. Internal calendar reminders do not reserve booking capacity |
| Order tracking | Order detail; payment pending/partial/successful plus confirmed → preparing → ready → delivering → delivered/completed, saved timeline | Fully paid balance required for completion. Collection/services can complete from ready. No courier integration |
| Checkout | Checkout / Book; multi-item basket (up to ten SKUs), units/date/window, authoritative quote, review checkbox, confirmation challenge, saved order/tracking | No real card/bank collection; synthetic payment verification is owner-only |
| Members | Owner → Members; search, order/payment counts, consent summaries, create synthetic member with sign-in account | New consents default off; customer edits profile/preferences. No real customer onboarding |
| Appointments / Orders | Add service in Business Settings; configure date capacity; select service/date/window at checkout; view in orders/calendar | Daily booking capacity, shared existing time windows; no per-staff or room scheduling |

## Run the demo

Use the existing local `pnpm dev` setup. Apply additive schema with `pnpm db:migrate` before running this release; do not reset existing records. Sign in as owner or a synthetic customer. No new packages, model keys or cloud account are needed.

UX1 navigation: Workspace contains Overview, Customer agents, Orders & appointments, Calendar and Members. Business contains sales, stock, human reviews and risk; Growth contains engagement, content and the business assistant. Settings & tools expands to catalogue, knowledge, capacity, ethics, demo automation and evidence. Use header Search pages or Ctrl/Meta+K to find a destination. Mobile navigation is a labelled modal; language/account controls remain in the header. Orders and members use searchable compact directories, with readable mobile cards. Open interaction now opens a focused drawer; member View buddy links open that customer's drawer directly. Customer chat emphasises booking and hides optional forms in native disclosures; checkout shows basket → exact quote → reviewed confirmation.

1. Owner → Business Settings: change name/industry/fulfilment, publish English/BM business facts, add retail products or services. Bakery is retained only as the initial fixture; old routes remain compatible.
2. Owner → Capacity: set maximum units on a date for each new SKU. Stock receipt enables physical inventory tracking; services use date capacity.
3. Customer → Checkout / Book: add items, choose an eligible date/window and review/confirm a quote. The order appears in both customer and owner records and calendar.
4. Owner → order: verify a `SYNTHETIC-…` deposit. If needed screen/review it in Risk Review. Progress preparation/ready/dispatch; verify balance before completion.
5. Owner → Automation: Run due jobs to generate invoices/receipts and reminders. Download the actual generated PDFs from the order or Sales register.
6. Customer → Preferences: optionally enable memory/marketing and save a favourite. Owner → Engagement: draft, preview recipients, approve/deliver. Customer → My updates: view their scoped messages and recommendation.
7. Owner → Agents: inspect one customer per card, filter human reviews and take over a saved conversation. Owner Assistant reads summaries; Content Studio creates and exports reviewed templates.

## Persistence and API contracts

Migration `006_business_demo.sql` adds `products.kind`, the `preparing`/`delivering` order states, and nine RLS-protected tables: business_profiles, inventory_movements, price_proposals, marketing_campaigns, campaign_deliveries, content_drafts, risk_cases, calendar_events and order_tracking. Existing applied migrations are immutable.

Stock movements are append-only. Scoped inventory availability subtracts unpaid live holds and committed unprepared orders, including other customers without exposing their records. The shared business lock serialises receipt/reservation/status changes. Preparing goods become a fulfilment debit exactly once at ready; cancellation restores that debit. Service SKUs cannot receive stock or change type after an order references them.

Order tracking is recorded by a trusted DB trigger on state changes. Payment status comes from verified payments, independently of fulfilment. Sales summaries reconcile current saved ledgers rather than display hardcoded totals.

Owner-only routes: `/owner/agents`, `/owner/catalogue`, `/owner/business-profile`, `/owner/products`, `/owner/stock`, `/owner/prices`, `/owner/query`, `/owner/members`, `/owner/sales`, `/owner/calendar`, `/owner/risks`, `/owner/campaigns`, `/owner/content`, `/owner/ethics`. All writes use session, origin and CSRF guards; replay-sensitive changes use actor-scoped idempotency. Query is a read-only operation. Member creation uses a narrow owner-authorised synthetic bootstrap function, never role elevation.

Customer-only `/me/inbox` and `/me/recommendation`; scoped `/orders/:id/tracking`; existing quote/challenge/order/payment/document APIs remain authoritative. Marketing delivery checks current consent and guards inside its transaction; customer row locks coordinate consent withdrawal. No messaging connector is invoked.

## Visual requirements

The supplied dashboard image informed the one-customer card grid, circular initials/avatar, activity dot, review indicator, clipped message preview and three counters. UX1 refines it with a cool neutral canvas, white panels, restrained indigo controls, grouped navigation and consistent typography. Full transcripts open in a native modal drawer. Responsive layout collapses cards/forms and converts order/member rows to labelled cards; calendar retains seven columns and selected-day detail. Focus labels and keyboard controls use native forms/buttons/dialogs. Actual 200% browser zoom remains a previously deferred manual gate. The later Instagram UI reel could not be fetched; no unseen reference detail was copied or claimed.

## Verification

Build status and passing/failed evidence are recorded in `IMPLEMENTATION_PLAN.md` and `docs/evidence/expansion/`. Execute `node scripts/gate-expansion.mjs` once after the complete build. It covers typecheck, lint, production build, new integration tests and commerce/jobs regressions because migrations/order/PDF boundaries changed. Historical passing evidence is preserved before regressions. A failure requires only affected checks to be rerun.

E1 acceptance is complete within these demo boundaries: 65 integration/regression scenarios, final compiler/lint/build and browser workflows passed. See [acceptance review](evidence/expansion/review.md) and [browser evidence](evidence/expansion/browser.json). Actual 200% zoom remains explicitly deferred. The current E1 source is local; no new commit, push, cloud deployment or WorkBuddy authorship is claimed.

UX1 checks are recorded separately in [review](evidence/ux1/review.md), [gate](evidence/ux1/gate.json) and [final affected gate](evidence/ux1/final-affected.json). The UI-only phase preserves the E1 integration results; it does not rerun or replace them. Browser verification creates synthetic Demo Morgan and unconfirmed quote records, with no order/payment confirmation or external messaging. The existing Phase6 reference ZIP remains historical.

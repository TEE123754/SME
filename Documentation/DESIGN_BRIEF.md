# BizBuddy — Design Brief

Version 1.0 · 8 October 2026 · Recreate latest UX1/S1 layout and improve the live-AI states

Related: [PRD](PRD.md), [App Flow](APP_FLOW.md), [TRD](TRD.md), [Schema](BACKEND_SCHEMA.md), [Plan](IMPLEMENTATION_PLAN.md).

## 1. Design goal and fidelity

Preserve the existing product's hierarchy, route grouping, card/table density, setup steps and mobile behaviour. The owner is managing work; the customer is shopping. They share accessible components and typography conventions but use distinct shells, colours and information priorities.

Marketing introduction remains separate from the store/demo. Its landing page uses the shopping visual family, a split hero and a four-step user workflow. Final AI replaces scripted wording and metrics, while the business operations/card layouts remain familiar. Do not redesign everything into chat or one generic admin dashboard.

Use BizBuddy branding and the configured business name. Historical prototype screenshots retain their original CustomerBuddy branding; recreate visible product branding as BizBuddy in the rebuild. Screenshot example customer names/counters reflect synthetic prototype records; final UI derives these values from current data.

## 2. Visual tokens

These values come from the latest prototype CSS, not earlier green-only owner drafts. Recreate them as scoped tokens rather than allowing owner CSS to accidentally override ecommerce cards.

| Token | Owner workspace | Customer/marketing |
| --- | --- | --- |
| Canvas | `#F7F8FB` cool neutral | `#FFFDF9` warm cream |
| Surface | `#FFFFFF` | `#FFFFFF`, soft cream/sage feature panels |
| Primary action | `#5651C8` indigo | `#A6442C` terracotta |
| Main ink | `#202534` | `#242C2B` |
| Muted text | `#687082` | `#60675E` |
| Border | `#E6E8EF` | `#E9E7DE`/`#E4E7DC` |
| Selected navigation | `#EFEFFB`, readable indigo text | Forest selection `#243D35` with white text |
| Feature/announcement colour | Restrained lilac highlights | Forest `#243D35`, sage panels, terracotta accent |
| Radius | Panels 12px; controls 8px | Cards/panels about 18px; pill filters/rounded actions |
| Sidebar/content | 244px owner sidebar | No owner sidebar; centred store content |

Typography: local system/Inter-style sans-serif for owner/body/forms; Georgia-compatible serif for marketing/collection/member headings. Do not depend on an external font service. Owner body 14px/1.5; form/table 12–14px; panel titles 16–17px; page heading about 28px (25px mobile). Customer body about 14–16px, expressive serif hero scaling down on mobile. Money uses tabular numerals with `RM78.00` formatting. Store raw integer sen only in data/owner technical fields; normal shoppers see prices, not implementation units.

Spacing: 4, 8, 12, 16, 24, 32, 48px. White panels have subtle borders/minimal shadows. Primary targets at least 44px high. Core text/action contrast must be measured on the exact backgrounds (normal text at least 4.5:1); don't presume every source CSS combination passed. Clear focus outline, reduced motion and adequate disabled-state contrast are required.

## 3. Marketing page and manual

Desktop landing: top product header, generous cream canvas, left serif heading/body with Set up my business and Continue owner setup, right sage guided-start panel with numbered steps/icons. Below, a four-column owner workflow with concise explanations; then customer/demo store entry. Mobile collapses to one column with primary entry visible early.

Four steps: Make it yours (business/fulfilment), Build your collection (products/services/member perks), Set your availability (policy/date capacity), Preview your storefront. `/guide` provides owner/customer manuals with realistic steps and screenshots/illustrations, available before sign-in. Keep product benefits accurate; do not promise universal ERP, guaranteed sales or 24/7 availability. AI/data mode belongs in an unobtrusive but visible status area.

Owner setup is a saved-record checklist reusing actual profile/catalogue/knowledge/capacity editors, with progress/current step, validation and store preview. A visually checked step must correspond to valid saved setup, not temporary component state.

## 4. Ecommerce and customer account

Use warm cream, forest header/announcement, terracotta actions and serif collection headings. Header: configured business brand, Shop/Members/Orders/Help, bag count and account/language. Mobile has compact header and shopping bottom navigation with readable labels; pad content so fixed bars do not cover controls.

Store content width about 1280px within a 1400px header; roughly 40px desktop horizontal padding, reducing on mobile. Collection title and search sit on one row where space permits. All items/Products/Services pill filters and result count precede a responsive product grid (two/three where practical, one on narrow phone). Product card has generous image area, provenance badge, product/service/unit label, item title/description, price and Add to bag.

Detail shows image with honest alt text/provenance, title, unit description, published price, quantity and Add to bag; include business policy/booking context without claiming stock just from a date quota. Preserve the five reference illustration families: parcel, brownie, cupcake, flower, service. They may be recreated as vector assets; exact product photos should use owner-approved media.

Membership hero has serif “A little extra. Just for members.” hierarchy and three perk cards. Show effective member discount, optional news/offers and customer control. Separate Join/Leave and newsletter controls. Newsletter and memory/personalisation must not be prechecked by joining. Owner-paused programme and changed entitlement need readable states.

Checkout is bag → exact quote → reviewed confirmation. Show items, date/window and quote summary clearly, with a review checkbox and Confirm/Edit. After commit lead with saved order/tracking, not a new empty order form. Customer account uses compact order cards/timeline, inbox and preferences, keeping the store visual family.

## 5. Customer chat and commercial cards

Centre the conversation about 760px; optional 320px order summary on desktop, inline cards on mobile. Business/language/account and human help remain accessible. Sticky composer must not cover latest content/confirmation. Give Your buddy, quick actions and Start a booking a clear hierarchy; optional facts/reviews/form disclosures may be collapsed.

Quote card order: product/quantity → exact date/window → itemised base/savings/final/deposit → quote validity and capacity recheck → Confirm/Edit/Ask owner. A service response defines amounts/state. After confirmation replace old action area with order status and disable stale Confirm. Preparing/Available/Failed document links describe actual file state.

Real AI disclosure: “AI assistant · Answers use this business's published information. You can ask for the owner.” During an outage show “AI is temporarily unavailable” with supported form/tracking/help choices. Historical scripted prototype screenshots keep their label; the final normal live assistant does not falsely call itself scripted. Synthetic transactions have a separate mode label even when AI is real.

## 6. Owner workspace

Sticky 244px white sidebar and flexible cool-neutral main area. Use the exact Workspace/Business/Growth/Settings groups in App Flow; do not restore the competing tab row. Header has business/breadcrumb, Search pages with Ctrl/Meta+K, language and account. Settings collapses when unused. Mobile menu uses a labelled focus-trapped modal with Escape/close/focus return.

Overview: heading/short purpose/calendar action; four linked cards for active orders/booked value/verified payments/reviews; business time row; actual upcoming fulfilments and order-state ring/legend; attention queue and assistant invitation. Do not hardcode screenshot totals or add an invented trend. Every metric labels its period and links to records; synthetic collected cash stays labelled.

Orders/members are searchable compact directories, with explicit Open/View buddy links and filters rather than entire verbose transcripts in rows. At mobile widths convert tables to labelled cards. Member Invite/Add profile is a native accessible modal with validation; success closes it and updates records. Order detail keeps exact amounts/payment/status/timeline/review/document actions together.

## 7. Customer-agent cards and drawer

Use a responsive grid: three cards where text fits, two at medium widths, one on phone. Each card includes initials/avatar, activity dot plus text, name/buddy/code/language, lifecycle badge, review reason/count, clipped latest interaction/time, current task/run outcome, three counters (messages/orders/verified paid) and Open interaction.

One card represents one business/customer, not each conversation/model request. No-history card says No interaction yet and keeps zero counters. Inactive retains readable history. Separate Active/Inactive eligibility from Idle/Working/Waiting for owner/Paused/Error processing; active does not imply a model continuously runs. Review status is backed by actual case records, never fabricated confidence.

Open interaction uses a focused drawer/native dialog with transcript/cases/orders/consent, safe action results and Take over/Reply/Resume. Deep-linked member selection opens this same view. Close restores focus to the originating card/link. No private reasoning trace, secrets or decorative “agent connections” implying permissions.

## 8. Planning, reporting and risk surfaces

Stock cards/table show units, physical on-hand/allocated/sellable, lot age/expiry, waste and append-only movement history. Keep booking/production capacity visibly separate. Receipt/adjustment dialogs show current balance/quantity/reason/version and inline concurrency error. Services say Uses booking capacity.

Forecast chart pairs actual and visibly distinct projected data with an accessible table; add an interval band only if justified by method. Adjacent metadata: cutoff/timezone/horizon, history coverage, baseline/model, error measure if evaluated, known-order versus incremental-demand split, price assumption. Sparse/synthetic/stale states are visible. Production/replenishment suggestion explains existing stock/shelf life/batch/capacity; never an automatic purchase.

Price proposal shows current/suggested price, percentage/bounds, stock/demand rationale, source versions, validity and Approve and publish/Reject. Explain old confirmed prices stay fixed. Sales/invoices separates bookings/completed value/cash/outstanding/cancellations with periods and drill-down. Documents use actual availability.

Risk uses Needs verification and factual reasons, not “Scammer”. Detail includes minimised evidence, rule/model provenance, uncertainty, expiry and owner Clear/Block/Escalate with reason. Clearing risk does not display Payment verified. Customer has neutral human-contact/appeal. Calendar remains seven columns when feasible with selected-day agenda; narrow widths must preserve readable day/task controls without whole-page overflow.

## 9. Engagement, content and visual assets

Campaign steps: purpose → product/batch/offer → language/copy/assets → audience eligibility → exact-revision review → schedule/deliver/export. Show eligible count, exclusion reasons, limits/quiet hours and approval version. Fresh inventory/offer expiry disables stale approval/send. Transactional follow-up and newsletter consent use separate language.

Content studio offers Product/SEO, Marketing, Email/newsletter, Social and PR. Display editable title/meta/body, verified fact links, BM/English/Chinese preview status and exact revision. Edits visibly clear approval. Export means Exported, not Posted/Email sent without acknowledgement. Include actual inline failure/retry state for model errors.

Image cards show Queued/Generating/Ready for review/Approved/Failed/Blocked, model/provider provenance, generated/genuine-photo badge, rights status and alt text. Show real stored preview; do not substitute a local SVG when generation fails. Retain editable branded composition/headline/colour and SVG export alongside managed raster assets. Use clear illustration label where generated goods could be mistaken for an exact photograph. Keep assets private until approved for intended public use.

Recommendation cards explain current-request/consented-context basis, real availability/terms, neutral alternatives and Stop promotions. No fake countdown, guilt, compulsive streak or obstructive opt-out. Human review prioritises exact actionable facts over technical traces.

## 10. Shared components and state language

Shared primitives: Button, Input, Select, Textarea, Dialog/Drawer, StatusBadge, DataTable/MobileRecordCard, QueryState, Feedback, EmptyState, ErrorBanner, LoadingState, LanguageToggle, MoneyDisplay and DocumentLink.

Domain components: ProductCard/Detail, ScopedBag, SetupChecklist, ConsentPanel, MemberBenefit, QuoteCard/Confirmation, OrderTimeline/PaymentSummary, CustomerAgentCard, InteractionDrawer, ApprovalCard, CapacityCell, StockMovement/Lot, ForecastChart/Table, PriceProposal, CampaignAudiencePreview, ContentRevisionReview, GeneratedAsset, RiskCase, CalendarAgenda, JobStatus, DemoControls and EvidenceTrace.

Use precise copy: Quote prepared; Reserved — awaiting deposit; Deposit verified; Waiting for the owner; Reservation expired; Preparing document; Checking action status; Delivery uncertain; AI unavailable. Retain inputs after validation failure. Announce status with live regions and errors with alerts; no toast-only fabricated success. Amounts/status/permissions are API results, not free-form model claims.

## 11. Accessibility gate and screenshot index

At WB3/WB4/WB8 inspect keyboard traversal, labelled fields, modal/drawer focus trapping/return, readable status/error announcements, screen-reader order, contrast, reduced motion, long BM text and zoom. Test actual 360/400/768/1440 CSSpx and actual 200% browser zoom. Record measured viewport; requested dimensions are not proof of actual ones. Prototype actual zoom/small-width checks were partially deferred, so do not inherit a pass.

Reference images below are unedited Codex evidence, copied into this folder for portability. UI fidelity order: **S1 shopping/onboarding overrides earlier customer layouts; UX1 overrides earlier owner navigation; E1 images show additional feature content with older shell/labels.** Apply current tokens/groups to E1 feature panels. Screenshots can be scrolled/partial and cannot prove backend functionality.

| Copied directory | Files and purpose |
| --- | --- |
| `reference/screenshots/shopping/` | `landing.png`, `owner-setup.png`, `setup-mobile.png`: current landing and guided owner setup |
| `reference/screenshots/shopping/` | `storefront.png`, `store-mobile.png`, `detail-mobile.png`: latest collection/product/detail design |
| `reference/screenshots/shopping/` | `membership.png`, `member-mobile.png`, `checkout.png`: separate perks/newsletter and member checkout |
| `reference/screenshots/ux1/` | `overview-desktop.png`, `overview-mobile.png`: current owner shell and overview |
| `reference/screenshots/ux1/` | `orders-desktop.png`, `orders-mobile.png`, `members-mobile.png`: searchable directory/card layout |
| `reference/screenshots/ux1/` | `agents-desktop.png`, `agent-interaction.png`: current agent grid and focused drawer |
| `reference/screenshots/ux1/` | `checkout-mobile.png`: earlier checkout reference; current S1 shopping shell takes precedence |
| `reference/screenshots/expansion/` | `stock.png`, `calendar.png`, `campaign.png`, `content-approved.png`, `tracking.png`, `inbox.png`: implemented expanded feature content |

Sample references: [landing](reference/screenshots/shopping/landing.png), [storefront](reference/screenshots/shopping/storefront.png), [owner overview](reference/screenshots/ux1/overview-desktop.png), [agent board](reference/screenshots/ux1/agents-desktop.png), [interaction drawer](reference/screenshots/ux1/agent-interaction.png).

WorkBuddy captures its own final desktop/mobile, live-AI/fallback, quote/review/payment/document, forecast/content/image/risk screenshots after its gates. Keep Codex references identified and never use them as WorkBuddy-authored completion evidence.

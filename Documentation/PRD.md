# BizBuddy — Product Requirements Document

Version 1.0 · 8 October 2026 · Target: independent WorkBuddy rebuild · Build status: Not started

Related: [Technical requirements](TRD.md), [App Flow](APP_FLOW.md), [Design Brief](DESIGN_BRIEF.md), [Backend Schema](BACKEND_SCHEMA.md), [Implementation Plan](IMPLEMENTATION_PLAN.md).

## 1. Product and competition objective

BizBuddy connects a small business's storefront, customers, orders, stock and follow-ups. Each customer has one persistent, scoped AI buddy. The owner manages the business through an operational dashboard, a separate business assistant and explicit human review. The customer experience is an ecommerce shopping app with product images, prices, a bag, member perks, tracking and optional chat.

The track theme is how AI helps students and small businesses solve real business problems and operate more effectively. A student entrepreneur can use the same configurable workflow as a bakery, florist, retailer or appointment business. “General SME tool” means reusable product/service, policy and fulfilment configuration; it does not claim complete ERP support for every industry or enterprise scale.

The original WorkBuddy Track requires the solution, slides and project documentation to be produced exclusively in Tencent WorkBuddy, with dedicated WorkBuddy credits provided. This specification and the existing prototype were authored in Codex. The team must accurately disclose that reference preparation and confirm its eligibility with the organiser. A WorkBuddy-authored rebuild alone is not proof of compliance. WorkBuddy authors all final implementation and presentation artifacts.

Use BizBuddy as the visible product name, adopted 9 October 2026. It supersedes CustomerBuddy and CustomerLane. Historical prototype screenshots retain their original branding; Tencent WorkBuddy is the separate rebuild platform.

## 2. Rebuild contract and reference coverage

Recreate the latest local application, not just the earlier bakery MVP. Preserve core orders/payments/documents, E1 operations/growth/calendar, UX1 navigation, and S1 owner setup/ecommerce/member pricing. Implement the final project independently in WorkBuddy. Screenshots specify layout and hierarchy; visible example counts and prices come from current records.

| Reference capability | Required final behaviour |
| --- | --- |
| Scripted customer/owner assistant | Real managed-AI understanding, grounded answers, clarification, scoped tools and measured fallback |
| Rule-based recommendation and fixed copy/SVG templates | Live grounded recommendation explanations, generative content and actual Tencent image jobs; retain deterministic eligibility and editable/exportable drafts |
| Synthetic loopback role selector | Real verified owner/customer authentication; synthetic demonstration accounts isolated from production |
| Local persistent business services | Independently rebuilt services preserving money, consent, scope, capacity, stock, review and idempotency rules |
| Local jobs, clock, PDFs and inbox | Durable backend jobs, private files, in-app delivery and verified WorkBuddy scheduling; synthetic demo clock remains available in isolated demo mode |
| Configurable general business/storefront | Real registration/setup, published product/service images/prices, scoped bag, membership and separate newsletter permission |

“Functional instead of hardcoded” requires live AI where AI is promised and real database/provider outcomes everywhere. Deterministic business rules and statistical forecast baselines remain desirable. They must calculate from records, rather than pretend to be model predictions.

## 3. Users and intended outcomes

| User | Need | Successful outcome |
| --- | --- | --- |
| New owner/student entrepreneur | Understand the product and configure a business | Landing/manual → real owner registration → resumable four-step setup → published store |
| Existing owner | Operate without reconstructing scattered chats | Reconciled orders, payments, invoices, members, stock, reviews, calendar and agent activity |
| First-time customer | Browse and order easily | Public product detail and prices → sign in → quote → explicit confirmation → accurate tracking |
| Returning/member customer | Convenient repeat purchase and optional perks | Own consented context, fresh quote, eligible member discount and easy opt-out |
| Customer needing help | Human after-sales support | Case saved with transcript/context; conflicting automation paused until owner resumes |

## 4. Mandatory features and traceability

All requirements below are required for the requested release. Phase sequencing is not permission to omit later features. External email/social integrations and advanced ML are conditional enhancements; actual in-app campaigns, live text AI, live image generation and usable baseline forecasts are required.

| ID | Feature and acceptance contract | Main phase |
| --- | --- | --- |
| F01 | General SME configuration: real owner registration; unique store slug; business name/industry, pickup/delivery/appointment mode, timezone, hours and policies; resumable setup uses actual saved readiness | WB1/WB3 |
| F02 | Separate product landing page and user manual before entering the demo; explain owner/customer workflows, benefits, limits and four setup steps with clear store/demo entry | WB3 |
| F03 | Separate verified owner/customer views and permissions; another business/customer ID in a URL or prompt never establishes authority | WB1/WB3 |
| F04 | Ecommerce catalogue/detail with images, descriptions, unit prices, product/service filters, search, scoped persistent bag and multi-item checkout; no chat required to order | WB2/WB3 |
| F05 | Members directory and customer club: explicit join/leave, deterministic perk pricing, owner programme controls, independent newsletter consent and exclusive approved updates | WB2/WB3 |
| F06 | Live BM/English/mixed-language customer chatbot and separate owner query assistant; grounded facts/source links, consented memory, repeat-order proposals and genuine unsupported/outage fallback | WB6 |
| F07 | Agents dashboard: exactly one logical customer-agent card per business/customer across conversations, including inactive/no-history users; search, activity/review filters, latest interaction, counters, takeover/reply/resume | WB4/WB6 |
| F08 | Authoritative quote and explicit server-bound confirmation; integer-sen totals/deposit, current policy/benefit/stock/capacity revalidation, atomic reservation and idempotent retries | WB2/WB3 |
| F09 | Customer and owner order/appointment lists/details, exact dates/windows, separate payment and fulfilment states, persisted timeline and reviewed cancellation | WB2/WB3 |
| F10 | Owner-only payment verification; actual quote/summary/invoice/receipt generation and scoped download; no receipt without verified payment; synthetic payments labelled | WB2/WB5 |
| F11 | Sales tracking: booked value, completed sales value, verified cash, unpaid balances, cancellations and per-product breakdown, with reporting period and record drill-down | WB4 |
| F12 | Business management: editable catalogue/facts, versioned policy publication, business time/opening hours, date capacity, product overview, sales overview, members and orders | WB2/WB3/WB4 |
| F13 | Physical stock ledger/overview and seven-day stock-demand/sales forecast from recorded history; sufficiency, cutoff, method, assumptions and constrained replenishment/production suggestions | WB4 |
| F14 | Bounded dynamic price proposals with reasons and exact-version owner approval/publication; unchanged confirmed prices; stale unconfirmed quotes require reacceptance | WB4 |
| F15 | General/custom announcements, e.g. fresh Orange Cake batch, grounded in recorded sellable stock and approved exact content/audience | WB7 |
| F16 | Personalised recommendations grounded in current request and permitted preferences/history; neutral alternatives and ordinary quote flow | WB6/WB7 |
| F17 | Personalised promotions/discounts with published eligibility, limits/expiry and deterministic quote application after owner approval; no stacking or model-created entitlement | WB2/WB7 |
| F18 | Engagement and after-sales service: actual scoped in-app delivery/replies, one optional consented check-in, support cases and owner escalation for complaints/refunds | WB5/WB7 |
| F19 | Real generative SEO/product, marketing, email/newsletter, social and PR drafts in BM/English; Chinese draft support with explicit translation review; edit/revision review/Markdown export | WB7 |
| F20 | Real Tencent visual generation jobs and editable branded poster composition/SVG export; provenance, alt text, rights/review, actual approved asset retrieval; illustration/photo distinction | WB7 |
| F21 | Fraud/spam screening: deterministic payment/velocity/reference/amount signals and message abuse controls; private explainable cases, owner clear/block review and customer human-contact path | WB2/WB4/WB6 |
| F22 | Human review of discounts, custom orders, complaints, refund requests, short notice, risky payment and generated publication; exact proposal/version/expiry, approve/edit/reject, explicit takeover/resume | WB2/WB4/WB7 |
| F23 | Calendar/month agenda and internal tasks; bounded reminders/documents/digests, WorkBuddy Automation, pause/job recovery, isolated synthetic demo clock/Run due jobs/reset | WB4/WB5 |
| F24 | Fallback/time budgets, rate and credit limits, prompt-injection defence, tool allowlists, durable uncertain-write reconciliation, fair abuse cooldown and structured ordering during AI outage | WB1/WB6/WB7 |
| F25 | Consent/privacy/ethics, source/action audit and honest evaluation: no secret leakage, fabricated impact, sensitive targeting, covert tracking, misleading generated media or false fraud guarantees | All; final WB8 |

| Original must-have item | Covered by |
| --- | --- |
| 1. General SME and separate landing/manual | F01, F02, F12 |
| 2. Owner versus customer | F03, F04 |
| 3. Agents dashboard | F07 |
| 4. Stock prediction/sales forecasting | F11, F13 |
| 5. Query chatbot | F06 |
| 6. Ads/info, recommendations, promotions, engagement, after-sales | F15–F18 |
| 7. Order tracking | F09 |
| 8. Sales tracking | F11 |
| 9. Business time/stock/products/sales/invoice/members/orders | F01, F05, F09–F13, F23 |
| 10. Content, visual and generative AI | F19, F20 |
| 11. Fraud/spam | F21, F24 |
| 12. Human review | F22 |
| 13. Ecommerce customer dashboard, membership, newsletter, images/prices/order | F04, F05, F09, F18 |
| 14. Fallback, rate limits, prompt injection | F24 |

## 5. Commercial rules that must remain exact

Defaults are synthetic fixtures, configurable by an authenticated owner. Persist immutable snapshots so later edits do not rewrite past orders.

| Setting | Default/required behaviour |
| --- | --- |
| Currency/time | MYR, integer sen; Asia/Kuala_Lumpur; timezone-aware event timestamps |
| Bakery catalogue | Brownie tray, 24 pieces: 7,800 sen; cupcake box, 12 pieces: 4,800 sen |
| Lead time/windows | 48 hours; 12:00–14:00 or 16:00–18:00; exact local date/window shown before confirmation |
| Capacity | Ten brownie trays/eight cupcake boxes per configured date; services use booking capacity rather than physical stock |
| Quote | Valid 30 minutes; never reserves capacity |
| Unpaid reservation | Created only by explicit customer confirmation, held 24 hours; expiry releases once |
| Deposit rounding | `ceil(total_sen * deposit_basis_points / 10000)`; default 5,000 basis points (50%). This preserves implemented upward whole-sen rounding |
| Club benefit | Free explicit join; default 500 basis points (5%); owner range 0–1,500 basis points (15%), further bounded by ethics settings |
| Discount rounding | Each discounted unit price is `floor(base_unit_sen * (10000 - discount_basis_points) / 10000)`; multiply by quantity and sum lines |
| Discount precedence | An individually approved promotion/exception replaces club pricing; never stack. Revalidate membership, programme, ethics and offer versions at confirmation |
| Payment | Only owner verifies amount/reference against ledger. Duplicate references, excess amount, expired hold or blocked review cannot silently confirm |
| Fulfilment | Awaiting deposit → confirmed → preparing → ready → delivering → completed; pickup/service may complete from ready. Completion requires full verified balance |
| Reminders | At most one deposit reminder, no earlier than 12 hours after confirmation, only 09:00–20:00, and only while eligible hold is live |
| Approval | Exact proposal/hash/version and owner; default expiry 30 minutes; relevant edits invalidate approval |
| Marketing | Off per customer until opted in. Club join/leave does not alter newsletter choice. Configurable daily contact limit, default one; respect quiet hours and cross-channel deduplication |

The reference daily contact control must remain editable. Use an additional conservative default promotional cooldown of seven days for proactive campaigns; transactional notices have separate purpose/limits. This is a final agent safeguard, not a claim that the prototype already enforced a weekly cap.

Quotes, orders and reservations have separate states. A quote is active/accepted/expired/superseded. An order is awaiting_deposit/confirmed/preparing/ready/delivering/completed/cancelled; delivery confirmation is a timeline event, not a fake courier integration. A reservation is held/committed/released. Payment state is pending/partial/paid/needs_review, derived from verified records; it must not be conflated with fulfilment.

## 6. Agent behaviour and human authority

“One customer, one agent” means one persistent customer context and task history. Shared managed models serve bounded requests; do not allocate a paid account or permanent model process per member.

The customer agent can answer published business questions, ask for missing details, load permitted context, recommend eligible products, prepare a quote, read own orders/documents and request support. It cannot submit purchase authorisation, verify payment, approve a discount, publish a price/campaign, execute a refund, raise capacity or read another customer.

The owner assistant can query authorised business summaries, explain forecasts/risks and prepare proposals/drafts. Review and financial controls remain explicit authenticated owner UI operations. WorkBuddy integration credentials have restricted read/eligible-job authority; they do not inherit owner decision permissions.

Confirm relative dates and vague quantities. For “same as last time”, load this customer's latest eligible completed order, show current prices and ask for the exact date/window. Missing facts trigger clarification/handoff. A successful model response is not evidence that a business action committed.

During takeover, customer automation and conflicting sends pause. Owner sees the transcript and safe action summary, replies directly and explicitly resumes. Refund support records a case/decision; execution of money transfer is outside scope.

## 7. Stock, sales and planning

Preserve the stock receipt/adjustment/fulfilment ledger, stock overview, historical demand, seven-day units/value, known bookings, replenishment/overflow and reviewed pricing surfaces. Physical stock is separate from production/date capacity. A service cannot receive stock; catalogue-only/untracked goods may use preorder capacity. Tracked goods cannot be oversold, including unpaid live holds and committed unprepared orders.

The rebuilt baseline uses a documented 28-day recent-demand average and seven-day horizon, with known orders shown separately. Label synthetic simulations. For real data, exclude cancelled/expired unpaid/synthetic rows, define observed versus unknown days, and flag stockout-constrained history. Any correction to the prototype's simplistic history filter must be documented. Heuristic ranges remain labelled illustrative; use calibrated interval labels only after backtesting a method that supplies them. Insufficient data must still yield usable stock/planning views and an honest unavailable/baseline state.

Lot receipt, expiry and waste support truthful “fresh batch” announcements. Production suggestions consider unexpired stock, existing commitments, batch size and available capacity; accepting a plan never fabricates stock or buys inventory automatically. Sales forecasts state their price assumption. Optional StatsForecast/ML may improve a baseline only after representative data, Tencent runtime support and rolling backtests.

Sales distinguish booked non-cancelled order value, completed sales value, verified collected cash, outstanding live-order balance and cancelled value. Do not label unpaid bookings as received revenue. Cash can include a verified payment on a cancelled order; show it separately as requiring reconciliation. Taxes/legal invoice treatment require a real business decision before a pilot; this is a fictional demo specification.

## 8. Growth, generative AI and risk

Campaigns follow draft → exact revision/audience review → approved schedule → guarded delivery/export. In-app delivery is mandatory. Email/social delivery is optional until a supported restricted connector and acknowledgement path are verified; export is a real outcome and must not display “sent” or “posted”. Recheck consent, opt-out, pause, takeover, contact limits, offer validity and sellable batch immediately before delivery.

Personalisation consent is separate from newsletter, preference-memory and optional after-sales permissions. A customer can shop without any of them. A promotion has an owner-published entitlement, eligible audience, expiry and redemption rule; the model can explain it but cannot invent the discount. Approved promotion claims must match actual quote savings.

Live generative content produces editable drafts with fact references. Preserve BM/English and Chinese draft review/export support; additional languages are optional. Visual AI creates an actual managed job and stored asset. Retain editable headline/colour/layout and branded SVG composition as well as generated raster imagery. Revisions to copy, facts, assets, terms or audience invalidate approval. Never invent certifications, ingredients, testimonials or scarcity. An illustration is not a photograph or proof of stock.

Risk rules flag duplicate references, suspicious velocity, amount mismatch, cancelled/expired order and unusual purchase signals. Financial integrity rejects invalid writes regardless of model availability. A case is private, explainable, reviewable and recoverable. Spam/rate abuse produces cooldown or human review, without giving a language model ban/payment/refund authority.

## 9. Acceptance scenarios and fixtures

Fixtures are inputs, not fixed successful outputs. WorkBuddy seeds at least two isolated synthetic businesses and ten bakery customers. Use the historical fixed clock 7 October 2026, 10:00 Malaysia time only in demo mode; production uses real time. Farah prefers BM and completed brownies; Jason prefers English and completed cupcakes. Promotional consent defaults off. Additional no-history/opted-out customers exercise neutral recommendations.

| Case | Observable acceptance outcome |
| --- | --- |
| A01 New business | Landing/manual → sign-up → isolated owner → profile/products/facts/capacity → readiness → public store; reload preserves setup |
| A02 Standard basket | One brownie + one cupcake: RM126 total/RM63 deposit; exact date/window; confirmation creates one order/hold and queued document |
| A03 Member perks | 5% member brownie: RM74.10/RM37.05; two-item basket RM119.70/RM59.85; joining leaves newsletter off |
| A04 General business | Florist Seasonal bouquet RM120; 5% member quote RM114/RM57. Service SKU uses date capacity and appears in appointments/calendar |
| A05 Repeat AI | Previously unseen BM/English paraphrases load the right customer's completed order; ambiguous Saturday is clarified; new quote uses live prices |
| A06 Last unit and retries | Two simultaneous confirmations produce at most one final unit reservation; identical retry returns same order; changed retry payload is rejected |
| A07 Stale entitlement | Leaving club, programme/policy change or expired offer invalidates an unconfirmed discounted quote; confirmed order stays unchanged |
| A08 Human review | Off-policy 30% discount/complaint/refund creates review; takeover pauses automation; revised offer requires owner approval and customer acceptance |
| A09 Payment/documents | Owner verifies synthetic deposit; ledger updates once, capacity moves held→committed, one real receipt becomes available; partial balance prevents completion |
| A10 Reminder/expiry | Confirm at 7 October 10:00; reminder due 22:00 defers to 8 October 09:00; paid/opted-out/takeover/expired cases suppressed; 10:00 expiry releases unpaid hold |
| A11 Dashboard reconciliation | Overview, sales, member counters, agent counters and digest change with records and reconcile to drill-downs; no constant totals |
| A12 Stock/forecast/pricing | Receipt/adjustment history survives restart; last-stock race denied; sparse forecast labelled; price approval publishes uniform future price and preserves old orders |
| A13 Fresh batch/campaign | Owner records Orange Cake SKU/batch; live AI drafts factual copy; review/opt-in delivery reaches only eligible inboxes; queued opt-out suppresses |
| A14 Content/visual | Actual model creates multilingual drafts and image; approved asset persists after provider URL expiry; editing invalidates approval; Markdown/SVG/file export works |
| A15 Fraud/spam | Duplicate payment denied; benign risk cleared with audit; burst messages limited; customer appeal reaches owner; no model payment verification |
| A16 Injection/isolation/outage | Prompt/knowledge/tool-output injections cannot change scope/authority; model timeout/quota trips fallback; forms/tracking still work; uncertain writes reconcile |
| A17 Accessibility/mobile | Both distinct shells usable at 360/400/768/1440 CSSpx, keyboard and actual 200% zoom; long BM text and error states fit |
| A18 Restart/cloud | Conversation/order/jobs/private files persist; cold start/retried worker is safe; deployed auth blocks forged roles and synthetic reset in production |

## 10. Release evidence and limits

Proposed evaluation targets: 100% correct commercial amounts in the acceptance set, zero cross-scope disclosures in tested cases, no duplicate order/payment/receipt/reminder, and a useful reply or fallback within the TRD deadline. Evaluate at least 30 real managed-AI conversations with BM/English/mixed language, paraphrases, no-history, ambiguous input and adversarial cases. Record model/version, fixture mode, latency, usage, tool outcomes, reviewer results and failures.

Measure owner-free completion and handling time against a documented manual baseline before claiming efficiency gains. Synthetic payments demonstrate mechanics, not actual revenue. Forecast accuracy, fraud prevention, universal enterprise support, 24/7 service and legal compliance are not established by this document.

The completed release includes every F01–F25 feature, its new WorkBuddy test evidence, Tencent runtime configuration, recovery/runbook, final WorkBuddy-authored documentation and slides. A missing live model/image service is a release blocker for its required feature, even though forms and deterministic fallback remain useful. No GitHub push is part of this request. Marketplace sync, courier integration, automated bank/card collection/refund execution, payroll, staff/room scheduling and full ERP are outside this rebuild scope.

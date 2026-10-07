# CustomerBuddy: 1 Customer, 1 Agent

## Product Requirements Document

| Field | Value |
| --- | --- |
| Version | 0.4 |
| Date | 7 October 2026 |
| Status | Phases 1–3 complete; Phase 4 built with automated/browser flow checks passed, 200% zoom gate pending by user choice; Phase 5 not started; usable prototype not complete |
| Track | WorkBuddy Track: Agentic Solutions |
| Theme | Help students and small businesses solve real business problems and operate more effectively |
| Demo business | A Malaysian home bakery, selected by the user |
| Reference prototype tool | Codex, Phases 1-6 |
| Current prototype assistant | Hardcoded intent rules and response templates; real persisted business workflows |
| Final project authoring and deployment tool | Tencent WorkBuddy, independent rebuild in Phase 7 |
| Deployment target | WorkBuddy-managed application services backed by Tencent CloudBase; account compatibility to verify |
| Product name | CustomerLane (adopted 7 October 2026; CustomerBuddy remains the internal working name until a separate application branding migration) |

**Delivery decision:** Build a reference prototype using Codex in Phases 1-6. Use its requirements, flows, design, schema, synthetic fixtures, screenshots and demo evidence to guide a fresh WorkBuddy implementation in Phase 7. WorkBuddy rebuilds the frontend, backend, migrations, agent tools, tests, deployment and final documentation in a separate workspace. The Codex application is not the final app to import or publish. The original track requires the entire project to use WorkBuddy; whether Codex preparation/reference material is permitted remains an organiser question. A WorkBuddy-authored rebuild does not automatically settle that requirement, and provenance must remain accurate.

**Document set:** [TRD](<C:/Users/Edison Tee/Downloads/SME/TRD.md>), [App Flow](<C:/Users/Edison Tee/Downloads/SME/APP_FLOW.md>), [Design Brief](<C:/Users/Edison Tee/Downloads/SME/DESIGN_BRIEF.md>), [Backend Schema](<C:/Users/Edison Tee/Downloads/SME/BACKEND_SCHEMA.md>), [Implementation Plan](<C:/Users/Edison Tee/Downloads/SME/IMPLEMENTATION_PLAN.md>), and [WorkBuddy Rebuild Brief](<C:/Users/Edison Tee/Downloads/SME/WORKBUDDY_REBUILD_BRIEF.md>). The implementation plan is the progress and handoff record.

**Build contract:** Implement one phase at a time. Run automated tests and build/quality checks at the phase-end gate, not after each edit. Save completed work, unfinished tasks, unverified changes, and the exact next action in the implementation plan before a usage-limit handoff. Phases 1–3 are complete with passing evidence; the usable business prototype and final WorkBuddy rebuild are not complete or deployed.

**Current user direction:** Codex builds a usable home-bakery prototype. Hardcode the assistant's demo behaviour and use a local scheduler; leave WorkBuddy agentic integration for the later independent rebuild. The prototype must support real saved orders, owner actions, documents and reminders with synthetic data. It runs without WorkBuddy, cloud/model credentials or AI credits. MCP packages, managed-AI adapters and Tencent deployment are future Phase 7 work, not prerequisites for the prototype.

## 1. Product summary

CustomerBuddy gives each bakery customer a persistent AI assistant that remembers approved preferences, answers from the bakery's current information, prepares accurate quotes, records orders, and follows up on outstanding deposits. The owner handles exceptions through an approval queue and receives a daily operations summary.

That is the final product vision. The current Codex version represents each customer's assistant with a scripted dispatcher using scoped records. Supported phrases and quick actions demonstrate the workflow; an order form keeps the prototype usable when a message is outside the script. It does not demonstrate general language understanding or live AI reasoning.

**Product promise:** A returning customer can say, "Same brownies as last time, for Saturday," and receive a verified order proposal without repeating their preferences or forcing the owner to reconstruct the conversation.

"1 customer, 1 agent" means one persistent customer context, identity, and task history. It does not require a separate WorkBuddy account, model, or permanently running process for every customer. Shared agent instructions operate on customer-scoped records.

The MVP proves an enquiry-to-order workflow for one bakery. A student running a campus baking business can use the same workflow while balancing classes and fulfilment.

## 2. Problem and users

These are hypotheses to validate with bakery owners, rather than findings from completed interviews.

| User | Current problem | Desired outcome |
| --- | --- | --- |
| Home bakery owner | Repeats prices and pickup rules while baking; manually checks capacity and chases deposits | Spend less time on administration while retaining control of business commitments |
| Returning customer | Repeats previous orders and preferences; waits for availability and confirmation | Place an accurate repeat order quickly in a familiar language |
| First-time customer | Does not know what information is needed to order | Receive a short, clear ordering conversation and transparent total |
| Student entrepreneur | Customer messages interrupt study; order details are scattered across chats | Run a small business with a reliable order record and fewer manual follow-ups |

Today, a missed message can lose an order, a remembered price can be outdated, and an apparent booking may never reach the order sheet. CustomerBuddy must connect the conversation to recorded business actions.

Before a real pilot, interview at least three home bakery owners and observe how they process enquiries, reserve production capacity, and verify payments. Validate the frequency of repeat orders and the willingness to use a customer memory feature.

## 3. Goals and success measures

All targets below are proposed evaluation thresholds, not measured results or guarantees.

| Goal | MVP target | Measurement |
| --- | --- | --- |
| Complete routine work correctly | At least 70% of eligible workflows finish without owner intervention | Correct completed eligible workflows / all eligible workflows in the evaluation set |
| Reduce owner effort | At least 30% less active handling time than the manual baseline | Compare equivalent scenarios; include setup amortisation, review, and correction time |
| Maintain commercial accuracy | 100% correct prices, deposit amounts, and totals in the test set | Compare with the versioned catalogue and deterministic calculations |
| Preserve control | Every tested off-policy request is blocked or escalated before commitment | Approval and action logs |
| Protect customer context | Zero cross-customer disclosures in the isolation test set | Normal and adversarial retrieval tests; this does not prove production security |
| Respond promptly | 95% of routine replies within 30 seconds on demo hardware | Message received to useful reply; include manual relay time when applicable |
| Deliver reliable actions | No duplicate order, receipt, or reminder after a retry | Replay and failure-recovery scenarios |

**Eligible routine workflows:** Catalogue FAQs, standard quotes, repeat orders, standard order confirmation, and permitted deposit reminders. Complaints, refunds, custom cakes, and off-policy requests require a human. Also report the owner-free completion rate across *all* workflows so exclusions remain visible.

Use at least 30 predefined conversations, including new and returning customers, BM, English, mixed language, and exceptions. Report sample size, failures, and demo mode. Paid conversions and weekly hours saved require a real pilot; synthetic order activity must not be presented as revenue or customer impact.

## 4. MVP scope

### P0: Required demonstration

- One bakery with an owner-approved catalogue, FAQ, pickup policy, deposit policy, and daily capacity.
- Ten synthetic customer profiles, including two returning customers with different order histories.
- Persistent customer memory with separate consent for preferences and promotional follow-ups.
- BM and English conversations, including common mixed-language ordering phrases.
- Grounded answers, deterministic quote calculation, explicit customer confirmation, and capacity reservation.
- Quote, order summary, deposit invoice, and a receipt after owner-verified demo payment.
- An owner approval queue, human handoff, and a daily digest.
- One scheduled deposit reminder with opt-out, suppression, and retry handling.
- A browser-based customer conversation, owner console, action log and results panel demonstrated first in a Codex reference prototype, then rebuilt independently in WorkBuddy for the final project.

### P1: After the core flow works

- Additional messaging channels, if the WorkBuddy edition and restricted integration path support them. Browser chat is the primary customer channel.
- Optional consented reorder suggestions and simple popularity counts.
- Additional catalogue items or student-business branding using the same workflow.

### Outside the MVP

WhatsApp integration, marketplace synchronisation, delivery routing, automated payment collection, executing refunds, demand forecasting, dynamic pricing, visual try-on, churn prediction, multi-business hosting, and a production service-level commitment.

Sales, support, billing, and inventory remain logical roles in the MVP. A large network of independently deployed agents is unnecessary to demonstrate the customer workflow.

## 5. Reference prototype and WorkBuddy rebuild

For the reference prototype, use React/Vite/TypeScript, Node.js/Express/TypeScript, PostgreSQL and typed business tools. Codex builds and verifies this local prototype in Phases 1-6. It ends with a portable reference pack rather than a deployment source package. In Phase 7, WorkBuddy starts a fresh project and regenerates all implementation layers from those references. The same stack is recommended where supported; WorkBuddy may adapt cloud packaging while preserving required behaviour, permissions and data invariants.

### Current prototype scope: usable, with scripted assistance

| Capability | Codex prototype now | Future independent WorkBuddy rebuild |
| --- | --- | --- |
| Customer assistant | Hardcoded supported intents and BM/English templates, quick actions and fallback | Genuine managed-AI orchestration and evaluated language understanding |
| Customer memory | Read saved scoped history and consented preferences | Same requirements behind newly authored agent tools |
| Ordering and owner operations | Actual API/database writes, pricing, capacity, approvals and synthetic payment verification | New implementation preserving the same rules |
| Documents | Actual generated quote/invoice/summary/receipt and authorised local download | Newly implemented private cloud storage/download |
| Reminders and digest | Local worker, Run due jobs, demo clock and record-derived digest | WorkBuddy Automation and supported backend workers |
| Identity/deployment | Labelled loopback synthetic sessions and local PostgreSQL | New cloud identity, access controls and Tencent deployment |

Hardcoded wording and seed catalogue/customer examples are acceptable. Hardcoded success results, fixed dashboard totals and fake available downloads are not: changing catalogue, capacity, payments or orders must change the visible result. Seed defaults become editable authoritative records. Unsupported input offers supported actions or owner handoff; it never claims an unperformed action succeeded.

The Codex chat must permanently display "Demo assistant — scripted responses". No runtime switch to live AI or WorkBuddy integration is required in the prototype. The working local app and reference pack are accepted together at Phase 6; an unstarted Phase 7 does not make this prototype incomplete.

### Future WorkBuddy target

WorkBuddy documents full-stack web applications with cloud data, authentication, storage and AI. Tencent describes CloudBase as their backend. These support the planned fresh rebuild; availability, runtime compatibility and entitlement still require verification in the team's account. [WorkBuddy web applications](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/App-Publishing/Web-App), [WorkBuddy and CloudBase](https://cloudbase.cloud.tencent.com/blog/2026/09/18/workbuddy-cloudbase-case)

| Boundary | Decision |
| --- | --- |
| Reference development | Codex authors a local reference app, prototype migrations/tests and planning documents |
| Reference agent | Hardcoded rules/templates invoke real scoped services; scripted responses remain labelled; no AI/MCP integration code required |
| Final implementation | WorkBuddy authors new frontend/backend/migrations/tools/tests in a fresh project from the reference pack |
| Customer agent at release | WorkBuddy-authored orchestration backed by supported CloudBase-managed AI; scope is bound by the new server per customer |
| Owner WorkBuddy integration | Restricted MCP tools for operations summaries, review queues, and scheduling eligible work; approvals/payment verification remain explicit owner actions |
| Cloud infrastructure | WorkBuddy publishing and CloudBase services, subject to account access and source-package compatibility |
| Final documentation | WorkBuddy authors the rebuilt project's documentation, presentation and deployment report; Codex references remain disclosed |

CloudBase documents model tool calling; the adapter must enforce application limits even if the SDK runs the tool loop automatically. [CloudBase tool calling](https://docs.cloudbase.net/en/ai/model/tool-calling)

**Phase 7 gates:** Verify supported runtime, PostgreSQL access, auth identity mapping, private storage, managed AI/tool calling, MCP transport, scheduling, region, quotas and costs. Rebuild and verify each WorkBuddy subphase before proceeding. Prototype test results do not count as proof that the rebuilt implementation passes. WorkBuddy credits must not be assumed to cover every CloudBase resource or managed-model charge.

**Release mode:** Authenticated browser chat invokes scoped backend tools. This does not require public access to WorkBuddy's desktop assistant. Do not invent a desktop-agent API. Use customer-scoped database memory rather than WorkBuddy's general conversation memory.

**Fallback mode:** If the required WorkBuddy rebuild or cloud feature is unavailable, mark Phase 7 blocked/partial and retain the usable Codex reference prototype with its synthetic/scripted labels. Phase 6 remains a separate accepted milestone. Do not promote the prototype to the final WorkBuddy project or silently switch providers.

Desktop WorkBuddy automations may depend on the workstation being active. Reservation expiry is enforced by the backend before new bookings regardless of scheduler availability. Reminder/digest delivery may be delayed and must show its status. Native Telegram Assistant integration is reserved for owner remote control unless a separate restricted customer bridge is verified. [Automation](https://www.workbuddy.ai/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Automation-Guide), [Telegram guide](https://www.workbuddy.ai/docs/workbuddy/Platform-Integration/Telegram-Guide)

## 6. Customer and owner journeys

### A. First order

1. Introduce the assistant as AI and offer an owner handoff.
2. Resolve the authenticated customer identity. Explain optional preference memory and ask for consent without blocking ordering.
3. Answer product and pickup questions from the approved bakery knowledge base.
4. Collect product, quantity, exact pickup date, and pickup slot. Confirm ambiguous phrases such as "next Saturday."
5. Check current price and capacity, then generate a quote and deposit amount.
6. Ask the customer to confirm the exact order. A quote alone does not reserve capacity.
7. Recheck capacity and atomically create one reservation and order.
8. Generate the deposit invoice, state the payment deadline, and schedule the permitted reminder.
9. The owner verifies payment before a receipt or paid status is issued.

### B. Repeat order

Load only that customer's consented preferences and previous order. Propose the previous item and quantity, but recheck current pricing, availability, date, and pickup slot. Require confirmation before creating a new order. Remembered preferences never authorise a purchase.

### C. Exception and handoff

A custom cake, unsupported discount, refund request, complaint, or missing policy creates an owner review item with context and a proposed response. Tell the customer the request is awaiting review, stop conflicting automated replies, and resume only after the owner resolves the case.

### D. Owner review

The owner sees pending decisions, due deposits, reserved capacity, confirmed orders, and failed actions. Each approval shows the exact affected customer, order, amount, message, and policy exception. Approval applies to that version of the proposal only.

## 7. Functional requirements

P0 business mechanics apply to the usable Codex prototype at Phase 6 and the independent WorkBuddy app at Phase 7. In Codex, conversational acceptance uses documented supported scripts/quick actions plus forms, with unknown-input fallback and permanent scripted labels. General language understanding, live managed AI and owner MCP/WorkBuddy Automation acceptance apply only to Phase 7. Additional messaging channels remain P1.

| ID | Priority | Requirement | Acceptance criteria |
| --- | --- | --- | --- |
| FR-01 | P0 | Configure bakery knowledge | Owner can publish catalogue, FAQ, policies, and capacity with a version and effective time; invalid prices or missing mandatory policies block activation |
| FR-02 | P0 | Resolve customer context | A trusted message envelope selects exactly one business/customer record; displaying a different name or supplying another customer ID in message text cannot change scope |
| FR-03 | P0 | Consent and memory | Preference recall survives a new scoped agent session; declining memory still allows ordering; correcting or deleting an optional preference changes later recall |
| FR-04 | P0 | Grounded multilingual replies | BM, English, and mixed-language scenarios preserve the same business facts; price or policy claims reference an active knowledge record in the trace; missing information triggers clarification or handoff |
| FR-05 | P0 | Personalised repeat orders | "Same as last time" selects this customer's completed order, asks for missing details, and recalculates at current prices; absent history triggers a question |
| FR-06 | P0 | Capture and quote orders | Product, quantity, date, and slot are explicit before a quote; currency uses integer sen; the displayed item total and deposit match the catalogue and policy |
| FR-07 | P0 | Confirm and reserve | Explicit customer confirmation revalidates the quote and capacity; concurrent requests for the last available unit yield at most one reservation |
| FR-08 | P0 | Produce transaction documents | Quote, summary, invoice, and receipt have unique IDs, business/customer scope, amounts, dates, and status; a receipt is generated only after owner-verified payment |
| FR-09 | P0 | Control exceptions | Every off-policy discount, refund, custom order, and complaint creates an owner review item; no requested exception is promised before approval |
| FR-10 | P0 | Preserve human takeover | Customer can request a human at any stage; the owner receives transcript context and next action; customer automation remains paused until explicit resume |
| FR-11 | P0 | Follow up responsibly | A due unpaid order can receive at most one deposit reminder per policy; paid, cancelled, opted-out, escalated, expired, or duplicate tasks produce no reminder |
| FR-12 | P0 | Summarise operations | Daily digest shows order counts, verified deposits collected, unpaid amounts, capacity, pending reviews, and failures; every figure reconciles to business records |
| FR-13 | P0 | Audit actions | Every tool attempt records actor, scope, purpose, object version, result, timestamp, and correlation ID; retries preserve the original action identity |
| FR-14 | P0 | Prevent scope leakage | Reads, writes, and file access are checked against trusted scope outside the language model; adversarial customer messages cannot retrieve another profile or change owner permissions |
| FR-15 | P0 | Recover from errors | A failed write does not produce a success reply; a retry does not duplicate a committed order; failed delivery remains visible for owner recovery |
| FR-16 | P0 | Show impact evidence | Results panel reports the formulas in Section 3, sample size, baseline, demo mode, timing, corrections, and failed scenarios; synthetic payments are labelled |
| FR-17 | P1 | Add an external messaging channel | Sender identity, restricted permissions, delivery acknowledgement, and the supported integration path are demonstrated before that channel is claimed |

## 8. Business rules and autonomy

All values in this section are fictional demo settings to be validated with a real bakery.

| Rule | Demo setting |
| --- | --- |
| Currency and time | MYR; Asia/Kuala_Lumpur; store timestamps with timezone information |
| Catalogue | Brownie tray, 24 pieces: RM78; cupcake box, 12 pieces: RM48 |
| Price treatment | Owner-entered final selling prices; no additional pickup fees in the fixture |
| Standard lead time | At least 48 hours before pickup; shorter notice requires owner review |
| Pickup slots | 12:00-14:00 or 16:00-18:00 |
| Production capacity | Ten brownie trays and eight cupcake boxes per pickup date; fixtures may reduce remaining capacity to test contention |
| Quote validity | 30 minutes; quote states that availability is rechecked at confirmation |
| Deposit | 50% of the final total, rounded to the nearest sen using deterministic calculation |
| Reservation | Created only after customer confirmation; held for 24 hours pending verified deposit |
| Expiry | An unpaid expired reservation is cancelled and capacity released; reconcile expiry before accepting another reservation |
| Reminders | One reminder, no earlier than 12 hours after confirmation, while the reservation is active; send only between 09:00 and 20:00 |
| Approval expiry | 30 minutes or immediately when the proposal, order, or relevant policy version changes |
| Retention | Delete synthetic pilot records after the agreed demo period; configure real-data retention before a real pilot |

If a reminder's permitted send window falls after reservation expiry, suppress it. Immediately before delivery, recheck order status, consent, human takeover, and prior delivery. Expiry events and pending actions must be reconciled when an offline desktop resumes.

**Automatic workflow actions:** The agent answers supported FAQs, explains products and prepares quotes. After the customer presses the server-bound Confirm control, the backend creates a standard order with validated capacity, queues its documents, and later issues a permitted reminder. The model cannot grant purchase authorisation itself.

**Owner decision required:** Off-policy discounts, refunds, custom cakes, capacity overrides, short-notice orders, complaints, and unverifiable ingredient or allergen assurances. Owner approval of a custom proposal must still be followed by customer acceptance before an order is committed.

**Owner-only actions:** Verify payment, mark an order ready or completed, change business policies, adjust capacity, resolve complaints, and approve an exception. A customer-uploaded transfer image does not establish payment.

**Disallowed actions:** Invent prices or stock, claim a payment was received without verification, execute a refund, disclose another customer's data, or promise a dietary safety guarantee beyond verified bakery information.

Production tax treatment, invoice format, legal retention, and food-policy requirements must be confirmed by the business before using real transactions.

Order lifecycle:

`draft -> quoted -> awaiting_deposit -> confirmed -> ready -> completed`

The transition from `quoted` to `awaiting_deposit` requires customer confirmation and a successful reservation. Verified deposit changes the order to `confirmed`. An unpaid expiry produces `cancelled`; later cancellation requests require owner review. Exception review is a separate flag that pauses conflicting actions without disguising the underlying order state.

## 9. Experience requirements

The interface should make the next decision clear and use plain business language.

| Surface | Required content |
| --- | --- |
| Customer conversation | AI disclosure, human handoff, relevant order questions, itemised quote, Confirm/Edit controls, payment deadline, order status, and preference/marketing consent controls |
| Owner overview | Confirmed orders, reserved capacity, verified deposits, unpaid amounts, pending approvals, action failures, and global Pause control |
| Customer detail | This customer's consent status, editable preferences, previous orders, open issue, and current task |
| Approval queue | Exact proposed action and message, business reason, amount, affected order, Approve/Edit/Reject controls, and expiry |
| Knowledge settings | Catalogue and policy version, effective time, capacity, and a preview before publishing |
| Evidence panel | Workflow trace, generated files, measured timings, scenario outcome, and synthetic/live labels |

Responses must distinguish "quote prepared," "capacity reserved," "deposit verified," and "order confirmed." A pending review must include the next step without inventing an owner response time. A returning customer's remembered order is presented as a proposal to confirm.

Use readable mobile-sized conversation panels, labelled controls, keyboard-accessible actions, and status text that does not depend on colour alone. Keep agent role names and tool traces in the owner evidence panel rather than the customer conversation.

## 10. Agent design and data

### Logical roles

| Role | Responsibility | Allowed context and actions |
| --- | --- | --- |
| Orchestrator | Resolve trusted scope, classify intent, assemble context, and route the task | Current customer's task; active business knowledge; permitted tool catalogue |
| Customer agent | Preserve continuity, ask clarifying questions, and propose a next step | Current customer's consented preferences and relevant order history |
| Sales and support role | Answer policy questions and assemble order proposals | Approved catalogue and FAQ; scoped customer context |
| Order and billing role | Calculate totals, reserve capacity, and produce documents | Validated structured inputs; scoped orders; deterministic business tools |
| Owner digest role | Summarise business-wide activity and pending decisions | Owner-authorised business records only; no customer-facing delivery authority |

Codex demonstrates these logical roles/contracts in the reference prototype. WorkBuddy reimplements them and adds the actual managed AI integration in the final rebuild. Customer-facing roles run within a server-bound customer scope; WorkBuddy owner tools operate separately with narrowly granted business authority. Naming prompts "agents" does not establish independent permissions or delegation.

In Codex these are branches of one rule-based dispatcher calling domain services, not separate autonomous/model agents. Do not build a multi-agent framework or MCP runtime for this demo. WorkBuddy authors actual orchestration later.

Processing sequence:

`trusted message -> scoped context -> knowledge lookup -> proposed action -> policy validation -> customer/owner confirmation if needed -> business tool -> verified result -> reply and audit`

### Minimum records

| Record | Required fields |
| --- | --- |
| Business | Business ID, owner identity, timezone, active knowledge/policy version |
| Customer | Business/customer ID, trusted channel identity if live, preferred language, separate consent flags and timestamps |
| Preference | Customer scope, value, source interaction, consent basis, updated time; exclude sensitive health details in the MVP |
| Catalogue and policy | Item/policy ID, description, final price in sen, ingredients where verified, lead time, version, effective time |
| Capacity | Business, SKU, pickup date, allowed quantity, reserved quantity, record version |
| Order | Scope, order ID, line items, price snapshot, pickup details, state, deposit due, verified paid amount, reservation expiry, idempotency key |
| Approval | Owner identity, scoped action, exact proposal/version, reason, state, expiry, decision time |
| Follow-up | Scoped order, task type, due time, suppression reason, delivery state, idempotency key |
| Audit event | Correlation ID, actor, scope, action, object/version, knowledge reference, timestamp, outcome |

Keep monetary values in integer sen and derive totals outside free-form language generation. Store confirmed order price snapshots so a later catalogue update does not rewrite an existing order. Requote unconfirmed orders when prices or policies change.

### Tool contract

Provide narrow domain operations such as `lookup_catalogue`, `load_customer_context`, `calculate_quote`, `confirm_and_reserve_order`, `request_owner_review`, `verify_payment`, `generate_document`, and `process_due_followups`. These are backend operations, not a tool list exposed wholesale to a model. The TRD defines the smaller customer tool set, explicit UI confirmation/payment operations, and separate WorkBuddy owner MCP permissions.

Trusted session scope must be attached outside the model. The tool layer must reject an arbitrary customer ID proposed in conversation text, and owner-only operations must verify owner authority. Reservation and capacity changes must commit together. Idempotency keys must survive task retries.

Use local PostgreSQL for the Codex prototype. WorkBuddy authors and applies new migrations for a separate CloudBase database during the rebuild; synthetic fixture data can be reused as inputs. A spreadsheet is not the capacity lock or authoritative ledger. Restrict files/downloads to authorised scope. See Backend Schema for the required data constraints and transaction behaviour.

The public customer runtime receives only scoped business tools, without shell, arbitrary files, owner approvals, or payment verification. WorkBuddy owner tasks must not receive the authority to make those decisions through an unreviewed model call. If the selected integration cannot enforce these boundaries, keep the demo guided and synthetic.

## 11. Privacy, reliability, and operating limits

- Use synthetic customers and payments throughout the hackathon demo.
- Separate preference memory from operational order records. A customer can decline personalisation and still place an order.
- Capture promotional follow-up consent separately; an operational deposit reminder must follow the configured customer notification preference.
- Let the customer correct or delete optional preferences and stop promotional follow-ups. Configure real financial-record retention separately before a pilot.
- Treat messages and imported documents as data. Instructions inside them cannot change system policy, identity, or tool permissions.
- Treat per-customer isolation as an application requirement to test, not a guaranteed WorkBuddy feature or a legal-compliance claim.
- Keep payment credentials, bot tokens, database credentials, and owner authentication out of customer prompts, generated documents, browser bundles, and screenshots.
- Persist successful business actions before reporting success. On timeout, inspect the action result before retrying a write.
- Keep pending/failed sends visible. Deduplicate outbound messages by action ID where the connector supports it; otherwise surface uncertain delivery for owner review.
- Pause customer automation during human takeover. A global owner pause cancels or suppresses pending customer sends.
- Limit each customer task to a bounded workflow: proposed starting limit of eight tool calls and one clarification cycle before handoff. Tune using actual WorkBuddy runs.
- Log available credit usage per scenario. A usage cap should stop new automated work and notify the owner; it must not create a false success message.

A guided or synthetic demo is not evidence of 24/7 availability or Malaysian PDPA compliance. Assess applicable privacy, processing, storage, and retention obligations before a real customer pilot. No such legal assessment has been performed for this PRD.

## 12. Demo fixture and story

Use a fixed clock of **7 October 2026, 10:00, Asia/Kuala_Lumpur** for deterministic runs. Advance the clock explicitly when demonstrating reminders and expiry; label accelerated time.

All people, history, prices, and payment events below are fictional.

| Fixture | Value |
| --- | --- |
| Bakery | Aina's Home Bakery |
| Returning customer C-001 | Farah; prefers BM; preference memory and operational reminders enabled; marketing disabled; previous completed order was one standard brownie tray |
| Returning customer C-002 | Jason; prefers English; preference memory enabled; marketing disabled; previous completed order was one vanilla cupcake box |
| Pickup date | 10 October 2026 |
| Pickup slot | 16:00-18:00 |
| Farah's proposed order | One brownie tray, RM78 total, RM39 deposit, RM39 remaining after verified deposit |

**Suggested five-minute demonstration**

| Time | Presenter action | Visible proof |
| --- | --- | --- |
| 0:00-0:40 | Explain the bakery problem and show scripted prototype mode (managed AI only in the future rebuild) | Manual baseline and chosen customer workflow |
| 0:40-1:30 | Farah: "Nak brownies macam last time, Sabtu ni." | Correct customer memory; agent confirms 10 October and the pickup slot |
| 1:30-2:15 | Farah confirms the RM78 proposal | Fresh capacity check, one reservation, order summary, RM39 deposit invoice |
| 2:15-2:55 | Farah requests a 30% discount | Owner review item; no discount commitment before approval |
| 2:55-3:30 | Owner rejects the discount; Farah retains the standard order | Audited decision and clear customer response |
| 3:30-4:15 | Advance the clock to 8 October, 09:00 while the order is unpaid | One due deposit reminder, followed by owner verification of a simulated RM39 payment and a receipt |
| 4:15-5:00 | Switch to Jason and open the owner digest | Separate cupcake history, reconciled deposits and orders, measured results |

Farah's reservation expires on 8 October at 10:00 unless the deposit is verified. The reminder is due after 22:00 on 7 October, so the quiet-hours rule defers it to 09:00 on 8 October. Run rejection, expiry, and capacity-contention scenarios separately as needed to keep the presentation clear.

## 13. Acceptance and evaluation plan

| Scenario | Required result |
| --- | --- |
| New customer declines memory | Standard order remains possible; no optional preferences persist |
| Returning customer starts a new task | Correct history loads after task restart; current prices replace previous prices in the new quote |
| Language changes to BM or English | Same amounts, policy, and order fields; chosen language preserved |
| Date or quantity is ambiguous | One concise clarification; no premature order or reservation |
| Catalogue lacks an answer | No invented policy; owner handoff records the missing information |
| Quote expires or catalogue changes before confirmation | Requote and request fresh customer confirmation; no reservation uses an expired or outdated proposal |
| Two customers request the last available tray | At most one order reserves it; the other receives alternatives or handoff |
| Customer requests a discount or refund | Review item appears; no refund execution or unapproved commercial commitment |
| Approval payload changes after approval | Old approval cannot authorise the edited action; new review required |
| Customer asks for another person's orders or file | Access denied or safely answered without revealing scoped data |
| Customer message contains tool or policy instructions | Treated as untrusted text; no permission or identity change |
| Payment image uploaded without verification | Order remains unpaid; no receipt or payment claim |
| Payment verified before reminder executes | Due reminder is suppressed; one receipt issued |
| Reminder scheduled during quiet hours | Deferred within the active reservation window or suppressed if it would be too late |
| Reservation expires while local worker (or future WorkBuddy scheduler) is offline | On resume or next guarded booking/payment operation, expiry is reconciled, capacity released, stale reminder suppressed |
| Order or document tool times out after commit | Retry checks the prior action and returns the existing result without duplication |
| Customer asks for a human; owner pauses automation | Automated customer actions remain paused until authorised resume |
| Customer corrects or deletes a preference | Subsequent recall uses the correction or omits the deleted preference |
| Digest generated after the run | Counts and amounts reconcile; synthetic transactions clearly labelled |

Evaluate the same representative tasks manually and with the prototype. Record owner active time, elapsed time, tool failures, required corrections, and a reviewer verdict for each workflow. A correct reply alone does not count as completing an order: the required records and documents must exist.

The final MVP is ready when the newly rebuilt WorkBuddy project passes P0 scenarios, reports the 30-conversation managed-AI evaluation honestly, survives a fresh session and has deployment evidence. The Codex reference prototype is a separate milestone and cannot inherit or imply final WorkBuddy acceptance. Missed targets and provenance must be reported.

**Codex prototype ready:** Phase 6 passes a complete local enquiry-to-order-to-owner-payment-to-receipt flow, repeat ordering with scoped saved history, exceptions/takeover, reminders/expiry and a reconciled digest. Forms and supported scripts work after restart; documents really download; setup/seed/start/reset instructions are reproducible without WorkBuddy/cloud/model keys. At least 30 scripted and unsupported-input cases report actual outcomes and limitations. No live-AI accuracy claim is derived from them. WorkBuddy agentic features remain explicitly deferred.

## 14. Build sequence and deliverables

The sequence assumes a short hackathon; the event duration and team size have not been provided.

| Stage | Deliverable and exit condition |
| --- | --- |
| Phase 0. Specifications | Codex: this document set, delivery strategy, contracts, and progress plan |
| Phase 1. Foundation | Codex: local workspace, locked dependencies, Postgres, identity/storage/clock boundaries and app shell |
| Phase 2. Data and identity | Codex: migrations, synthetic seed data, scoped repositories and local development auth |
| Phase 3. Business API | Codex: catalogue, quotes, confirmation, capacity, approvals, payment verification, audit |
| Phase 4. App flows | Codex: customer and owner interfaces connected to the API |
| Phase 5. Scripted assistant and local jobs | Codex: hardcoded intent rules/templates calling real services, documents, durable jobs, local worker/clock controls and digest; no AI/MCP SDK |
| Phase 6. Usable prototype acceptance and handoff | Codex: runnable persistent local app, setup/demo guide, acceptance gate and portable requirements/design/schema/fixtures/screenshots/behaviour reference pack |
| Phase 7. WorkBuddy independent rebuild | WorkBuddy: fresh foundation, schema/API/UI/tools/tests, managed AI, cloud deployment and final documentation |

If time becomes tight, cut live messaging, reorder marketing, extra products, and additional independent agent roles. Retain explicit confirmation, accurate totals, scoped records, approvals, and a complete guided order flow.

Retain separate Codex reference evidence and WorkBuddy rebuild evidence. Redact credentials. Record the WorkBuddy version, new project/environment, model configuration and its own test results. Do not describe a Codex-created file as WorkBuddy-authored or reuse the prototype's pass status as rebuild evidence. The Implementation Plan defines phase/subphase-end tests and checkpoints.

## 15. Risks and decisions still required

| Risk or unresolved decision | Response or gate |
| --- | --- |
| Exclusive-tool interpretation | Confirm whether external planning, runtime libraries, and third-party MCP services are permitted; do not claim this Codex draft satisfies the rule |
| Native Telegram mistaken for a customer bot | Treat documented Assistant integration as owner control; require a separate restricted path for public customers |
| Account lacks a required feature | Verify documented interfaces during planning and actual access during the rebuild; retain the labelled reference prototype |
| Prompt-only privacy controls | Enforce scope and owner authority in tools; use synthetic data until runtime confinement is established |
| Incorrect price, payment, or capacity claim | Deterministic calculations, version checks, atomic reservations, and owner payment verification |
| Credit consumption grows with customer count | Load only relevant scoped context, bound tool calls, and measure per-scenario usage |
| Real bakery practices differ from fixtures | Validate prices, deposits, lead time, capacity, tax settings, and handoff rules with the pilot business |
| Unsupported market or impact claims | Use measured pilot results; do not repeat lecture statistics or synthetic revenue as validated business evidence |
| Instagram inspiration cannot be inspected | Treat the links as unverified inspiration; no reel-specific feature claims are included |

Before Phase 1, resolve local runtime/dependency compatibility and demo scope using public documentation. WorkBuddy is used in Phase 7 as requested. Before a real pilot, resolve actual business policies, consent/retention, platform access controls, quotas, deployment region, and operating arrangements.

## Appendix A. Sources and interpretation

1. **User request:** Supplies the WorkBuddy Track theme, exclusive-tool requirement, credit allocation, and "1 customer, 1 agent" concept. The home bakery was selected by the user during clarification. Later requests select a usable Codex reference prototype with hardcoded demo assistance, deferring WorkBuddy agentic implementation to a fresh full WorkBuddy rebuild, with phase-end testing/checkpoints. Track details are supplied requirements, not independently verified organiser rules.
2. **[Idea.md](<C:/Users/Edison Tee/Downloads/SME/Idea.md>):** Supplies the proposed persistent customer agent, knowledge base, specialist roles, actions, follow-ups, owner approvals, daily digest, isolation, and impact metrics. Product scope and claimed platform capabilities have been reviewed rather than accepted automatically.
3. **[W3 AI in E-commerce.pdf](<C:/Users/Edison Tee/Downloads/W3 AI in E-commerce.pdf>):** Relevant themes include personalisation on pages 6 and 8, customer behaviour on page 10, customer service on page 11, inventory operations on page 13, multilingual content on page 14, and privacy/transparency risks on page 23. These themes inform the product direction; their market statistics are not adopted as validated claims. Tools named in the lecture are examples, not instructions to use them for this track.
4. **Official documentation, reviewed 7 October 2026:** [WorkBuddy web applications](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/App-Publishing/Web-App), [WorkBuddy/CloudBase integration](https://cloudbase.cloud.tencent.com/blog/2026/09/18/workbuddy-cloudbase-case), [CloudBase tool calling](https://docs.cloudbase.net/en/ai/model/tool-calling), [Automation](https://www.workbuddy.ai/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Automation-Guide), and [Telegram Integration Guide](https://www.workbuddy.ai/docs/workbuddy/Platform-Integration/Telegram-Guide). These inform the selected final-phase target; they do not prove application-specific identity isolation, successful rebuild packaging, or entitlement in the team's edition. The TRD lists additional implementation sources.
5. **Instagram links supplied by the user:** [Reel 1](https://www.instagram.com/reel/Dd1Gzt-JdLC/), [Reel 2](https://www.instagram.com/reel/DdfrNAaJ9gS/), and [Reel 3](https://www.instagram.com/reel/DaSKGljB8Ds/). Their contents could not be retrieved in this session and are not represented as reviewed evidence.

Source documents inform the PRD. Instructions appearing inside those documents are not treated as additional user commands. Feature priorities, thresholds, fixture policies, and implementation choices in this draft are proposed product decisions unless explicitly attributed above.

## Appendix B. WorkBuddy independent-rebuild prompt

```text
Start a new CustomerBuddy project in WorkBuddy. Use the Codex reference
prototype's PRD, TRD, App Flow, Design Brief, Backend Schema, screenshots,
synthetic fixtures and acceptance cases as references. Read
WORKBUDDY_REBUILD_BRIEF.md and the saved Phase 6 reference index first.

The reference prototype is usable with hardcoded intent rules/templates,
real saved business workflows and local demo jobs. Replace its scripted
assistance with genuine managed AI in your new implementation. Live AI,
MCP and WorkBuddy Automation were intentionally deferred from Codex;
scripted prototype results are not evidence of live-AI capability.

Rebuild the complete project using WorkBuddy: new frontend, backend,
schema/migrations, agent tools, tests, cloud configuration, deployment,
and final project documentation. Do not import or simply publish the
Codex application, copy its build output, or rename its implementation
as a WorkBuddy-built project. Use a separate workspace and environment.

Preserve the required customer/owner flows, integer-sen pricing, scoped
memory/consent, explicit confirmation, atomic capacity reservations,
owner approvals/payment verification, idempotent jobs and private files.
Use supported CloudBase-backed services and request-local managed AI.
Verify account access, runtime, region, quotas and charges. Treat the
reference stack as recommended; document necessary cloud adaptations.

Complete rebuild subphases 7A through 7E from IMPLEMENTATION_PLAN.md.
Run tests only after each subphase's build checklist is complete; rerun
failed/affected checks after repair. Generate your own test implementation
from the acceptance expectations. Do not inherit prototype pass results.

Save progress and the exact next action before usage-limit handoffs.
Generate final PRD/TRD/setup/demo/evaluation documents and slides in
WorkBuddy from the rebuilt app. Keep truthful reference/rebuild provenance.
If a required feature is unavailable, record a partial/blocked rebuild;
do not present the Codex prototype as the completed WorkBuddy project.
```

# CustomerBuddy - Technical Requirements Document

Version 0.5 | 7 October 2026 | Phase 4 checkpoint preserved; requested WorkBuddy expansion specified, not implemented; no deployment.

Related: [PRD](<PRD.md>), [Backend Schema](<BACKEND_SCHEMA.md>), [Implementation Plan](<IMPLEMENTATION_PLAN.md>).

## 1. Delivery decision

Codex builds a local reference prototype and prepares a portable behaviour/design/data reference pack in Phases 1-6. Tencent WorkBuddy independently rebuilds the complete application in a new workspace in Phase 7, including frontend, backend, migrations, agent tools, tests, deployment and documentation. The PRD records the competition-rule distinction.

**Current build boundary:** The Codex prototype is a usable local application. Hardcode assistant intent rules and language templates; persist actual customer/order/payment/approval/job/document records and call real domain services. Use a local scheduler and owner demo controls in place of WorkBuddy Automation. Do not implement a live LLM, CloudBase AI adapter, MCP server/connector or Tencent deployment in Phases 1-6. No WorkBuddy account, AI credits or model/cloud keys are required for the prototype. Phase 6 completion is independent of the later rebuild.

The final target is WorkBuddy's CloudBase-backed application services. The reference app remains a separate local artifact. WorkBuddy consumes the specifications/screenshots/fixtures as inputs and authors the final implementation; it does not merely import or publish the Codex app. Account access, runtime support and resource charges remain verification gates.

**Expansion boundary:** PRD FR-18â€“FR-27 extend the fresh WorkBuddy project after its core flow, within 7A-7E. All are required for the expanded requested release; optional ML upgrades and external delivery require separate capability/data evidence. The current request updates specifications only. No expansion endpoint, migration, model, library installation or UI is implemented by this revision; Phases 1â€“4 evidence is unchanged.

## 2. Proposed tech stack

| Layer | Selection | Reason / owner |
| --- | --- | --- |
| Development assistants | Codex for reference; WorkBuddy for final rebuild | Separate implementations and evidence |
| Package tooling | pnpm workspace; Git; Node.js supported LTS | One TypeScript workspace and reproducible lockfile; verify local/cloud Node compatibility in Phase 1 |
| Frontend | React, Vite, TypeScript, React Router | Portable static build suitable for WorkBuddy/CloudBase hosting |
| UI | Tailwind CSS, shadcn/ui primitives, Lucide icons | Accessible controls and a consistent design system |
| Forms/data | React Hook Form, Zod, TanStack Query | Validate inputs and manage server state without duplicate local stores |
| API | Node.js, Express, TypeScript | Local HTTP server now; new CloudBase HTTP-function packaging in WorkBuddy Phase 7 |
| Contracts/domain | Zod contracts; plain TypeScript services | Shared validation; policy independent of transport or model |
| Database | PostgreSQL locally and CloudBase PostgreSQL at deployment | Transactions, constraints, scoped queries, and capacity locking |
| SQL tooling | Versioned SQL migrations; pg driver (prototype); independently selected cloud tooling | Versioned relational schema; explicit SQL for locking and atomic writes |
| Identity | Local synthetic identity adapter; freshly implemented CloudBase Auth in Phase 7 | Cloud-issued identity maps to the rebuilt application's records |
| Storage/documents | Local private storage adapter; HTML plus pdf-lib PDFs | Working scoped downloads now; private CloudBase storage authored in Phase 7 |
| Demo assistant | Hardcoded TypeScript intent rules, Zod inputs and BM/English templates | Real scoped domain calls; no model dependency; scripted mode always visible |
| Future customer AI | Newly authored request-local CloudBase AI adapter | WorkBuddy Phase 7D only; no prototype adapter implementation |
| Future owner agent tools | WorkBuddy connector; official MCP TypeScript SDK | WorkBuddy Phase 7D only; no Codex MCP package |
| Jobs | PostgreSQL jobs/outbox; bounded worker entry point | Persistent retries and restart recovery; no new queue vendor for the MVP |
| Prototype scheduling | Local bounded worker plus owner Run due jobs and demo clock | Real persisted jobs, due-state checks and retry recovery without WorkBuddy |
| Future scheduling | WorkBuddy Automation invoking bounded backend operations | Phase 7 only; verify actual frequency/background availability |
| Verification | Vitest, Supertest, Playwright | Phase-end domain/API/browser checks; no watch mode or edit-triggered full suites |

Lock prototype versions during Phase 1. WorkBuddy verifies and locks its own supported versions during rebuild Phase 7A. The table is a recommended common stack, not a requirement to copy the prototype lockfile/source. Preserve API behaviour and domain invariants if final cloud packaging differs.

## 3. Planned repository layout

```text
apps/web/                 customer and owner React routes
apps/api/                 Express routes, middleware, local server
packages/contracts/       Zod inputs, outputs, error codes
packages/domain/          quote/order/payment/approval policy services
packages/db/              SQL schema, migrations, scoped repositories, seeds
packages/demo-assistant/  allowlisted intent rules, templates, response cards
apps/worker/              local bounded scheduler over persisted jobs/outbox
scripts/                  phase gate runners, fixtures, handoff packaging
docs/evidence/            concise phase-end results and final integration proof
```

The Codex workspace now contains the foundation, SQL data model, synthetic sessions and scoped read/profile/consent APIs. Commerce writes now exist; UI flows, assistant dispatch and jobs remain Phases 4â€“5. WorkBuddy creates equivalent modules independently in its fresh project.

`integrations/workbuddy/`, managed-AI runtime modules and `infra/cloudbase/` belong to the future WorkBuddy project. Do not scaffold them or install their SDKs as prototype requirements. Describe future integration contracts in the reference documents only.

## 4. Runtime architecture

```text
Customer browser -> local synthetic session -> API -> scoped services -> PostgreSQL
                                                -> scripted intent dispatcher
                                                -> validated calls to same services
Owner browser    -> owner API -> approvals/payment verification/settings
Local worker / owner demo controls -> bounded jobs -> in-app messages, PDFs, digest
```

Future Phase 7 architecture: WorkBuddy authors new cloud Auth/API/data/storage and managed-AI orchestration, plus owner MCP tools/Automation. This replaces the scripted assistant/local scheduling within an independently rebuilt project.

The browser never submits its role, business authority, prices, or payment status as trusted facts. Middleware verifies identity and resolves business/customer scope. Both ordinary API calls and model tools use the same domain services.

Use authenticated HTTP polling for message/job status initially. The prototype runs local web/API/worker processes; the future cloud implementation must not depend on a permanently running HTTP function or WebSockets. Streaming is a later enhancement only if the selected runtime supports it.

## 5. Authentication and permissions

- Local development uses synthetic accounts through an explicit loopback-only adapter. A visible demo identity selector is disabled in cloud builds. Cloud startup must fail if development auth is enabled.
- CloudBase Auth credentials are verified by the supported server SDK/token-verification path. Resolve memberships/customer records from the verified subject. Client-supplied role or customer IDs do not establish authority.
- Separate customer, owner, and integration permissions. Scope every repository call and apply database policies/least-privilege grants as documented in the Backend Schema.
- Owner-only mutations require a current authenticated owner session and explicit UI action. WorkBuddy MCP credentials cannot approve discounts, verify payments, or alter owner roles.
- For cookie sessions, use secure HttpOnly cookies and CSRF protection for mutations. If using bearer tokens, validate issuer/audience/expiry and an exact allowed origin list. Do not treat a public environment ID as authentication.
- Customer object access outside scope returns a consistent not-found response. Keep detailed denial reasons in the private audit log.

## 6. API contract

Prefix application routes with `/api/v1`. Return structured data and correlation IDs. All identifiers are UUIDs internally; display codes such as C-001 are labels.

| Endpoint / family | Actor | Behaviour |
| --- | --- | --- |
| `GET /me` | Signed-in user | Resolve role, business, customer, consent, and demo mode |
| `GET /catalogue`, `GET /pickup-options` | Customer/owner | Read published catalogue and permitted dates/slots |
| `GET/POST /conversations`, `POST /conversations/:id/messages` | Customer | Persist scoped messages and execute/enqueue one bounded scripted run now; managed AI only in the rebuild |
| `GET /conversations/:id/messages` | Customer | Read scoped messages and processing status |
| `PATCH /me/preferences`, `POST /me/consents` | Customer | Explicit preference/consent actions; append consent history |
| `POST /quotes`, `GET /quotes/:id` | Customer | Validate inputs; compute a versioned itemised quote |
| `POST /quotes/:id/confirmation-challenge` | Customer | Issue short-lived challenge tied to the displayed proposal |
| `POST /orders/confirm` | Customer | Verify challenge and idempotency key; atomically reserve capacity |
| `GET /orders`, `GET /orders/:id` | Customer | Only this customer's orders |
| `POST /orders/:id/handoff` | Customer | Open an owner case and pause conflicting automation |
| `GET /documents/:id/download` | Scoped customer/owner | Prototype: scoped authenticated PDF stream; WorkBuddy: scoped short-lived private download |
| `/owner/orders`, `/owner/customers`, `/owner/dashboard` | Owner | Business-scoped operating views |
| `POST /owner/approvals/:id/decision` | Owner | Approve/edit/reject the exact current proposal |
| `POST /owner/payments/verify` | Owner | Record verified demo payment; reconcile deposit and reservation state |
| `POST /owner/orders/:id/status` | Owner | Ready/completed transitions or reviewed cancellation |
| `/owner/catalogue`, `/owner/policies`, `/owner/capacity` | Owner | Publish versions and validated changes |
| `POST /owner/automation/pause` | Owner | Stop eligible customer sends; state is persisted |
| `POST /owner/demo/jobs/run`, `POST /owner/demo/digest` | Local demo owner | Process bounded eligible jobs / generate a digest from current records |
| `POST /owner/demo/clock`, `POST /owner/demo/reset` | Local demo owner | Pause/resume/advance the demo clock; explicitly confirm synthetic-only reset |
| `POST /internal/jobs/process-batch` | Worker; future restricted integration | Process bounded due work with trusted business scope; future MCP calls cannot bypass guards |

Require an `Idempotency-Key` for order confirmation, payment verification, approval decisions, and other externally retried writes. Bind the key to actor, operation, and canonical request hash. Reusing a key with a changed payload returns `409`.

Error codes include `QUOTE_EXPIRED`, `QUOTE_CHANGED`, `CAPACITY_UNAVAILABLE`, `APPROVAL_REQUIRED`, `HUMAN_TAKEOVER`, `PAYMENT_REVIEW_REQUIRED`, `AGENT_UNAVAILABLE`, and `RETRY_PENDING`. Never return success before the transaction commits.

## 7. Business service invariants

1. Money is integer sen. The catalogue and policy are authoritative; the model cannot override values.
2. Quotes expire after 30 minutes and never hold capacity. Confirming uses the displayed version and a server-issued confirmation challenge.
3. Lock all affected capacity buckets in stable order. Order, items, reservation, job/outbox entries, and success audit commit together.
4. An unpaid hold lasts 24 hours. Lazy expiry runs before competing reservations; scheduler failure must not permit overbooking.
5. Verified deposits move held units to committed units without increasing total booked capacity. Late payment on an expired hold requires owner review and a fresh capacity check.
6. Approval is bound to exact proposal hash/version, policy version, amount, order, owner, and expiry. An edited proposal needs fresh approval and, if applicable, customer acceptance.
7. Customer reminders recheck consent, order/payment state, takeover, global pause, expiry, and deduplication immediately before delivery.
8. Receipts derive from verified payment records. Documents and messages are separate jobs so an artifact failure cannot roll back a valid order or imply a missing order succeeded.

## 8. Scripted prototype assistant and future customer agent

### 8.1 Codex implementation: DemoAssistant

Implement a deterministic dispatcher, not a planning/model loop. Accept structured quick-action intents or a documented allowlist of BM/English/mixed-language keywords and sample phrases. Supported intents: catalogue/FAQ, repeat order, prepare quote, order status, preference proposal, exception and human handoff. Collect missing fields through structured controls; require an exact date and pickup slot rather than inferring ambiguous "Saturday" silently.

Pipeline: authenticate and bind scope -> persist input -> match allowed intent -> validate inputs -> load current records/invoke domain service -> render a language template and authoritative response card -> persist outcome. Use per-conversation ordering and idempotency to prevent duplicate replies/writes. Templates may hardcode wording, but interpolate current prices, dates, payment state and document availability from service results.

Unknown input returns supported quick actions and Ask owner. It must not invent an answer or report an operation succeeded. If human takeover is active, preserve the message and show the waiting state. Preference changes, confirmation, approvals and payments still require explicit customer/owner controls. Forms remain a reliable path even when text matching fails.

Return `assistant_mode=scripted`, matched intent, script version, fact/service references and outcome in safe trace metadata. Keep model/token usage null because no model is called. The permanent customer label is "Demo assistant â€” scripted responses". Seed data and scripted wording are synthetic; database mutations and documents must actually work.

### 8.2 Future WorkBuddy implementation only

Customer orchestration is application code backed by managed AI configured during Phase 7. It is not an unverified API call to the WorkBuddy desktop agent. Persistent memory lives in the application's scoped records.

| Tool | Authority | Required safeguard |
| --- | --- | --- |
| `lookup_business_knowledge` | Read published business facts | Fact/version references; no arbitrary URL or file reading |
| `load_my_order_context` | Read current customer context | Customer scope bound in server closure, not model arguments |
| `prepare_quote` | Create a quote | Deterministic price/date/capacity validation |
| `get_my_order_status` | Read scoped order | Consistent denial for unrelated IDs |
| `request_human_review` | Open scoped case | Pause conflicting agent actions; deduplicate repeated request |
| `suggest_preference_update` | Propose preference change | Persist only after explicit consent/customer action |

Order confirmation is performed by the customer's Confirm control and API challenge, not by an unconstrained model tool. Likewise, payment verification and approval are owner UI operations.

Create a fresh tool registry per request/session context; do not use a global mutable registry containing another customer's identity. Validate tool arguments with Zod and return typed results. Starting limits: eight total tool calls, four sequential planning steps, and a 25-second agent deadline; hand off on exhaustion. Confirm the SDK's exact `maxSteps` semantics and enforce an independent application call counter.

Render authoritative prices and states in structured cards from tool results. On failure, show the committed state and available next action rather than accepting invented model claims. Redact logs and do not store hidden model reasoning.

## 9. WorkBuddy owner MCP package

This section specifies future permissions only. Defer all MCP package/manifest/SDK implementation, connector setup and protocol testing to WorkBuddy Phase 7D. The Codex prototype uses ordinary owner UI/API controls and local jobs; it does not need an MCP server. WorkBuddy generates and connects new tools/skills in its fresh project. Prefer supported local stdio for the owner demo or authenticated HTTPS transport; verify the SDK major and connector fields then.

Expose `get_owner_digest`, `list_pending_reviews`, `list_unpaid_orders`, `get_capacity_summary`, `enqueue_due_followups`, and `get_job_status`. These operate on the integration credential's fixed business scope. Enqueueing a follow-up does not bypass delivery eligibility checks.

For the expanded project, add business-fixed read summaries for agents, sales/invoices, stock, forecasts and risk counts, plus `enqueue_approved_campaign` only after explicit owner approval of the exact campaign revision/audience policy. That bounded enqueue rechecks approval/version/window and all delivery guards; it cannot approve content, select arbitrary recipients, publish prices or verify payments. Keep build-time CloudBase administrative tooling separate from this runtime package.

Use read-only owner summaries and bounded operations. Keep owner approval, payment verification, arbitrary SQL, arbitrary shell/file execution, and connector-management tools out of this package. Never forward raw customer instructions as trusted WorkBuddy owner-task instructions.

## 10. Jobs, documents, and scheduling

Persist jobs with type, entity, state, attempts, due time, lease, unique action key, and last error. Workers claim bounded batches using locked rows and short leases. No unbounded loop lives inside a cloud HTTP request.

Use a transactional outbox for customer notifications and document requests. Commit business state first; the worker generates the document or publishes the message. Prefer in-app reminders for P0 so delivery can be a single idempotent database write; external-channel delivery remains P1.

WorkBuddy Automation triggers processing and daily digest generation in Phase 7. Exact trigger frequency and background availability are account-specific. If hourly scheduling is used, report actual scheduling delay. The 30-second routine-reply target applies to synchronous customer chat, not delayed scheduled work.

**Codex scheduling:** A local worker claims bounded due batches; owner-only Run due jobs and Generate digest invoke the same guarded services. Show the last run, due/failed/suppressed jobs and current demo time. Default demo clock starts at 7 October 2026, 10:00 Malaysia time, paused for a reproducible walkthrough; owner can resume real-time progression or advance it explicitly. Persist its base time/mode so restarts do not reset deadlines. Use this clock consistently in quotes, approvals, reservations and job due times. Local worker downtime leaves jobs queued; lazy expiry remains enforced by booking/payment services. Lease expiry/recovery uses real UTC/database time, separate from the controllable business clock, to avoid stranded claims when demo time is paused or advanced.

Reset demo requires an authenticated owner and explicit confirmation, and is enabled only against a validated local synthetic environment. Stop/quiesce the worker, reset only demo-scoped records and local generated files, restore seeds/clock, then resume. Never infer a reset target from a customer message or accept an external database target.

Store generated quote/invoice/receipt files privately. The local prototype streams downloads through an authenticated, scope-checked endpoint without a bearer URL; the independent WorkBuddy rebuild uses scoped short-lived private links. Use database summaries as the source; do not render model-generated totals. File generation jobs have unique document identity and content hashes.

## 11. Configuration and deployment

**Prototype configuration:** `APP_ENV=local-demo`, `PUBLIC_API_BASE_URL`, local `DATABASE_URL`, `AUTH_ADAPTER=demo`, `ASSISTANT_MODE=scripted`, `ALLOWED_ORIGINS`, server-only local document path and persisted demo-clock settings. Bind demo identity/control endpoints to loopback. Do not require `CLOUDBASE_ENV_ID`, WorkBuddy credentials, model keys or integration tokens. Provide environment examples and reproducible install/migrate/seed/start/stop/reset instructions; start the configured web/API/worker with one command.

**Future WorkBuddy configuration:** Add verified CloudBase environment/auth/storage/AI settings and server-only integration credentials in the new Phase 7 project. Only explicitly public values enter its browser build. Production rejects demo auth/clock/reset and scripted assistant mode; a restricted synthetic preview must remain visibly labelled. Cloud configuration is not a prototype completion dependency.

Phase 7 rebuild sequence (subphases and test gates are in the Implementation Plan):

1. Create a fresh WorkBuddy project and read the reference pack/rebuild brief. Verify account, runtime, region, quota and charges. Do not use a copied Codex build as the new project.
2. WorkBuddy generates new project scaffolding, dependency/configuration files, migrations, identity mapping and restricted roles. Enable a separate CloudBase staging environment and seed synthetic fixture inputs.
3. WorkBuddy rebuilds domain services/API and tests for quotes, confirmation, capacity, approvals, payments and audit. Implement the same invariants; generate new migration/test code.
4. WorkBuddy recreates the customer and owner interfaces from screenshots/design tokens/flows and implements documents, storage, jobs and the outbox.
5. WorkBuddy authors customer orchestration and owner MCP tools, enables request-local managed AI, and configures permitted automations. Verify the actual model/SDK and bounded tool behaviour.
6. Complete each rebuild subphase before running its defined gate. Prototype evidence is a comparison target, not passing evidence for the new source.
7. Deploy the new API/worker/frontend to reviewable staging, run final deployment-specific acceptance, and publish the new WorkBuddy project/materials. Public sharing is a distinct release decision with a concrete staging result.
8. Retain new source, generated documentation, task history, deployment identifiers and test outcomes. Keep the Codex reference project separate and record any design differences.

If cloud packaging differs, WorkBuddy authors the appropriate final adapters and records the difference. If a mandatory boundary is unsupported, mark the rebuild partial/blocked and retain the reference prototype; do not automatically publish the prototype or choose another cloud/model provider.

Rollback restores the previous application build and disables incompatible scheduled work. Database changes use backward-compatible migrations where possible; take a snapshot/export before destructive changes. Never assume rolling back code also reverses schema or customer records.

## 12. Verification and operating limits

The Implementation Plan owns test gates for Codex phases and WorkBuddy rebuild subphases. Author meaningful tests during a phase/subphase, execute them after its build checklist is complete, then rerun only failed/affected cases after repair. The rebuild needs its own tests; a matching screenshot or prototype pass is insufficient. No watch/per-edit full suites are planned.

Record latency, active owner effort, service calls, failed jobs, denied scope accesses and corrections. Prototype evaluations measure scripted workflows; do not report them as model accuracy. Model/token usage is not applicable until WorkBuddy 7D. Separate synthetic activity from actual business revenue. Logs require correlation IDs and redaction; traces capture approved facts and service outcomes rather than private model reasoning.

## 13. Primary documentation and unresolved assumptions

Reviewed 7 October 2026. Platform capabilities below do not establish entitlement or unchanged import compatibility:

- [WorkBuddy web apps](https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/App-Publishing/Web-App): publishing and app service options.
- [Tencent WorkBuddy/CloudBase integration](https://cloudbase.cloud.tencent.com/blog/2026/09/18/workbuddy-cloudbase-case): backend platform relationship.
- [CloudBase PostgreSQL](https://docs.cloudbase.net/database/postgresql/initialization) and [connection methods](https://docs.cloudbase.net/database/postgresql/connecting-to-postgresql): database target and access choices.
- [CloudBase tool calling](https://docs.cloudbase.net/en/ai/model/tool-calling): managed AI integration; exact model/SDK checked in Phase 7.
- [CloudBase Express HTTP functions](https://docs.cloudbase.net/en/cloud-function/frameworks-examples/express): API adapter target; runtime compatibility checked before packaging.
- [WorkBuddy connectors](https://open.workbuddy.cn/en/docs/connector) and [Automation](https://www.workbuddy.ai/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Automation-Guide): owner integration paths.
- [React with Vite](https://react.dev/learn/build-a-react-app-from-scratch): prototype frontend building blocks. [MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk): future WorkBuddy integration only.

No connected WorkBuddy authoring/deployment tool is available in the current Codex session. This document plans the independent rebuild; it does not claim it was executed.

## 14. Expanded WorkBuddy services and contracts

Keep WorkBuddy as authoring/orchestration and CloudBase/Tencent as the deployment/managed-AI boundary. Optional statistical, retrieval and redaction packages sit behind narrow backend services; none receives customer identity/owner authority through model-supplied arguments. The customer tool registry and owner query registry are separate, request-local and bound to authenticated scope.

| Service | Contract and authority |
| --- | --- |
| Agent board | Owner-only projection over customers, persistent agent contexts, conversations, runs and cases. Exactly one box per `(business_id,customer_id)`; paginate all active/inactive contexts, including those with no messages. Lifecycle eligibility and processing state are separate. Derive human-review reasons/counts from unresolved authorised cases; no hidden reasoning or invented model activity |
| Owner query assistant | Read-only `get_sales_summary`, `get_invoice_status`, `get_stock_summary`, `get_agent_review_summary`, `get_forecast` tools, with required period/product filters and source IDs/cutoff. Defaults to clarify ambiguous dates. Proposals are separate drafts; decisions, publishing and payment verification require explicit owner UI actions |
| Stock/sales | Immutable finished-goods lot movements and scoped order-item allocations; preorder/ready-stock paths share order transactions. Separate physical lot availability from daily production quota. Sales views distinguish completed-order value, booked order value, verified cash, unpaid balance, waste and adjustments |
| Forecast | Asynchronous bounded job consumes per-business/product dated quantity aggregates, availability/stockout flags and known future orders; outputs horizon, cutoff, method/version, sample coverage, units, sales-price assumption, intervals where valid, backtest errors and freshness. Exclude pilot synthetic/cancelled/expired unpaid activity. Thin history returns `INSUFFICIENT_DATA` plus a transparent baseline only where defensible |
| Price proposal | Deterministic rules use stock age, expiry and forecast signals within owner-configured floor/ceiling/change limits. Immutable proposal binds product, active price/policy versions, reason, effective window and hash. Explicit owner review/publish creates a new authoritative price version; customer confirmation rechecks it. No trait-based individual prices |
| Recommendation/engagement | Current-request suggestions use published products/available service results. Historical targeting requires current personalisation consent. Owner-approved campaigns reference exact content/offer/batch versions; delivery job rechecks marketing and channel consent, frequency, quiet hours, takeover/global pause, expiry and available stock immediately before commit/send |
| Content/visual drafts | Managed text generation produces structured title/body/SEO metadata/language/fact references; image generation is an asynchronous Tencent server-side operation with per-job cost/time bounds and private asset storage. Draft revision hash binds facts, offer terms, asset and audience policy; edits invalidate approval. Publication/export/delivery use approved revisions, not raw model output |
| Risk review | Deterministic duplicate reference, request velocity, amount mismatch and inconsistent proof rules create redacted reason-coded signals/cases; optional scikit-learn anomaly score is advisory. Rule-based abuse throttling is bounded and auditable. No model payment verification, refund or customer ban; case clearance is explicit owner action |

Apply the existing bounded-call/deadline policy to owner/customer synchronous chat. Long forecasting or image work returns a job ID with queued/running/failed/available state; it cannot keep the ordinary 25-second chat request open. Workers use leases, idempotent action keys and separate service credentials. Model output is untrusted structured data validated against Zod; authoritative values render from service results. Forecast/risk explanations store safe facts, not hidden chain-of-thought.

### 14.1 Planned API families (not current routes)

All paths retain `/api/v1`; owner mutations require a real owner session/CSRF (or verified bearer equivalent), expected version/hash and idempotency key. Restricted MCP credentials cannot use decision/publish/verify endpoints.

| Endpoint / family | Actor | Required behaviour |
| --- | --- | --- |
| `GET /owner/agents`, `GET /owner/agents/:id` | Owner | Lifecycle/processing/review filters, stable pagination, interaction/case links within business scope |
| `POST /owner/queries` | Owner | Persist scoped owner query and return sourced answer/clarification; separate owner conversation model, never attach to a customer transcript |
| `/owner/stock/lots`, `/owner/stock/movements`, `/owner/stock/adjustments` | Owner | Record production/receipt/waste/expiry/corrections with reason/version; reject negative availability and duplicate movements |
| `GET /owner/sales`, `GET /owner/invoices` | Owner | Reconciled period/product/status views derived from existing orders/payments/documents; no second invoice or payment ledger |
| `POST /owner/forecasts`, `GET /owner/forecasts/:id` | Owner; bounded worker | Enqueue/read forecast result; compare freshness, backtest and usable-stock assumptions |
| `/owner/pricing/proposals`, `POST /owner/pricing/proposals/:id/decision`, `POST /owner/pricing/proposals/:id/publish` | Owner | Propose then explicitly decide/publish exact immutable price revision; stale proposal rejected |
| `/owner/campaigns`, `/owner/campaigns/:id/preview`, `/owner/campaigns/:id/decision`, `/owner/campaigns/:id/schedule` | Owner | Preview eligible audience/counts with reasons, approve revision, schedule guarded delivery; no arbitrary recipient IDs from customer prompts |
| `/owner/content/drafts`, `/owner/content/drafts/:id/decision`, `/owner/content/drafts/:id/export` | Owner | Generate/edit/review exact multilingual draft; export only approved revision; social/email delivery uses verified connectors and guarded campaigns |
| `/owner/assets/generate`, `GET /owner/assets/:id` | Owner | Bounded visual job, private asset review/rights/provenance and safe scoped download |
| `/owner/risk/cases`, `/owner/risk/cases/:id/decision` | Owner | Evidence, expiry, appeal/clearance and immutable decision audit; no payment-state side effect |
| `/me/recommendations`, `/me/support-cases`, `/me/notification-preferences` | Customer | Own suggestions/service cases/purpose-channel opt-outs only; general catalogue path remains usable |

Additional errors: `INSUFFICIENT_DATA`, `FORECAST_STALE`, `STOCK_UNAVAILABLE`, `PRICE_PROPOSAL_STALE`, `CONTENT_APPROVAL_REQUIRED`, `CONSENT_REQUIRED`, `CAMPAIGN_SUPPRESSED`, `RISK_REVIEW_REQUIRED`, `CAPABILITY_UNAVAILABLE`. Distinguish suppression from delivery failure and never claim an unacknowledged external message was delivered.

### 14.2 Deterministic stock, price and delivery boundaries

- Ready-stock confirmation locks the same business/date boundary and lot rows in stable expiry/id order; validate sellable/unexpired lots, reserve enough units, and commit order/capacity (where applicable)/allocation/jobs together. Preorders reserve production quota; their later recorded production/fulfilment creates and consumes stock through explicit services. Completion consumes the matching lot allocation exactly once. Expiry/cancellation releases holds once; later lot expiry does not erase recorded sales. Existing date capacity cannot be used as proof of physical inventory.
- Forecast planning separately reports known commitments and estimated incremental demand. Subtract unexpired usable stock, apply shelf life/batch size and remaining quota, and show unmet demand. No auto procurement or stock adjustment. Price suggestions have integer-sen bounds; publication synchronises the authoritative price version used by quoting and invalidates old unconfirmed proposals. Published prices and applicable offers snapshot into confirmed orders/invoices.
- Campaign approval binds content/assets/offer, audience rule, purpose/channel, expiry and maximum sends. Resolve live recipients under business scope, then perform all consent/pause/cap checks at delivery. Use a shared per-customer cross-channel promotional counter/lock; default one promotional contact in seven days. Count uncertain external delivery attempts conservatively until reconciled, and never blind-resend them. Opt-out suppresses pending sends and deletes optional derived targeting data.
- Safe support updates are distinct from marketing. An after-sales survey/check-in requires service-follow-up permission; adding a cross-sell makes it a marketing campaign. Recommendation outputs filter actual service availability and include a simple reason, eligible terms and neutral alternatives. Risk models consume minimised operational aggregates; no sensitive traits, behavioural tracking across platforms or raw payment secrets.

## 15. GitHub / Hugging Face candidate register

Primary repositories/model cards reviewed **7 October 2026**. These are candidates and source references, not installed integrations or proof of the team's WorkBuddy entitlement. The architecture keeps third-party utilities behind Tencent-hosted backend services, so they do not replace WorkBuddy orchestration, CloudBase identity/data or owner approval. Runtime support, transitive licences, region, costs and actual account behaviour must be verified in 7A/7D. A permissive software licence does not cover a managed service's terms or prove competition eligibility.

| Candidate and primary source | Features / licence shown by source | WorkBuddy fit and selection limit |
| --- | --- | --- |
| [Tencent CloudBase AI Toolkit](https://github.com/TencentCloudBase/CloudBase-AI-Toolkit) | WorkBuddy/cloud build integration; MIT | Prefer official supported WorkBuddy CloudBase setup. Authoring/deployment tooling only; its admin MCP is never the public customer runtime. Do not install a second overlapping connector if WorkBuddy already provides it |
| [Official MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) | Typed owner integration; current README states Apache-2.0 for new contributions, existing code MIT | Existing planned 7D choice; select/pin the connector-supported major and inspect its exact licence. Narrow business-fixed tools only; no generic shell/SQL, approvals, payment verification, price/content publication or unrestricted sends |
| [Nixtla StatsForecast](https://github.com/Nixtla/statsforecast) | Statistical sales/demand forecasts and intervals; Apache-2.0 | Optional CPU Python batch service on verified Tencent infrastructure; begin with simple baseline. Use open-source package, not Nixtla's separate paid TimeGPT API. No browser Python or per-customer model worker |
| [scikit-learn](https://github.com/scikit-learn/scikit-learn), [IsolationForest documentation](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html) | Content similarity/ranking and optional anomaly scores; BSD-3-Clause | Optional scoped CPU service once representative data exists. IsolationForest detects unusual observations, not proven fraud; business rules/owner review stay authoritative. Dynamic pricing remains deterministic, without a separate optimisation agent |
| [FlagEmbedding](https://github.com/FlagOpen/FlagEmbedding), [BAAI/bge-m3](https://huggingface.co/BAAI/bge-m3) | Multilingual embeddings/retrieval; library and model card MIT | Optional retrieval upgrade for published bakery knowledge; BGE-M3 is an embedding model, not a chat replacement. Host privately on supported Tencent compute only after runtime/memory checks. BM/mixed-language quality needs local evaluation; shared indexes must enforce business scope before ranking |
| [Presidio](https://github.com/data-privacy-stack/presidio) (original Microsoft repository redirects here) | PII detection/redaction; MIT | Optional server-side minimisation before model/log/export use. Custom BM/Malaysian patterns need evaluation; redaction cannot replace scope/consent or guarantee privacy. Current canonical repo is used to avoid the stale ownership link |
| [pdf-lib](https://github.com/Hopding/pdf-lib) | Invoice/receipt PDFs; MIT | Reuse the already selected library behind document services; no new ERP or competing ledger. Embed licensed fonts for required languages and validate layout; totals come from snapshots/verified payments |
| [HunyuanImage-3.0 GitHub](https://github.com/Tencent-Hunyuan/HunyuanImage-3.0), [official HF weights](https://huggingface.co/tencent/HunyuanImage-3.0), [licence](https://github.com/Tencent-Hunyuan/HunyuanImage-3.0/blob/main/LICENSE) | Marketing visuals; custom Tencent Hunyuan Community Licence, not MIT/Apache | Reference/evaluation candidate only. Base repo recommends at least 3 x 80 GB VRAM; it is unsuitable as a default bakery/local prototype dependency. Custom territory/use/redistribution terms require review for the intended release. Prefer the documented managed CloudBase image path below; open weights do not prove identical hosted models or entitlement |

**Preferred text/visual runtime:** Use the currently supported official `@cloudbase/node-sdk` in WorkBuddy's server environment. Tencent documents managed text and Hunyuan image calls, with image generation server-only; the image guide currently lists SDK >=3.18.3 and account/credit prerequisites. Select actual supported model IDs from the account catalogue, not a guessed Hugging Face name. [Node AI integration](https://docs.cloudbase.net/en/ai/model/nodejs-access), [Hunyuan image Node SDK](https://docs.cloudbase.net/en/ai/image-model/node-sdk). These are documented capabilities; this account's access, region and charges remain unverified. Use asynchronous asset jobs and store accepted outputs privately instead of treating temporary provider URLs as permanent documents.

**Excluded default choices:** The [CloudBase JS SDK GitHub mirror](https://github.com/TencentCloudBase/cloudbase-js-sdk) and [Node SDK mirror](https://github.com/TencentCloudBase/node-sdk) are marked archived; obtain supported distributions through current Tencent documentation rather than building from those mirrors. No LangChain/CrewAI/AutoGen replacement orchestrator, unrestricted community MCP server, external HF inference endpoint, paid model API or alternate-cloud backend is selected. No pretrained financial fraud dataset/model is assumed applicable to bakery payments. Optional Python/GPU services remain disabled until verified Tencent packaging is available; supported TypeScript baselines and honest unavailable states remain part of acceptance.

For each adopted package/model, WorkBuddy records exact version/commit or model revision, licence/notice, source provenance, package integrity, permitted data, resource budget and capability evidence in its dependency register. Avoid unreviewed remote model code; approve/pin necessary loaders separately. Test adapters at the relevant subphase end gate; document imports as third-party dependencies rather than claiming WorkBuddy authored them. Repositories are never copied wholesale as the final app.

### Implemented local Phase 2 boundary

Synthetic account/session routes are `/api/v1/demo/accounts` and `/api/v1/demo/sessions` (POST/DELETE). Authenticated `/me` supports GET/PATCH; `/me/consents` supports POST; `/me/preferences` supports GET/PATCH and DELETE by key. Catalogue, published knowledge, pickup options, date capacity and order history are read APIs; owner customer reads require owner authority. Requests use persisted HttpOnly SameSite=Strict cookies; mutations require an exact allowed Origin and per-session CSRF token. No client-supplied business/customer ID or role determines scope. Session expiry uses real time. Phase 4 now provides the sign-in and role-gated screens.

The local API connects as cb_runtime, the future local worker as cb_worker, and migration/seed scripts use separate bootstrap/admin credentials. SQL scope is transaction-local and connection-pinned. Security-definer bootstrap functions expose only known synthetic account selection and session resolution; raw token/session tables have no application grants. Phase 2 tests use an isolated disposable local database; no cloud or live AI calls occur.

### Phase 3 local service implementation

Commerce services now implement quote/edit/challenge/confirmation, owner payment/review/status/cancellation, scoped conversations/messages, owner takeover/resume, dashboard and versioned publication/capacity APIs. Structured messages persist with `dispatch=deferred_phase5`; no scripted or model reply is fabricated. The prototype serializes commerce mutations per business before taking date locks. This is a deliberate local throughput simplification, not a replacement for transaction-level database locks. Customer confirmation, owner payment/decision and capacity arithmetic remain deterministic and server-scoped.

Additional routes are `/quotes/:id/edit`, `/exceptions`, `/owner/orders/:id/resume`, `/owner/holds/expire`, `/owner/knowledge/publish` and `/owner/conversations/:id/takeover`. Capacity changes carry an expected bucket version (zero for a new date); publication includes expected knowledge version, a complete existing-product catalogue and validated policy. The API does not yet offer arbitrary new product creation. New cloud tools and document delivery remain deferred.

### Phase 4 UI boundary

React Router pages use trusted `/me` scope through a session provider, TanStack Query keys scoped by role/customer, same-origin typed API helpers, CSRF and retry-safe idempotency. Private query data is removed on account switch/sign-out. Hook Form/Zod and useWatch back explicit ordering; the server prices/validates all commercial writes. `GET /business-time` reads the authenticated clock; customer-only `GET /me/reviews` exposes scoped review states and approved quote IDs. Owner approval/dashboard reads exclude stale policy/order-version proposals from actionable counts; capacity reads include product identity/version.

Messages are serialized and assigned at least 1ms greater than the preceding conversation message when the demo clock is paused. Conversation choice persists in scoped sessionStorage. No schema migration was added in Phase 4. Customer-core BM/EN and responsive/keyboard states are implemented; 200% zoom is pending by user request. See Phase 4 evidence for measured viewport limits and six focused API cases. Phase 5 still owns actual scripted response dispatch, private files, leased workers and clock controls.

## Phase 5 implementation checkpoint â€” 7 October 2026

Phase 5 is complete after its focused gate and affected repairs. The prototype now runs persisted, customer-scoped scripted responses with BM/English templates, private snapshot PDFs, bounded local jobs, in-app deposit reminders, saved owner digests and owner clock/pause/reset controls. This supersedes earlier Phase 4 notes that deferred these mechanics. Phase 4's 200% zoom remains pending by user choice. Phase 6 acceptance/reference packaging and all Phase 7 WorkBuddy/FR-18â€“FR-27 expansion work remain unimplemented. Evidence: [Phase 5 review](../prototype-evidence/phase5-review.md); [supported inputs](../scripted-demo/SCRIPTED_INPUTS.md).

Prototype routes: POST /conversations/:id/respond takes a saved messageId and replays the same completed input; GET /me/notifications; GET /documents/:id/download validates scope, availability and SHA-256 before returning an attachment; owner GET /owner/demo/jobs and POST /owner/demo/jobs/run, /owner/demo/digest, /owner/demo/clock, /owner/demo/pause, /owner/demo/reset. All paths are under /api/v1. Mutations require session/Origin/CSRF. Clock mutations additionally require Idempotency-Key; request-hash mismatch returns409.

The worker uses its separate restricted local credential, processes at most50 outbox intents and10 jobs per batch, and has30-second real-time leases, three attempts and one-minute business-time retry. Quiet-window deferral does not consume an attempt. The legacy quietHoursStart/End policy fields mean permitted delivery hours, default09:00â€“20:00MYT. Delivery rechecks current consent, hold/payment/order state, review, takeover, exception and global pause. Other internal outbox status events are acknowledged without claiming external notification delivery. The scheduler runs every15 seconds while the API is up.

Reset requires owner authority, exact RESET SYNTHETIC DEMO text, the local admin credential and named loopback synthetic database with no extra business. Data reseeding is transactional; sessions invalidate. Private files archive locally after reset rather than being purged. File archiving is not atomic with the database transaction: an archive failure must be investigated before retrying. Standard Helvetica PDFs sanitise unsupported characters; the fresh rebuild should use a suitable licensed Unicode font. No model API, MCP package, external send or cloud provisioning is included.

## Phase 6 completed local-reference milestone

Phase6 is Complete: usable scripted local prototype,111 integration/acceptance checks, quality/build, actual restart and screenshot/PDF inspection passed after affected repairs. Portable behaviour/design/schema/fixture/contracts/scenarios/evidence pack is handoff/workbuddy-reference, with no app source/migrations/builds/secrets. Health reports phase6; saved messages await scripted dispatch; expired quotes require a fresh quote. No commercial authority/schema change in this phase. Phase4 actual200%zoom remains pending by user choice; exact360px is tool-clamped400. Manual savings baseline is unmeasured. Tencent WorkBuddy independently generates/tests/deploys its new project in7A–7E; all FR18–27/cloud/managedAI expansion work remains Not started. Earlier checkpoints are historical records superseded by this current milestone.

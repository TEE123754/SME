# CustomerBuddy - Technical Requirements Document

Version 0.4 | 7 October 2026 | Phase 4 connected UI built; automated/flow checks pass, 200% zoom pending; usable prototype/WorkBuddy rebuild not complete; no deployment.

Related: [PRD](<C:/Users/Edison Tee/Downloads/SME/PRD.md>), [Backend Schema](<C:/Users/Edison Tee/Downloads/SME/BACKEND_SCHEMA.md>), [Implementation Plan](<C:/Users/Edison Tee/Downloads/SME/IMPLEMENTATION_PLAN.md>).

## 1. Delivery decision

Codex builds a local reference prototype and prepares a portable behaviour/design/data reference pack in Phases 1-6. Tencent WorkBuddy independently rebuilds the complete application in a new workspace in Phase 7, including frontend, backend, migrations, agent tools, tests, deployment and documentation. The PRD records the competition-rule distinction.

**Current build boundary:** The Codex prototype is a usable local application. Hardcode assistant intent rules and language templates; persist actual customer/order/payment/approval/job/document records and call real domain services. Use a local scheduler and owner demo controls in place of WorkBuddy Automation. Do not implement a live LLM, CloudBase AI adapter, MCP server/connector or Tencent deployment in Phases 1-6. No WorkBuddy account, AI credits or model/cloud keys are required for the prototype. Phase 6 completion is independent of the later rebuild.

The final target is WorkBuddy's CloudBase-backed application services. The reference app remains a separate local artifact. WorkBuddy consumes the specifications/screenshots/fixtures as inputs and authors the final implementation; it does not merely import or publish the Codex app. Account access, runtime support and resource charges remain verification gates.

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

The Codex workspace now contains the foundation, SQL data model, synthetic sessions and scoped read/profile/consent APIs. Commerce writes now exist; UI flows, assistant dispatch and jobs remain Phases 4–5. WorkBuddy creates equivalent modules independently in its fresh project.

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
| `GET /documents/:id/download` | Scoped customer/owner | Authorise then issue short-lived private download |
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

Return `assistant_mode=scripted`, matched intent, script version, fact/service references and outcome in safe trace metadata. Keep model/token usage null because no model is called. The permanent customer label is "Demo assistant — scripted responses". Seed data and scripted wording are synthetic; database mutations and documents must actually work.

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

Use read-only owner summaries and bounded operations. Keep owner approval, payment verification, arbitrary SQL, arbitrary shell/file execution, and connector-management tools out of this package. Never forward raw customer instructions as trusted WorkBuddy owner-task instructions.

## 10. Jobs, documents, and scheduling

Persist jobs with type, entity, state, attempts, due time, lease, unique action key, and last error. Workers claim bounded batches using locked rows and short leases. No unbounded loop lives inside a cloud HTTP request.

Use a transactional outbox for customer notifications and document requests. Commit business state first; the worker generates the document or publishes the message. Prefer in-app reminders for P0 so delivery can be a single idempotent database write; external-channel delivery remains P1.

WorkBuddy Automation triggers processing and daily digest generation in Phase 7. Exact trigger frequency and background availability are account-specific. If hourly scheduling is used, report actual scheduling delay. The 30-second routine-reply target applies to synchronous customer chat, not delayed scheduled work.

**Codex scheduling:** A local worker claims bounded due batches; owner-only Run due jobs and Generate digest invoke the same guarded services. Show the last run, due/failed/suppressed jobs and current demo time. Default demo clock starts at 7 October 2026, 10:00 Malaysia time, paused for a reproducible walkthrough; owner can resume real-time progression or advance it explicitly. Persist its base time/mode so restarts do not reset deadlines. Use this clock consistently in quotes, approvals, reservations and job due times. Local worker downtime leaves jobs queued; lazy expiry remains enforced by booking/payment services. Lease expiry/recovery uses real UTC/database time, separate from the controllable business clock, to avoid stranded claims when demo time is paused or advanced.

Reset demo requires an authenticated owner and explicit confirmation, and is enabled only against a validated local synthetic environment. Stop/quiesce the worker, reset only demo-scoped records and local generated files, restore seeds/clock, then resume. Never infer a reset target from a customer message or accept an external database target.

Store generated quote/invoice/receipt files privately. Download links are scoped and short-lived. Use database summaries as the source; do not render model-generated totals. File generation jobs have unique document identity and content hashes.

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

### Implemented local Phase 2 boundary

Synthetic account/session routes are `/api/v1/demo/accounts` and `/api/v1/demo/sessions` (POST/DELETE). Authenticated `/me` supports GET/PATCH; `/me/consents` supports POST; `/me/preferences` supports GET/PATCH and DELETE by key. Catalogue, published knowledge, pickup options, date capacity and order history are read APIs; owner customer reads require owner authority. Requests use persisted HttpOnly SameSite=Strict cookies; mutations require an exact allowed Origin and per-session CSRF token. No client-supplied business/customer ID or role determines scope. Session expiry uses real time. Phase 4 now provides the sign-in and role-gated screens.

The local API connects as cb_runtime, the future local worker as cb_worker, and migration/seed scripts use separate bootstrap/admin credentials. SQL scope is transaction-local and connection-pinned. Security-definer bootstrap functions expose only known synthetic account selection and session resolution; raw token/session tables have no application grants. Phase 2 tests use an isolated disposable local database; no cloud or live AI calls occur.

### Phase 3 local service implementation

Commerce services now implement quote/edit/challenge/confirmation, owner payment/review/status/cancellation, scoped conversations/messages, owner takeover/resume, dashboard and versioned publication/capacity APIs. Structured messages persist with `dispatch=deferred_phase5`; no scripted or model reply is fabricated. The prototype serializes commerce mutations per business before taking date locks. This is a deliberate local throughput simplification, not a replacement for transaction-level database locks. Customer confirmation, owner payment/decision and capacity arithmetic remain deterministic and server-scoped.

Additional routes are `/quotes/:id/edit`, `/exceptions`, `/owner/orders/:id/resume`, `/owner/holds/expire`, `/owner/knowledge/publish` and `/owner/conversations/:id/takeover`. Capacity changes carry an expected bucket version (zero for a new date); publication includes expected knowledge version, a complete existing-product catalogue and validated policy. The API does not yet offer arbitrary new product creation. New cloud tools and document delivery remain deferred.

### Phase 4 UI boundary

React Router pages use trusted `/me` scope through a session provider, TanStack Query keys scoped by role/customer, same-origin typed API helpers, CSRF and retry-safe idempotency. Private query data is removed on account switch/sign-out. Hook Form/Zod and useWatch back explicit ordering; the server prices/validates all commercial writes. `GET /business-time` reads the authenticated clock; customer-only `GET /me/reviews` exposes scoped review states and approved quote IDs. Owner approval/dashboard reads exclude stale policy/order-version proposals from actionable counts; capacity reads include product identity/version.

Messages are serialized and assigned at least 1ms greater than the preceding conversation message when the demo clock is paused. Conversation choice persists in scoped sessionStorage. No schema migration was added in Phase 4. Customer-core BM/EN and responsive/keyboard states are implemented; 200% zoom is pending by user request. See Phase 4 evidence for measured viewport limits and six focused API cases. Phase 5 still owns actual scripted response dispatch, private files, leased workers and clock controls.

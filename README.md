# CustomerLane

**1 Customer, 1 Agent. Personal service with business control.**

CustomerLane is a customer relationship and order management platform built around **one persistent agent context for every customer**. Conversations, consented preferences, order history and follow-up tasks stay connected to that customer, helping a small business provide consistent personal service as it grows.

The product vision combines dedicated customer assistance with an owner workspace for agent oversight, sales, invoices, stock and customer engagement. Connected customer and order workflows are available locally today; AI assistance and the expanded capabilities are planned in the roadmap below.

The first vertical is Malaysian home bakeries, where personal service, repeat orders, pickup schedules and limited production capacity all matter.

## 1 Customer, 1 Agent

A customer should not have to start from zero with every message. Their agent carries the relevant context from the first enquiry through repeat orders and after-sales support, while the owner retains control over business decisions.

- **One customer relationship:** Multiple conversations share the same customer identity and relevant history.
- **Personal service:** Consented preferences support useful recommendations and repeat-order proposals.
- **Private context:** Each customer's records remain scoped to that customer and the business.
- **Owner oversight:** The planned agent dashboard shows **one box = one agent = one customer**, including active and inactive contexts and clear human-review reasons.
- **Human support:** Customers can ask for the owner; takeover pauses conflicting automation until the owner resumes it.

An agent represents a persistent customer context. Shared infrastructure can serve many contexts; each customer does not need a separate AI account or a continuously running process. Optional personalisation never replaces customer confirmation or owner authority.

## Why CustomerLane

For a small business, an order often starts as a conversation. Prices, pickup details and preferences become scattered across messages, while deposits and production commitments require separate tracking.

CustomerLane connects these steps through the customer's history and authoritative business records. Customers review an exact quote before committing. Owners see what needs attention, manage capacity and retain authority over exceptions and payment verification. The expanded roadmap extends that relationship into stock planning, recommendations, promotions and after-sales service.

| Business need | CustomerLane approach |
| --- | --- |
| Clear customer records | Profiles, order history and consent-controlled preferences |
| Accurate pricing | Quotes calculated from the current catalogue and business policy |
| Reliable bookings | Explicit confirmation, timed capacity holds and availability checks |
| Payment visibility | Owner-reviewed payment records and outstanding-balance checks |
| Controlled exceptions | A review queue for discounts, custom requests, cancellations and complaints |
| Continuity of service | Saved conversations with owner takeover, reply and resume controls |
| Operational clarity | A dashboard calculated from stored orders, payments and review cases |

## Who it serves

- **Home bakery owners** coordinating orders around limited daily production capacity.
- **Small business teams** bringing customer service and order administration together.
- **Student entrepreneurs** managing enquiries alongside study and fulfilment.
- **Customers** who want transparent prices, clear pickup details and access to their order history.

## Product capabilities

The following customer, owner and business controls are connected to the current local application. The expanded agent and AI features are listed separately in the roadmap.

### Customer workspace

Customers browse the catalogue, check pickup options, select an item and quantity, and request a quote. Each quote shows the calculated total and required deposit. Customers review and explicitly confirm the proposal before an order is recorded and capacity is held.

The workspace provides saved conversations, order details, reviewed offers, profile settings and preference management. Core customer actions support English and Bahasa Melayu, with separate consent controls for preferences, reminders and marketing.

### Owner workspace

Owners review orders and payment records, inspect outstanding work, maintain catalogue and policy information, and set daily production capacity. Exceptions enter an approval queue before any off-policy commitment.

Owners can take over customer conversations, reply directly and resume the workflow. Cancellation and completion actions enforce business rules, including capacity release and full-balance requirements.

### Business controls

- Monetary calculations use integer sen for consistent totals and deposits.
- Quotes expire, and confirmations bind to the exact proposal the customer reviewed.
- Idempotency controls protect against duplicate business actions when requests are retried.
- Customer records are scoped to the authenticated customer and business.
- Owner permissions are enforced by the API and database access boundaries.
- Preference withdrawal removes optional preferences while retaining transaction records.
- Dashboard figures are calculated from persisted records.

## An order from start to finish

1. The owner publishes products, prices, pickup rules and capacity.
2. The customer selects an item, quantity, pickup date and time slot.
3. CustomerLane calculates a quote using the current business rules.
4. The customer reviews and confirms the exact quote.
5. The system records the order and places a time-limited capacity hold.
6. The owner verifies the payment record; a sufficient deposit commits a valid hold.
7. The owner manages fulfilment and completes the order once the required balance is settled.

Requests outside standard policy move to owner review. Approved price changes require customer acceptance of a revised quote.

## Product preview

![CustomerLane customer and order workspace](docs/evidence/phase4-desktop.png)

The current interface retains the earlier CustomerBuddy working name. CustomerLane is the product name adopted for this repository; internal package names and application branding have not yet been migrated.

## Current release

The current release includes connected customer and owner interfaces, persistent customer records, consent settings, conversations, quotes, order confirmation, capacity management, owner reviews, payment-record verification and operational reporting.

The repository currently runs locally with fixture accounts and synthetic payment records. Account selection is intended for local evaluation; production authentication, live payment processing and external message delivery are not included. Services currently restrict access to local addresses.

## Expanded product roadmap

These features are specified and planned; they are not available in the current local release. Existing customer records, order services, approvals and payment controls provide their foundation.

| Planned capability | What it adds |
| --- | --- |
| **Customer-agent dashboard** | One card per customer-agent context, with active/inactive filters, interaction history, current task and human-review reasons; owner takeover and resume |
| **Customer and owner AI chat** | BM/English and mixed-language queries, clarification of complex requests and answers grounded in current records; separate customer-scoped and owner-authorised tools |
| **Sales, invoices and stock** | Downloadable invoices/receipts, reconciled sales and cash views, finished-goods batches, expiry, stock allocation, waste and audited adjustments |
| **Stock prediction and sales forecasting** | Product demand and sales outlooks with history coverage, uncertainty and proposed production quantities to help reduce excess stock and waste |
| **Controlled dynamic pricing** | Stock, expiry and demand-based price suggestions within business limits; owner review and publication, with confirmed order prices preserved |
| **Customer engagement** | Recorded fresh-batch announcements, personalised recommendations and promotions, and permission-based after-sales check-ins with human support |
| **Multilingual content creation** | Reviewed SEO product descriptions, marketing copy, personalised emails, social posts and PR drafts in BM/English; additional languages subject to review |
| **Visual generative AI** | Marketing illustration drafts with generation provenance, rights review and owner approval; clear distinction from genuine product photography |
| **Fraud and transaction-risk review** | Explainable suspicious-transaction signals and private owner cases; payment verification and financial decisions remain under owner control |
| **Responsible AI controls** | Sparse-data bias checks, purpose/channel consent, privacy boundaries, easy opt-out, promotional frequency limits and transparent AI/forecast labels |
| **Reliable follow-ups and deployment** | Guarded reminders, daily digests, durable background jobs, production identity and hosted services; additional channels after integration verification |

Physical stock is tracked separately from production capacity. Forecasts support planning and show insufficient-data or stale-result states. Published pricing rules and recommendations use current business facts; customers still confirm an exact quote before an order is placed.

Marketing requires current consent and respects quiet hours, frequency limits, takeover and opt-out. Content and imagery require approval of the exact revision before publication or delivery. External email/social delivery is enabled only after a supported restricted integration is verified; exporting a draft is not a delivery result.

Risk signals support investigation and can be cleared by the owner. They do not prove fraud, verify a payment or authorise a refund. Recommendations and pricing exclude sensitive-trait targeting, covert cross-platform tracking and manipulative shopping prompts.

### A returning customer's planned agent journey

1. The customer returns to their existing agent and requests a repeat order.
2. The agent uses permitted history, asks for missing details and checks current prices and availability.
3. The customer reviews and confirms a new quote; business services record the order.
4. The owner sees the interaction in that customer's agent card and reviews any exception.
5. Eligible reminders and after-sales support continue within the customer's permissions.
6. Future recommendations or promotions remain optional and never authorise another purchase.

The [product requirements](PRD.md) define acceptance for these features. The [technical requirements](TRD.md#15-github--hugging-face-candidate-register) include researched GitHub/Hugging Face candidates, licences and integration limits; runtime compatibility and account access still require verification before adoption.

## Run locally

### Requirements

- Windows x64 for the included PostgreSQL setup scripts.
- Node.js `24.14.0` or later within the Node 24 release line.
- pnpm `11.2.2` and Git.
- Approximately 1 GB of free workspace storage for dependencies and PostgreSQL runtime files.
- Internet access for initial dependency installation and database runtime download.

### Installation

```powershell
git clone https://github.com/TEE123754/SME.git
cd SME
pnpm install --frozen-lockfile
pnpm db:setup
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [the customer and owner workspace](http://127.0.0.1:5173) and choose an available account on the sign-in page. The API health endpoint is [available here](http://127.0.0.1:3001/api/v1/health).

`db:setup` downloads the PostgreSQL runtime, initializes the database and generates an ignored `.env` file with local credentials. `db:migrate` applies the schema and provisions restricted application roles. `db:seed` inserts fixture records without resetting existing user changes when repeated.

`pnpm dev` starts the database if necessary and launches the web and API services. Stopping the development command leaves PostgreSQL running; use `pnpm db:stop` to stop the database separately.

### Useful commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the local application |
| `pnpm db:status` | Inspect the database status |
| `pnpm db:start` / `pnpm db:stop` | Start or stop PostgreSQL |
| `pnpm db:migrate` | Apply database migrations |
| `pnpm db:seed` | Add initial fixture records |
| `pnpm typecheck` | Check TypeScript types |
| `pnpm lint` | Check source quality |
| `pnpm build` | Build application packages |
| `pnpm gate:phase4` | Run the current application-flow quality gate |

Follow the phase-end verification policy in [the implementation plan](IMPLEMENTATION_PLAN.md). Existing evidence is stored in [docs/evidence](docs/evidence); the accessibility review still has a pending 200% browser zoom check.

## Technology and architecture

CustomerLane uses a TypeScript monorepo with shared contracts and deterministic business services.

| Layer | Technology |
| --- | --- |
| Web application | React, Vite, React Router and Tailwind CSS |
| Forms and data fetching | React Hook Form, Zod and TanStack Query |
| API | Node.js and Express |
| Database | PostgreSQL, SQL migrations and row-level security |
| Workspace | pnpm with pinned dependency versions |

| Directory | Responsibility |
| --- | --- |
| `apps/web` | Customer and owner interfaces |
| `apps/api` | Sessions, validated APIs and business operations |
| `apps/worker` | Background-processing foundation |
| `packages` | Shared contracts, domain rules, database access and assistance foundations |
| `scripts` | Database setup, startup and verification |
| `docs` | Scenarios, review notes and evidence |

## Configuration and data handling

[.env.example](.env.example) documents the local configuration. Database credentials, runtime data and generated files remain outside version control. Keep credentials on the server; browser code must contain only public configuration.

The API uses HttpOnly session cookies, CSRF protection, allowed-origin checks and scoped database transactions. Runtime database roles are separated from migration credentials. Production identity, hosting and operational hardening remain future release work.

If you change ports, update `API_PORT`, `WEB_PORT` and `ALLOWED_ORIGINS` together. PostgreSQL defaults to `127.0.0.1:54329`, and the web development server proxies `/api` requests to the API.

## Project documentation

- [Product requirements](PRD.md)
- [Technical requirements](TRD.md)
- [Customer and owner flows](APP_FLOW.md)
- [Design brief](DESIGN_BRIEF.md)
- [Database schema](BACKEND_SCHEMA.md)
- [Implementation progress](IMPLEMENTATION_PLAN.md)
- [Application review scenarios](docs/PHASE4_SCENARIOS.md)

## Feedback and contributions

Use [GitHub Issues](https://github.com/TEE123754/SME/issues) to report a problem or propose an improvement. Include the affected workflow, steps to reproduce, expected behaviour and relevant screenshots or logs with private information removed.

Before changing the implementation, review the agreed specifications and active checkpoint. Keep business rules, permissions and customer data boundaries consistent, and record meaningful changes and verification evidence in the implementation plan.

No open-source licence has been declared in this repository.

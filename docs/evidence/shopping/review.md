# S1 review — Owner onboarding and customer shopping

Completed 8 October 2026, local Codex reference prototype.

## Result and evidence

- Landing introduces the new-owner workflow. Loopback-only synthetic bootstrap creates a separate business, owner and shopper; no existing business authority is granted.
- Owner setup reuses saved profile/catalogue, policies and date capacity. Readiness comes from actual published facts/items and eligible future availability. The customer storefront can be previewed publicly.
- Shopping has a distinct shell, public product/service catalogue, labelled SVG illustrations, price/detail pages, search/type filters, empty-state recovery and a scoped persisted SKU/quantity basket.
- Membership is explicit and optional. Default member discount is 5%, owner-configurable up to 15% and further bounded by Ethics. New quotes use server prices, whole-sen per-unit rounding and benefit snapshots. Leaving, programme edits or changed limits invalidate unconfirmed benefit quotes. Approved promotions replace member pricing without stacking. Existing orders retain saved prices.
- Newsletter is separate marketing consent. Delivery uses the existing approved local campaigns/inbox; no external email or real subscription service.
- Public store links select accounts from that business. Owner/customer destinations select the corresponding role by default. Guest basket transfer occurs into an empty shopper basket; customer baskets remain scoped.

## Verification

Initial TypeScript, ESLint and production build passed. Twenty focused shopping integration scenarios and 25 affected commerce regressions passed. The focused harness needed three repairs: JSON date representation on replay, synchronous owner-denial assertion, and single-order response shape. Only the failed integration check was rerun; prior quality evidence was preserved. Original phase3 evidence was restored, with this run saved as commerce.json.

Browser findings repaired: shared CSS product-card collision; profile-form initialization racing independent query refreshes; generic store sign-in/preview links; setup navigation ordering; filtered empty-state wording; published-policy checklist; generic capacity language; public page titles and customer sign-out. A transient undefined session reference in AppLayout during the preview-link edit was corrected. Final affected TypeScript/lint/build all passed. No API/business-service changes followed the 45 passing cases. Final fresh storefront reload had no new console errors.

Desktop (actual width1298) and mobile (requested400, actual444) reviewed: landing, product search/details, illustrated collection, membership/newsletter, bag/quote, owner setup resumption, saved facts and navigation. Store/detail/setup had no horizontal overflow. Keyboard Tab from product search reached All items with a visible solid outline. The temporary viewport was reset. Four core text/action colour pairs passed AA in contrast.json. Actual200% zoom remains deferred by prior user choice; exact360/400px were not exercised by this browser.

## Retained synthetic browser fixtures

- Demo Bloom Studio, florist: published Seasonal bouquet at RM120, flower illustration, English/BM business facts, default48h lead time/50% deposit and date capacity10 on10October. Its shopper explicitly joined the5% club and separately enabled local newsletter consent.
- Saved order DEMO-40AEB907 (40aeb907-0276-4ff2-ab2f-3a0fa76e0f98): RM114 total, RM57 required deposit, awaiting deposit, unpaid capacity hold. Bag cleared after confirmation. No payment was verified; documents remain queued until the worker runs.
- Aina bakery/Daniel: club joined while newsletter stayed off; one unconfirmed brownie quote at RM74.10/RM37.05 and one saved basket item. No bakery order/payment was created.
- Sign-out verified; final public Aina storefront is open. Migration007 applied additively; no database reset.

## Boundaries

Synthetic local identities/payments only. Catalogue assets are illustrations, not uploaded product photos. No real registration/auth/email, live AI, WorkBuddy integration or Tencent provisioning. Existing Vite chunk-size advisory remains non-failing (630.70KB). WorkBuddy rebuild and Phase6 historical ZIP remain unchanged.

Screenshots: landing.png, storefront.png, owner-setup.png, membership.png, checkout.png, store-mobile.png, detail-mobile.png, member-mobile.png, setup-mobile.png.

Legacy phase2/phase3/expansion fresh-migration count assertions now expect7; phase2 was not rerun. This literal-only harness maintenance does not change runtime behaviour. Historical passes remain historical; the current disposable-database gate proves migration replay and scoped membership boundaries.


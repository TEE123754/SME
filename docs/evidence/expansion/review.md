# Expanded local demo acceptance

E1 is complete within the scripted/synthetic scope explicitly requested by the user. The Instagram reference could not be fetched; the explicit Checkout, Members, Appointments/Orders and Sales list plus supplied agent-card screenshot informed the implementation.

- Automated end gate: 24 meaningful expansion scenarios, 25 commerce regressions and 16 document/job regressions passed (65 total). Compiler/lint/build passed. Initial failures and previous phase evidence are preserved.
- Final affected compiler/lint/build passed after API SQL repairs and UI polish. Integration evidence was retained rather than rerun for labels/catalogue defaults/card ordering.
- Browser owner screens render without application error banners. Owner Assistant reads saved figures. Review filter/transcript and active/inactive cards inspected.
- Created Demo Avery with synthetic sign-in, consent initially off and own saved scripted recommendation. Explicitly confirmed RM126 two-item quote into order DEMO-E967E5C5; RM63 deposit pending and persisted tracking visible.
- Edited/approved BM social template and marketing headline; actual 892-byte SVG downloaded and copied to content-export.svg. Browser download-event wait timed out, but filesystem inspection proved the real download exists.
- One local campaign message delivered to Avery after opt-in; ten other members excluded. Repeat delivery disabled at contact cap. Scoped inbox displays the saved message; no email/social message sent.
- Responsive agent cards inspected at requested400px override; browser clamped observed document width to428px, document scroll width also428px (no page overflow). Desktop1281px screenshot captured and override reset. This does not verify exact360px or actual200%browser zoom.
- Migration006 applied to retained local database, no reset. Synthetic fixtures added by browser checks remain available for demo. No real payment, external messaging, model or cloud integration performed.

Evidence: gate.json, integration.json, final-affected.json, browser.json; screenshots agents.png, agents-review.png, agents-mobile.png, agents-mobile-card.png, stock.png, calendar.png, checkout.png, tracking.png, content-approved.png, campaign.png, inbox.png; content-export.svg. Original phase reports are in historical/.

Remaining deferred checks: actual200%browser zoom by prior user choice; exact360px viewport; manual time-savings baseline. Product limits: scripted language, heuristic forecasting, template-based visuals/copy, local inbox/jobs, synthetic identity/payments, daily service capacity with shared windows; no production accounting, expiry-lot or staff scheduling. The build emits a non-blocking579.49kB client chunk warning.

Live AI, image models, external communication and Tencent/WorkBuddy deployment are independent future work. Existing Phase6 reference ZIP predates E1. No new commit, push or deployment claimed.

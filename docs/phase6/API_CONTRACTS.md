# Portable API and future tool boundaries

Paths under /api/v1. HttpOnly SameSite=Strict sessions supply trusted scope. Mutations require exact Origin/CSRF and operation-bound Idempotency-Key on commercial/clock operations. Path IDs grant no authority. Other-customer404 hides private records. Errors expose codes/correlationId, not credentials/raw SQL.

| Operation | Input / result | Boundary |
| --- | --- | --- |
| POST /demo/sessions | accountKey → cookie, csrfToken, expiry | Synthetic selector; replace with verified cloud identity |
| GET /catalogue /knowledge /capacity?date=YYYY-MM-DD | Published prices/facts and date production quota | Quota is not physical stock |
| POST /conversations | language → scoped conversation | Customer only |
| POST /conversations/:id/messages | content → saved ID/awaiting_scripted_response | Save before dispatch |
| POST /conversations/:id/respond | messageId → mode/intent/scriptVersion/reply/payload/error/suppressed | Original scoped input; replay deduplicated |
| POST /quotes | items[{sku,quantity}], pickupDate, pickupSlotCode → items/totalSen/depositSen/hash/expiry | Integer sen; no hold |
| POST /quotes/:id/confirmation-challenge | proposalHash → challengeToken | Scoped proposal-bound real-time expiry |
| POST /orders/confirm | quoteId, proposalHash, challengeToken → order/reservation | Explicit atomic confirmation; stale/forged denied |
| GET /orders/:id | Items/state/verified totals/documents | Customer own or owner |
| POST /exceptions | kind, applicable orderId/quoteId/conversationId, note → review | Not approval/refund |
| POST /owner/approvals/:id/decision | Exact displayed revision and decision/note → review/offer | Owner only; customer confirms new discount quote |
| POST /owner/payments/verify | orderId, amountSen, reference → verified synthetic payment/state | Owner only; unique reference |
| GET /documents/:id/download | Session → available PDF attachment | Scope/hash checked, no public URL |
| GET /me/notifications | Own saved in-app notices | Current balance from order |
| GET /owner/demo/jobs | Clock/jobs/digests | Owner only |
| POST /owner/demo/clock | mode pause/resume/advance, hours0–168, Idempotency-Key | Replay; changed payload409 |
| POST /owner/demo/jobs/run /digest /pause | Bounded run/snapshot/global pause | Owner only, no external sends |
| POST /owner/demo/reset | confirmation:RESET SYNTHETIC DEMO | Guarded local synthetic reset, sessions invalidated |

Future customer tools may read own facts/history and propose drafts/review. Confirmation binds commercial changes outside prompts. Separate owner read-only query tools cannot inherit payment/approval/publication authority. No generic SQL/shell/admin customer connector.

Fresh WorkBuddy requirements: verified CloudBase identity/RLS, private storage/scoped short-lived links/integrity, real request-local managed AI/usage/deadlines/failures, leased workers and supported Automation with measured scheduling/acknowledgement. Verify Tencent runtime/region/model/image credits/quotas/costs. Disable demo selector/clock/reset in production. No alternative provider selected.

Canonical fixture: Brownie7800sen/deposit3900. Quote holds0; confirm holds1; verified3900 commits1; receipt7800total/3900paid/3900balance. Duplicate actions produce one result. Expired quote denies confirmation; unpaid expired hold releases quota; late payment records owner review without auto-rebooking. Marketing defaults false. FR18–27 stock/forecast/content/risk/agent board remain unbuilt WorkBuddy targets.

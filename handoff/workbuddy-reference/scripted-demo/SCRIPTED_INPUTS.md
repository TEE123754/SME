# Scripted reference assistant

Mode: Demo assistant — scripted responses. Script version bakery-rules-v1. No model, AI credits, reasoning loop, WorkBuddy connector or MCP client.

Supported examples: menu / harga produk / products; pickup / deposit / waktu ambil; order status / pesanan saya; order again / pesan lagi; quote / pesan; remember favourite / ingat kegemaran; owner help / pemilik / bantuan. Unknown and authority-changing requests such as approve payment return supported actions without mutation. Matching is simple allowlisted keyword routing; ambiguous dates are never inferred. Longer combined intents may use the first matching rule and require explicit form controls.

Catalogue/FAQ/status/repeat reads use current scoped records. Prepare-quote replies guide the structured form and never reserve capacity. Repeat uses history only as a reference and requires a fresh exact date/slot and current quote. Preference proposals open explicit consent/save controls. Owner help creates a real review and pauses automated replies. Owner decisions and payment verification are unavailable to scripts.

Input messages and idempotent runs persist intent/version/outcomes/errors. Runs use request-local customer scope and null model usage. Same-input retries replay completed outcomes; paused conversation messages remain saved and can be responded to after owner resume. Failed service outcomes are recorded and guide form/owner alternatives. Per-conversation running uniqueness and stale30-second recovery bound concurrent scripts.

Jobs:15-second local scheduler, max50 outbox records and10 jobs per batch,30-second real-time lease, maximum3 attempts with1-minute business-time retry. Quiet-hour deferral preserves the retry budget. Existing policy fields quietHoursStart/End represent the permitted delivery window (default09:00–20:00 MYT). Only in-app deposit reminders are sent; every delivery rechecks consent, hold/payment/state, review, takeover, exception and global pause. Documents render saved snapshots/verified payments; customer scope is checked on each authenticated download. No public or durable bearer URL is issued.

Owner controls pause/resume/advance persisted business time, run due jobs and generate record-derived digests. Reset requires exact typed confirmation, localadmin credentials, named loopback synthetic DB and no extra businesses; seeded data/reset occurs transactionally, sessions invalidate, old files archive privately. WorkBuddy independently authors new agentic/cloud code in Phase7; this is reference behaviour only.

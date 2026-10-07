# Synthetic bakery walkthrough

All accounts/payments are synthetic; assistant scripted. Record actual owner effort with the rubric; no live-AI or revenue claims.

1. Sign in as Farah BM or Hana EN. Send menu, pickup, order status; compare current records. Unknown text returns supported actions. Profile language applies to new replies.
2. Choose Brownie1, valid date≥48h ahead of displayed clock, midday slot. Quote78/deposit39 holds nothing. Confirm exact quote: awaiting deposit, quota held1.
3. Optional discount: customer requests review; owner decides exact revision; customer explicitly confirms the newly approved quote. Review alone does not alter booked prices.
4. Owner verifies3900sen with unique SYNTHETIC reference. Order confirmed, quota committed. Run due jobs until invoice/summary/receipt available; customer downloads private receipt. Other customer cannot download it.
5. For another unpaid order, explicitly enable operational consent. Advance clock into quiet hours before hold expiry, run jobs, then to09:00MYT; one eligible notice delivers. Paid/expired/withdrawn/review/takeover/paused cases suppress. Run bounded batches as needed.
6. Generate digest; reconcile orders/payments/awaiting/jobs/notices. Digests are historical snapshots; generate anew after payment.
7. Owner help creates review/takeover. Messages save without script until explicit owner resume, then new menu reads current facts.
8. Ctrl+C, pnpm dev: session/messages/orders/files/clock/jobs persist. Do not reseed/reset. Scheduler resumes eligible queued work.
9. Too-soon pickup produces real rejection without reservation. Old approved quote or clock advanced beyond30min produces expiry: confirm unavailable/server denies, fresh quote required.

Reset is optional only after preserving wanted artifacts. Tests reset isolated databases, not retained main data. WorkBuddy generates new source/tests/deployment from references.

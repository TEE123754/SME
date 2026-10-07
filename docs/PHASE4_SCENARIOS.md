# Phase 4 browser gate

Run after the full UI build. Use the local synthetic bakery only. Record actual outcomes in evidence; this document is a test plan, not passing evidence. Quality/API batch: `pnpm gate:phase4`; then browser scenarios through the existing preview.

1. **P4-B01 Session and preferences:** Sign in as Hana, enable memory, save a favourite, reload and see it persisted. Withdraw memory and see the optional record removed while orders remain. Change to BM and back; inspect language layout.
2. **P4-B02 Customer confirmation:** Prepare brownie tray / quantity 1 / 10 October 2026 / midday. Verify RM78/RM39. Edit to cupcake and back, then explicitly confirm. See a saved order, held reservation/deadline, RM0 paid and no fabricated document link. Reload.
3. **P4-B03 Owner rejection:** Customer requests a discount or owner help. Switch to owner, inspect exact proposal and reject with a note. Customer sees rejected status. Owner review must not auto-order or charge.
4. **P4-B04 Payment verification:** Open the newly created order as owner. Verify a synthetic RM39 deposit. See confirmed status, paid RM39/balance RM39 and one payment record; reload. Check owner dashboard/Evidence totals match the order records.
5. **P4-B05 Human takeover:** Start a conversation, save a customer message, open it under owner Customers, take over, save an owner reply. Customer sees waiting-owner state and reply; owner explicitly resumes. A saved message does not claim a scripted reply.
6. **P4-B06 Approved offer:** Request a fresh discount quote, approve the exact offer as owner, view it as the same customer and confirm only via the quote card. Do not allow another customer to read the offer/order.
7. **P4-B07 Configuration:** Edit capacity, save through its expected version, and see changed availability. Preview/publish a knowledge version and see version/price updated; restore original demo values through the same UI if altered. Inspect synthetic automation/Evidence without fake run/file controls.
8. **P4-B08 Denial and errors:** Try a customer route as owner and owner route as customer. Use an invalid lead-time date and see a useful inline error without reserved state. Inspect empty views, labelled fields and retry-safe pending behavior.
9. **P4-B09 Responsive/accessibility:** Inspect customer/owner layouts at desktop and 360px mobile (record any runtime clamp). Inspect 200% zoom, visible keyboard focus, skip link, form labels, status announcements, menu open/close/Escape and BM text. Measure no horizontal overflow and core text contrast; capture screenshots.

Documents, actual assistant replies, job runs, clock changes and reset are Phase 5, so no Phase 4 browser pass is claimed for them.

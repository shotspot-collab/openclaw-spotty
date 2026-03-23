# ShotSpot Open Questions

Track unresolved cross-role questions here so they do not get lost in chat.

## Current open questions

## 1. Should gallery purchase confirmation move from return-time verification to webhook-authoritative finalization?
- Current canonical payment architecture is now reconciled: bookings use PaymentIntents; gallery/photo purchases currently use Stripe Checkout Sessions backed by stored PaymentIntent IDs.
- The remaining question is whether gallery purchase confirmation should stay return-time verification based or be hardened to webhook-authoritative finalization like booking payments.
- This matters for reliability, idempotency, and QA truth under network interruption or return-path failure.

## 2. How much legacy `.codex` should remain in repo workflow?
- Spotty workspace is now the primary project memory.
- Decide whether repo-local `.codex` should remain as archival evidence only or continue as a secondary task ledger.

## 3. What should be the minimal workspace architecture summary?
- Current repo docs are deep and implementation-oriented.
- Decide how much of that should be mirrored into Spotty workspace for fast coordination reads.

## Template

## <question>
- Owner:
- Why it matters:
- Needed decision:
- Blocking roles:
- Next step:

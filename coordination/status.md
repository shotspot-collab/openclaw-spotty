# ShotSpot Coordination Status

## Current operating model

- Spotty is the project coordinator for ShotSpot.
- Primary shared memory lives in `workspace-spotty`.
- The ShotSpot repo remains the source of truth for code and implementation-coupled technical docs.

## Active roles

- Coordinator
- UX
- Architect
- Developer
- QA
- Deploy

## Current priorities

1. complete migration of shared coordination memory into Spotty workspace
2. keep UX as the product-flow decision specialist
3. reconcile payment-flow truth where repo specs and recent implementation status appear inconsistent
4. continue critical-path execution with shared workspace docs as first read

## Current known status

- Existing execution architecture already uses Coordinator, Architect, Developer, QA, and Deploy subagents.
- UX is now a first-class specialist role in Spotty workspace.
- `.codex` is no longer the primary coordination memory.
- Recent validated work includes proof-of-arrival PIN flow, queue/gallery URL fixes, empty-gallery-after-send fix, and browser QA on the public app URL.
- Remaining known issue from recent status: authenticated create-session payload previously leaked a localhost booking URL; URL generation consistency remains an area to watch.
- Payment architecture has now been reconciled: bookings use Stripe PaymentIntents; gallery/photo purchases currently use Stripe Checkout Sessions backed by stored PaymentIntent IDs.
- Signed upload/download lifecycle remains blocked on storage contract/service wiring: missing signer abstraction, registration contract drift, and preview/download delivery rules still need explicit definition.
- Recent architect recommendation pointed to two follow-on lanes: booking/payment finalization and critical-path integration plus dev-gate hardening.

## Current public app URL

- `https://msi.taila8c3ab.ts.net/`

## Notes

Keep this file as the fast snapshot a fresh subagent should read first.
Pair it with:
- `coordination/current-focus.md` for immediate priorities
- `coordination/active-workstreams.md` for the migrated execution board

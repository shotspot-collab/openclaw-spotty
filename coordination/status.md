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
- Signed upload/download lifecycle has been completed:
  - Storage signer/service abstraction implemented (Slice C)
  - Photo registration contract reconciled to use storage keys (Slice D)
  - Real S3 adapters implemented using AWS SDK v3
  - 30-day retention worker with warning notifications implemented
  - Dashboard upload flow migrated to signed URLs
  - Old inline endpoint `POST /api/orders/:id/photos` removed (returns 404)
- Test suite status: 47 of 58 tests passing. 11 failing tests are due to test isolation issues (foreign key constraint violations in parallel test runs), not code bugs.
- Dev stack is running and healthy:
  - Database: PostgreSQL running in Docker
  - API: Responding on port 4000
  - Web: Responding on port 3000
  - Public URL: https://msi.taila8c3ab.ts.net/ returning 200

## Current public app URL

- `https://msi.taila8c3ab.ts.net/`

## Notes

Keep this file as the fast snapshot a fresh subagent should read first.
Pair it with:
- `coordination/current-focus.md` for immediate priorities
- `coordination/active-workstreams.md` for the migrated execution board

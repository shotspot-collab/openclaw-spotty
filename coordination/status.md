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

1. Re-test photographer login + Stripe connect on stable API startup path
2. Wire frontend OTP flow (customer join screens → real API)
3. Dev deploy gate hardening
4. Fix `mistral/codestral-latest` in OpenClaw allowlist
5. OTP rate limiting

## Current known status (as of 2026-03-31 08:29 PDT)

- **Dev stack:** web is up; API startup stability fix implemented
- **Public URL:** app available through Tailscale; auth/Stripe flow should now be re-tested against the stable API launch path
- **Recently completed workstreams:**
  - API stability — COMPLETE (graceful shutdown + launch docs)
  - Workstream 3 (Signed Upload/Download Lifecycle) — COMPLETE
  - Workstream 2 (Stripe Webhook Payment Finalization) — COMPLETE
  - Slot Hold Lifecycle fixes — COMPLETE
  - DB test isolation (15/15 tests passing) — COMPLETE
  - Phone OTP backend stub — COMPLETE (`bb5e146`)
  - Home page first-pass UX — COMPLETE (`0306fbc`)

- **Pending:**
  - Photographer login/session + Stripe connect must be re-verified end-to-end on the stable API launch path
  - Frontend OTP flow should be re-verified after API stabilization
  - Dev deploy gate hardening remains outstanding

- **Branch:** `wip/current-state-20260322`

## Notes

Keep this file as the fast snapshot a fresh subagent should read first.
Pair it with:
- `coordination/task-board.md` for the current task list
- `coordination/active-workstreams.md` for the migrated execution board

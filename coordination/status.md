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

1. Wire frontend OTP flow (customer join screens → real API)
2. Dev deploy gate hardening
3. Fix Developer model routing (mistral/codestral-latest allowlist)

## Current known status (as of 2026-03-29 18:10 PDT)

- **Dev stack**: Running and healthy
  - Web: port 3000
  - API: port 4000
  - Worker: running (retention + notification dispatcher)
  - Tailscale: public URL serving correctly

- **Recently completed workstreams**:
  - Workstream 3 (Signed Upload/Download Lifecycle) — COMPLETE
  - Workstream 2 (Stripe Webhook Payment Finalization) — COMPLETE
  - Slot Hold Lifecycle fixes — COMPLETE
  - DB test isolation (15/15 tests passing) — COMPLETE
  - Phone OTP backend stub — COMPLETE (devOtpCode returned in dev responses)

- **Pending**:
  - Frontend OTP flow not yet wired (customer join still bypasses auth)
  - Developer model `mistral/codestral-latest` not in OpenClaw allowlist (using gpt-5.4-mini as fallback)
  - Anthropic API key in Spotty agent profiles returning 401 (deferred by user)

- **Test suite**: All repository integration tests pass (15/15 when run concurrently)
- **Branch**: `wip/current-state-20260322`

## Current public app URL

- `https://msi.taila8c3ab.ts.net/`

## Notes

Keep this file as the fast snapshot a fresh subagent should read first.
Pair it with:
- `coordination/task-board.md` for the current task list
- `coordination/active-workstreams.md` for the migrated execution board

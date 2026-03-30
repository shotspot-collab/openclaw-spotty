# ShotSpot Task Board

## Active

- [ ] **Phone OTP — frontend wiring (Option B)** — backend stub done (devOtpCode), now wire OTP screens to real API for full customer join flow

## In Progress / Recently Completed (2026-03-29)

- [x] Workstream 3: Signed upload/download lifecycle — COMPLETE (commit `02fe1a5`)
- [x] Workstream 2: Stripe webhook payment finalization — COMPLETE (commit `b991e73`)
- [x] 25 comprehensive Stripe webhook tests — COMPLETE (commit `1afc0d4`)
- [x] Slot hold lifecycle fixes (expiry sweep, failure release, worker cleanup) — COMPLETE (commit `104e9bc`)
- [x] DB test isolation fixes — 15/15 tests passing (commit `a4a67cb`)
- [x] Worker syntax fix (`retention.mjs`) — COMPLETE (commit `c8bfe9b`)
- [x] Phone OTP backend stub (LocalStubSmsService + devOtpCode in response) — COMPLETE (pending commit)
- [x] Fix test isolation issues in repository integration tests — COMPLETE

## Next (Priority Order)

1. [ ] Wire frontend OTP flow (Option B) — customer join screens call real API
2. [ ] Dev deploy gate hardening — env validation, migration safety, local-first checklist
3. [ ] Fix `mistral/codestral-latest` in OpenClaw allowlist so Developer subagents can use it
4. [ ] OTP rate limiting — per-phone throttle before public exposure
5. [ ] Payout ledger / admin payout ops (pre-launch, can defer)

## Done (Earlier)

- [x] Migrate live execution context into `coordination/active-workstreams.md`
- [x] Reconcile payment-flow truth between repo spec and implementation
- [x] Implement storage signer/service abstraction (Slice C)
- [x] Reconcile photo registration contract to use storage keys (Slice D) — 2026-03-25
- [x] Implement real S3 adapters and 30-day retention worker
- [x] Migrate dashboard upload flow to signed URLs
- [x] Align workspace and repo docs to accepted hybrid payment architecture
- [x] Confirm existing runtime architecture uses Coordinator, Architect, Developer, QA, Deploy
- [x] Add UX role and UX flow docs
- [x] Update Coordinator / Architect / Developer / QA skills to read workspace memory first
- [x] Update Spotty model-routing policy and spawn templates

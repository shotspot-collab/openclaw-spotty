# ShotSpot Task Board

## Active

- [x] Migrate live execution context into `coordination/active-workstreams.md`
- [x] Reconcile payment-flow truth between repo spec language and recent implementation/status notes
- [x] Implement storage signer/service abstraction (Slice C of signed upload/download lifecycle)
- [x] Reconcile photo registration contract to use storage keys (Slice D of signed upload/download lifecycle) - COMPLETE 2026-03-25
- [x] Implement real S3 adapters and 30-day retention worker
- [x] Migrate dashboard upload flow to signed URLs
- [x] Align workspace and repo docs to accepted hybrid payment architecture
- [ ] Continue booking/payment finalization lane
- [ ] Continue critical-path integration and dev-gate hardening lane
- [ ] Fix test isolation issues in repository integration tests
- [x] Continue signed upload/download lifecycle lane (remaining: E2E testing) - COMPLETE 2026-03-28

## Next

- [ ] Fix Worker syntax error (`apps/worker/src/retention.mjs`) to enable background jobs again
- [ ] Continue booking/payment finalization lane (Stripe webhook authoritative flow)
- [ ] Continue critical-path integration and dev-gate hardening lane
- [ ] Fix test isolation issues in repository integration tests
- [ ] **[UX → Architect]** Review `ux/architect-brief.md` and produce: (1) token alignment plan for `tokens.ts`, (2) component gap analysis (masonry grid, floating cart pill, sticky CTA bar), (3) Developer delivery plan for prototype and production screens. Brief is fully locked and committed. Do not start Developer implementation until Architect gap analysis is done.

## Done

- [x] Confirm existing runtime architecture uses Coordinator, Architect, Developer, QA, Deploy
- [x] Decide to keep project coordination memory in `workspace-spotty`
- [x] Add UX role and UX flow docs
- [x] Update Coordinator / Architect / Developer / QA skills to read workspace memory first

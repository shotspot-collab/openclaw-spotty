# ShotSpot Task Board

## Active

- [x] **Re-test photographer login + Stripe connect** on stable API startup path — Tailscale /api mapping fixed to preserve /api prefix; verified `GET /api/health` → 200 and `GET /api/photographers/me` → 401 (no 404)
- [ ] **Phone OTP — frontend wiring (Option B)** — backend stub done (devOtpCode), now wire OTP screens to real API for full customer join flow
- [ ] **Dev deploy gate hardening** — env validation, migration safety, local-first checklist
- [ ] **Fix `mistral/codestral-latest` in OpenClaw allowlist** — restore deterministic Developer model routing
- [ ] **OTP rate limiting** — per-phone throttle before public exposure
- [ ] **Payout ledger / admin payout ops** (pre-launch, can defer)

## In Progress / Recently Completed (2026-03-31)

- [x] API stability — detached startup + graceful shutdown — COMPLETE
  - graceful `SIGTERM`/`SIGINT` shutdown in `apps/api/src/server.ts`
  - detached/background guidance updated in `apps/api/README.md`
  - launch-mode guidance updated in `docs/local-dev-runtime.md`
  - verified with `pnpm --dir apps/api start:tsx` and `/api/health`
- [x] Google OAuth env loading + Tailscale auth path verification — COMPLETE
  - API dev script now loads repo-root `.env.local` via `dotenv-cli` from `apps/api`
  - verified `GET http://localhost:4000/auth/google` returns `302 Found`
  - verified redirect URI is exactly `https://msi.taila8c3ab.ts.net/auth/google/callback`
  - verified Tailscale mapping `/auth -> http://localhost:4000/auth`

## In Progress / Recently Completed (2026-03-29)

- [x] API launch-methods SOP — COMPLETE
- [x] Phone OTP backend stub (LocalStubSmsService + devOtpCode in response) — COMPLETE (commit `bb5e146`)
- [x] Workstream 3: Signed upload/download lifecycle — COMPLETE (commit `02fe1a5`)
- [x] Workstream 2: Stripe webhook payment finalization — COMPLETE (commit `b991e73`)
- [x] 25 comprehensive Stripe webhook tests — COMPLETE (commit `1afc0d4`)
- [x] Slot hold lifecycle fixes (expiry sweep, failure release, worker cleanup) — COMPLETE (commit `104e9bc`)
- [x] DB test isolation fixes — 15/15 tests passing (commit `a4a67cb`)
- [x] Worker syntax fix (`retention.mjs`) — COMPLETE (commit `c8bfe9b`)
- [x] Fix test isolation issues in repository integration tests — COMPLETE

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

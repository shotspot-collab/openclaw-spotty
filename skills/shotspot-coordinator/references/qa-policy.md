# ShotSpot QA Policy

Use this when deciding what kind of QA evidence is required for a ShotSpot task.

## Core rule

Match QA depth to the change surface and user risk.

- **Backend-only / domain-only / worker-only changes** do not automatically require browser QA.
- **User-facing browser-flow changes** do require browser QA.
- **UI/visual changes** require browser QA and screenshots.
- **High-risk end-to-end flows** should usually get browser QA even if much of the change is backend-driven.

## QA tiers

### Tier 1 — Automated/backend QA only
Use when the task is primarily:
- repository/domain logic
- API route logic
- worker/outbox behavior
- config/env validation
- migration/runtime alignment
- internal auth/session plumbing with no immediate browser surface change

Evidence can be:
- targeted tests
- integration tests
- typecheck
- migration checks
- log/DB verification

### Tier 2 — Browser QA required
Use when the task affects:
- browser flows users actually perform
- auth/login/logout in the app
- dashboard/session/gallery/customer route behavior
- browser-visible fixes where the bug report came from app usage
- end-to-end flow correctness that cannot be trusted from API tests alone

Evidence should include:
- affected-area browser walkthrough
- quick nearby regression walkthrough
- commands used (for example Playwright)
- pass/fail + residual risks

### Tier 3 — Browser QA + screenshots required
Use when the task affects:
- visual layout/UI presentation
- screenshots/spec parity expectations
- user-facing bug fixes where a screenshot is valuable proof
- multi-step flows where visual confirmation reduces ambiguity

Evidence should include:
- screenshots or image captures of key states
- what was verified in each screenshot
- any remaining UI inconsistencies

## Default mapping for current ShotSpot work

- Worker/config/outbox hardening -> Tier 1
- Repository/payment/idempotency logic -> Tier 1 unless user-facing route/browser behavior changed materially
- Public URL bugs from live app usage -> Tier 2 (Tier 3 if visual proof is useful)
- Gallery/customer/photographer browser bugs -> Tier 2, often Tier 3
- Auth flow changes consumed in the web app -> Tier 2
- UI polish/visual regressions -> Tier 3

## Coordinator behavior

Before closing a task, Spotty should state which QA tier was applied and why.

If a task is browser-facing and no browser QA was done yet, Spotty should call that out explicitly instead of implying full user-flow confidence.

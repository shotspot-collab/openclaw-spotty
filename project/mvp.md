# ShotSpot MVP

## Goal

Ship a low-friction walk-up booking and photo commerce MVP for ShotSpot.

## In scope

- customer authentication via phone OTP
- photographer authentication via phone OTP with verified backup email
- photographer session creation and operations
- QR-based customer entry into the booking flow
- time-limited slot holds
- booking payment flow
- proof-of-arrival PIN verification
- gallery delivery, purchase, and signed download flow
- worker/outbox-driven reliability tasks
- notification sending needed for the core flow

## Out of scope

- fake/demo runtime paths
- speculative non-MVP expansion unless explicitly approved
- production deploy actions without explicit approval

## Current product constraints

- optimize for mobile-first, low-friction walk-up use
- keep local and cloud on the same real backend path
- keep critical-path status and decision docs in Spotty workspace

## Known architecture tension to resolve

- repo `requirements-spec.md` still says booking uses Stripe PaymentIntents only
- recent implementation/status context mentions Stripe Checkout in some places
- Coordinator / Architect should reconcile this explicitly before treating payment-flow wording as settled truth

## Notes

- Keep this file short and current.
- Update when product scope changes.
- Coordinator and UX should treat this as the shared MVP truth.

# ShotSpot Active Workstreams

This is the workspace-level execution dashboard for Spotty.
Use it instead of repo-local `.codex` files as the first coordination read.

## 1. Demo-mode removal / real-backend hardening
- Legacy task id: `remove-demo-mode-20260313`
- Status: in_progress / mostly advanced, with follow-up hardening still active
- Why it matters: keeps local and cloud on the same real backend path and removes fake/demo behavior drift
- Recent completed slices:
  - removed demo/parity fallback paths from core flows
  - hardened notification outbox worker retry behavior
  - added booking-core backend slice for holds/payment attempt persistence/webhook-authoritative finalization/idempotency
  - fixed public URL generation leaks for queue/gallery/session/password-reset/connect URLs
- Remaining watch items:
  - SES sender verification remains external
  - SMS/provider hardening and Terraform/bootstrap still have follow-up work
  - some QA/deploy-gate work remains partial
- Relevant docs:
  - `project/decisions.md`
  - `architecture/system-overview.md`
  - repo technical docs as needed

## 2. MVP feature-gap execution board
- Legacy task id: `mvp-feature-gap-plan-20260321`
- Status: in_progress
- Why it matters: converts the MVP gap analysis into an execution roadmap
- Current important findings:
  - implemented/partial: notification worker, free-session gallery flow, queue progression, gallery-ready notifications, public-route baselines
  - missing/incomplete: OTP auth completion, slot holds, booking payment finalization, signed upload/download lifecycle, retention reminders/purge, payout ledger/admin payout ops, CI/dev gates
  - spec drift: repo requirements say PaymentIntents-only while current implementation/status mentions Stripe Checkout in some places
- Current recommended lanes:
  1. critical-path integration suite + dev gate hardening
  2. OTP/session auth baseline completion
  3. slot hold lifecycle
  4. signed upload/download lifecycle
  5. retention reminder/purge worker

## 3. Signed upload/download lifecycle
- Legacy task id: `signed-upload-download-lifecycle-20260322`
- Status: in_progress
- Why it matters: moves photo upload/download toward the intended production shape instead of inline DB payload assumptions
- Current progress:
  - task was claimed and scoped
  - empty-gallery regression root cause identified and fixed
  - send/publish now rejects no-photo publish attempts
  - session dashboard status derivation improved so uploaded orders move out of pending before publish
  - **storage signer/service abstraction implemented and unit tested** (Slice C complete)
    - `StorageUploadSigner` interface for issuing signed upload URLs (PUT)
    - `MediaDeliveryService` interface for issuing preview/download URLs (GET)
    - S3-backed implementations using AWS SDK with presigned URLs
    - Local stub implementations for development
    - 14 unit tests covering interface contracts, URL encoding, and separation of concerns
  - **photo registration contract reconciled to use storage keys** (Slice D complete - 2026-03-25)
    - Updated photo registration schema to accept `objectKeyOriginal` (S3 object keys) instead of inline data URLs
    - Added metadata columns to photos table: `originalFilename`, `contentType`, `sizeBytes`
    - Updated `registerStoragePhotos` repository method to store metadata
    - Updated route validation to accept optional `fileName`, `mimeType`, `sizeBytes` fields
    - Updated unit tests for new metadata fields
    - Added integration tests for storage-based photo flow in `repositories.storage-photos.test.ts`
    - Created migration `0005_photo_metadata.sql` for new columns
    - Gallery endpoint (`GET /api/gallery/:token`) uses `MediaDeliveryService.issuePreviewUrl()` for storage keys
    - Download endpoint (`GET /api/download/:token`) uses `MediaDeliveryService.issueDownloadUrl()` for storage keys
    - Dependencies wired in `app.ts`: `mediaDeliveryService` and `storageUploadSigner` available in route handlers
    - Route tests in `photographers.test.ts` verify upload URL issuance and photo registration with metadata
- Remaining work:
  - Remove or deprecate old inline upload endpoint `POST /api/orders/:id/photos`
  - End-to-end testing of upload → register → download flow
  - Frontend UI validation after contract changes
  - Server-controlled signed download issuance constraints
- Residual risks:
  - current UI may still expose gallery affordances before publish
  - old inline endpoint `POST /api/orders/:id/photos` still exists and uses data URLs
  - customer gallery preview behavior will need explicit signed/proxied delivery rules once storage-backed
  - manual `Mark Paid` path remains conceptually inconsistent with Stripe-verified flow

## Working rule

When a workstream changes meaningfully, update this file and also update:
- `coordination/task-board.md`
- `coordination/handoffs.md` when another role/session needs the change
- `project/decisions.md` if the change reflects accepted project truth

# ShotSpot Handoffs

Use this file for short durable role-to-role handoffs when a decision or status change must survive across channels/sessions.

## Template

## YYYY-MM-DD HH:MM <from role> -> <to role>
- Task:
- Context:
- Ask:
- Files updated:
- Risks/open questions:

---

## 2026-03-25 17:25 Developer -> QA
- Task: Slice D QA Handoff - Storage-backed photo lifecycle end-to-end testing
- Context: Slice D route layer integration is complete. The storage-backed photo lifecycle is now fully wired end-to-end. All components are in place for manual testing.
- Testing Instructions:
  1. **Get Upload URLs**: `POST /api/photographers/me/uploads/urls` with `{ files: [{ key: "test-photo.jpg", contentType: "image/jpeg" }] }` → returns signed S3 upload URLs (or local stubs)
  2. **Upload to S3**: Use the returned `uploadUrl` to PUT the file directly to S3 (or mock endpoint for local dev)
  3. **Register Photos**: `POST /api/photographers/me/photos` with `{ bookingId: "<uuid>", photos: [{ objectKeyOriginal: "test-photo.jpg", fileName: "test-photo.jpg", mimeType: "image/jpeg", sizeBytes: 12345 }] }` → returns `{ ok: true, registeredCount: 1 }`
  4. **Verify Gallery**: `GET /api/gallery/:token` → returns photos with `preview_url` generated via `MediaDeliveryService.issuePreviewUrl()`
  5. **Verify Download**: `GET /api/download/:token` → returns photos with `url` generated via `MediaDeliveryService.issueDownloadUrl()`
- Environment Setup:
  - Local dev uses stub implementations (`LocalStubStorageUploadSigner`, `LocalStubMediaDeliveryService`) when AWS env vars are not set
  - For real S3 testing, set: `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_MEDIA_BUCKET_NAME`
- Files to test:
  - `apps/api/src/routes/photographers.ts` - upload URLs and photo registration
  - `apps/api/src/routes/parity-real.ts` - gallery and download endpoints
  - `apps/api/src/services/media.ts` - S3 signer and delivery service implementations
- Automated tests:
  - `apps/api/src/routes/photographers.test.ts` - Route-level tests for upload URLs and registration
  - `apps/api/src/data/repositories.storage-photos.test.ts` - Repository integration tests
  - `apps/api/src/services/media.test.ts` - Media service unit tests
- Risks/open questions:
  - Integration tests require database connection (DATABASE_URL env var)
  - Old inline endpoint `POST /api/orders/:id/photos` still exists but is deprecated
  - Frontend UI may need updates to use new storage-based flow

---

## 2026-03-23 09:15 Coordinator -> All roles
- Task: Shared-memory migration to Spotty workspace
- Context: Spotty workspace is now the primary coordination and project-memory layer. UX is a first-class specialist role. `.codex` should be treated as secondary/legacy context rather than the first read.
- Ask: Read `coordination/status.md`, `coordination/task-board.md`, `project/mvp.md`, and `project/decisions.md` before consulting repo-local task history.
- Files updated: `project/*`, `coordination/*`, `ux/*`, role skills under `skills/`
- Risks/open questions: payment-flow wording appears inconsistent between repo requirements and recent implementation/status notes; reconcile before assuming settled truth.

## 2026-03-25 17:10 Developer -> Coordinator / QA
- Task: Slice D - Reconcile photo registration contract to use storage keys
- Context: Photo registration now fully supports storage-backed lifecycle. The registration endpoint `POST /api/photographers/me/photos` accepts S3 object keys (storageKeyOriginal) and optional metadata (fileName, mimeType, sizeBytes). Gallery and download endpoints already use MediaDeliveryService for signed URLs. Database schema updated with new metadata columns (originalFilename, contentType, sizeBytes).
- Ask:
  - QA: Run integration tests for the complete upload -> register -> download flow using local S3.
  - Coordinator: Schedule Slice E (End-to-end testing and remove deprecated inline endpoint) when ready.
  - Developer: Old inline endpoint `POST /api/orders/:id/photos` marked as deprecated; coordinate removal with frontend team.
- Files updated:
  - `packages/db/src/schema.ts` - Added metadata columns to photos table
  - `packages/db/drizzle/0005_photo_metadata.sql` - Migration for new columns
  - `apps/api/src/data/repositories.ts` - Updated `registerStoragePhotos` to store metadata
  - `apps/api/src/routes/photographers.ts` - Updated registration schema to accept sizeBytes
  - `apps/api/src/routes/photographers.test.ts` - Updated tests for metadata fields
  - `apps/api/src/data/repositories.storage-photos.test.ts` - New integration tests
  - `apps/api/src/routes/parity-real.ts` - Marked old inline endpoint as deprecated
  - `coordination/active-workstreams.md` - Updated status
  - `coordination/task-board.md` - Marked Slice D complete
- Risks/open questions: Old inline endpoint still exists for backward compatibility; needs frontend migration before removal. Integration tests require local database.

## 2026-03-23 09:56 UX -> Coordinator / Architect
- Task: Convert UX inspiration stack into an architect planning output
- Context: UX accepted a default inspiration stack for ShotSpot: Airbnb (booking clarity), Stripe (payment trust), Apple (premium visual restraint), Linear (photographer ops), and Pixieset/Pic-Time/ShootProof-style gallery-commerce patterns. This is a planning baseline, not a request to clone another product.
- Ask:
  - Coordinator: use `project/decisions.md` as the durable source and request an Architect plan from this baseline.
  - Architect: produce 2-3 concrete UI/system directions and map them onto homepage, QR landing, slot booking, payment, gallery purchase, and photographer dashboard surfaces.
  - Architect: explicitly separate customer-facing tone from photographer-facing ops tone if a split-system recommendation is best.
- Files updated: `project/decisions.md`, `ux/flows/onboarding.md`
- Risks/open questions: payment-flow canonical truth still needs reconciliation; Architect should not assume final payment mechanics beyond the current MVP/decision docs.

## 2026-03-23 10:10 Coordinator -> Developer / QA / Architect
- Task: Lock shared truth after payment and storage-lane review
- Context:
  - Payment architecture is now accepted as hybrid by lane: bookings use Stripe PaymentIntents with webhook-driven finalization; gallery/photo purchases currently use Stripe Checkout Sessions backed by stored PaymentIntent IDs.
  - Signed upload/download lifecycle remains in progress but is blocked on storage contract/service wiring rather than payment ambiguity.
  - Main blocker details: missing storage signer abstraction in API dependencies, registration contract drift around storage keys vs delivery URLs, and unresolved preview/download delivery rules for storage-backed media.
- Ask:
  - Developer: align repo docs to the accepted payment truth before attempting payment rewrites, then implement storage-backed upload/download contracts from a signer abstraction outward.
  - QA: validate future payment and gallery work against the lane split rather than a PaymentIntents-only assumption.
  - Architect: treat webhook-authoritative gallery purchase confirmation as the next payment hardening question, not the canonical payment-truth question.
- Files updated: `project/decisions.md`, `project/mvp.md`, `project/open-questions.md`, `architecture/system-overview.md`, `coordination/status.md`, `coordination/current-focus.md`, `coordination/active-workstreams.md`, `coordination/task-board.md`
- Risks/open questions: gallery purchase confirmation remains weaker than booking finalization; storage-backed preview/download behavior still needs explicit contract decisions.

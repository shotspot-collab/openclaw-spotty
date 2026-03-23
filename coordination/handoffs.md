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

## 2026-03-23 09:15 Coordinator -> All roles
- Task: Shared-memory migration to Spotty workspace
- Context: Spotty workspace is now the primary coordination and project-memory layer. UX is a first-class specialist role. `.codex` should be treated as secondary/legacy context rather than the first read.
- Ask: Read `coordination/status.md`, `coordination/task-board.md`, `project/mvp.md`, and `project/decisions.md` before consulting repo-local task history.
- Files updated: `project/*`, `coordination/*`, `ux/*`, role skills under `skills/`
- Risks/open questions: payment-flow wording appears inconsistent between repo requirements and recent implementation/status notes; reconcile before assuming settled truth.

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

# ShotSpot Decision Log

Record accepted cross-agent decisions here.

## Entry format

## YYYY-MM-DD - <decision title>
- Owner:
- Status: proposed | accepted | superseded
- Context:
- Decision:
- Impact:
- Follow-ups:

---

## 2026-03-23 - Spotty workspace is the primary coordination memory
- Owner: Coordinator
- Status: accepted
- Context: Cross-channel/session coordination was split between repo-local `.codex` files and chat-local memory, which made continuity harder and increased coupling to repo internals.
- Decision: Use `workspace-spotty` as the primary shared knowledge layer for project coordination, UX direction, task status, and handoffs. Keep the ShotSpot repo focused on code and implementation-coupled technical docs.
- Impact: Coordinator, UX, Architect, Developer, and QA should read/write Spotty workspace shared files first for project memory.
- Follow-ups: add workspace-level status/task docs, add UX role skill, and de-emphasize `.codex` as the primary coordination mechanism.

## 2026-03-23 - ShotSpot UX inspiration stack and architect handoff baseline
- Owner: UX
- Status: accepted
- Context: The team needs a durable UX direction that a Coordinator can hand to Architect without re-explaining taste decisions in chat. ShotSpot needs customer trust, premium photo-commerce tone, and efficient photographer operations without drifting into generic SaaS or Dribbble-only aesthetics.
- Decision: Use the following inspiration stack as the default UX reference set for planning, wireframes, and future visual-system proposals:
  - Airbnb -> booking-flow clarity, mobile reservation confidence, calm step hierarchy
  - Stripe -> payment trust, form/error/retry states, confirmation clarity
  - Apple -> premium restraint, typography confidence, image/value presentation
  - Linear -> photographer dashboard density, calm ops surfaces, modern pro-tool feel
  - Pixieset / Pic-Time / ShootProof family -> gallery commerce patterns, selected/paid/downloadable photo states
- Impact:
  - Customer-facing booking should primarily borrow from Airbnb + Stripe.
  - Customer-facing gallery and purchase surfaces should primarily borrow from Apple + gallery-commerce references.
  - Photographer-facing operations should primarily borrow from Linear, with utility-screen simplicity influenced by Notion-style clarity when useful.
  - Architect should treat this as UX intent, not literal cloning. The job is to translate the stack into a coherent ShotSpot design system, information architecture, and screen plan.
  - Avoid generic dashboard SaaS patterns, random Dribbble concept aesthetics, and legacy proofing-tool complexity as primary references.
- Follow-ups:
  - Coordinator should request an Architect output that converts this stack into 2-3 concrete visual/system directions for ShotSpot.
  - Architect should map the stack onto homepage, booking, gallery, checkout, and photographer-dashboard surfaces.
  - UX should keep flow docs aligned as concrete screen decisions are accepted.

## 2026-03-29 - Unified light theme with no brand accent color
- Owner: UX
- Status: accepted
- Context: Initial theme exploration considered a split customer (light) vs photographer (dark) theme. This was rejected because it would make the product feel like two different apps.
- Decision: ShotSpot uses a single unified light theme across all surfaces. Primary color is near-black (#0A0A0A) on warm off-white (#FCFBF9). No brand accent color. Photos are the color. Differentiation between customer and photographer surfaces is achieved through layout density and spacing only — not color or component divergence.
- Color palette locked:
  - Background: #FCFBF9
  - Card/Surface: #FFFFFF
  - Primary Text: #1A1A1A
  - Primary Button: #0A0A0A
  - Borders: #EAEAEA
  - Success: #1A7A4A
  - Warning: #B45309
  - Danger: #C0392B
- Typography: Inter (or SF Pro) for all surfaces. Monospace numbers for IDs and prices.
- Shape: 8px border radius throughout.
- Impact: Architect must align tokens.ts to this palette. Developer must apply consistently across all prototype and production screens.
- Follow-ups: Full page-by-page UX spec written to ux/architect-brief.md. Architect should review and produce component gap analysis and delivery plan.

## 2026-03-24 - Real AWS S3 for local dev and 30-day strict photo retention
- Owner: Coordinator
- Status: accepted
- Context: We need to validate bucket URL strategies and cleanup strategies in reality, rather than relying on local mocks that hide real-world S3 behavior. We also have a strict data privacy/cost requirement.
- Decision: 
  1. Local development will use real AWS S3 buckets for upload and delivery (no mock endpoints).
  2. Strict 30-day retention policy: photos must be deleted 30 days after session is closed (or 30 days from creation if the session remains unclosed).
  3. Warning system: multiple warning notifications must be sent to the photographer and customer before the 30th-day deletion.
- Impact: 
  - Need to implement real AWS SDK S3 presigner adapters immediately instead of local stubs.
  - Need to build a retention/purge worker that runs daily to issue warnings and execute hard deletions.
- Follow-ups: Architect to design the S3 adapter interface and the retention worker schedule/notification triggers. Developer to implement.
- Owner: Architect / Coordinator
- Status: accepted
- Context: Repo docs still described ShotSpot as PaymentIntents-only, but checked-in implementation uses PaymentIntents for booking payments and Stripe Checkout Sessions for gallery/photo purchases.
- Decision: Canonical MVP payment architecture is hybrid by lane: bookings use Stripe PaymentIntents with webhook-driven finalization; gallery/photo purchases use Stripe Checkout Sessions, with durable records persisted against the resulting PaymentIntent.
- Impact:
  - Coordinator, UX, Developer, and QA should stop treating PaymentIntents-only as the current project truth.
  - Booking and gallery purchase flows should be described separately in docs and planning.
  - Internal payment persistence remains PaymentIntent-keyed for auditability and reconciliation.
- Follow-ups:
  - align repo docs (`AGENTS.md`, `docs/requirements-spec.md`, `docs/api-spec.md`, `docs/domain-state-spec.md`)
  - decide whether gallery purchase confirmation should be hardened to webhook-authoritative finalization
  - keep naming and route docs explicit about the lane split

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

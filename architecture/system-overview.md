# ShotSpot System Overview

This is the quick coordination-layer architecture summary for Spotty.
It is not a replacement for deep repo technical docs; it is the fast read for fresh roles.

## Product shape

ShotSpot is a mobile-first walk-up photography workflow with:
- QR/session discovery
- booking / queue flow
- arrival verification
- photographer session operations
- gallery delivery and purchase
- notifications and background processing

## Current system shape

- Frontend: Next.js (`apps/web`)
- API: Fastify (`apps/api`)
- Worker: background processing (`apps/worker`)
- Database: PostgreSQL + Drizzle (`packages/db`)
- Deployment target: AWS-first

## Coordination truths

- Spotty workspace is the primary shared project memory.
- ShotSpot repo is the source of truth for code and implementation-coupled technical docs.
- `.codex` is legacy/secondary context, not the first read.

## Product/technical truths

- Do not reintroduce demo mode.
- Local and cloud should use the same real backend path.
- Worker/outbox is the intended reliability/background-processing model.
- UX decisions should be written into workspace docs, not left in chat.

## Specialist roles

- Coordinator: orchestrates priorities, summaries, approvals, and handoffs
- UX: owns user-flow and product-experience decisions
- Architect: owns technical/system design
- Developer: owns implementation
- QA: owns validation
- Deploy: owns release/deploy readiness

## Current watch items

- payment-flow wording needs explicit reconciliation
- URL generation consistency in customer-facing flows should remain under scrutiny
- dev-gate hardening and critical-path integration remain active areas

# Onboarding Flow

## Goal

Get a walk-up customer from QR scan to confirmed booking with the fewest possible steps.

## Actors

- customer
- system
- photographer (indirectly, via configured session)

## Main path

1. Customer scans QR code
2. Customer lands on session-specific booking page
3. Customer authenticates with phone OTP
4. Customer sees available slot choices immediately
5. Customer selects slot
6. System creates a temporary hold
7. Customer completes payment if required
8. System confirms booking after payment/finalization
9. Customer receives confirmation with next-step details

## UX principles

- Do not front-load unnecessary profile creation
- Keep pricing and slot availability visible before commitment
- Make OTP friction minimal and explicit
- Keep status messaging simple during hold/payment states

## Edge cases

- hold expires before payment completes
- no slots available
- payment fails or remains pending
- network drops during OTP or payment steps

## Implications

- Architect should keep hold/payment state transitions explicit and idempotent
- Developer should avoid extra page hops or hidden state dependencies in the critical path

## Experience direction

- Primary inspiration for onboarding/booking: Airbnb + Stripe
- Desired feel: fast, trustworthy, mobile-first, premium-but-simple
- Visual caution: do not make the QR-entry and booking flow feel like a generic SaaS form wizard or an overly playful event microsite
- Architect handoff note: when planning booking UX, prioritize immediate slot/price clarity, calm payment confidence, and a minimal number of high-friction moments

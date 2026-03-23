# Queue Experience

## Goal

Make session join, arrival verification, and photographer progression feel clear and trustworthy.

## Main path

1. Customer joins session/queue
2. System generates a per-customer per-session proof PIN
3. Customer receives the PIN in the join confirmation
4. Photographer verifies the PIN at arrival
5. Photographer starts the session only after verification

## Current decision

- Proof-of-arrival uses a unique per-customer per-session PIN
- Photographer manually validates it
- Separate customer "start shooting" notification is not required for MVP

## UX principles

- Verification should reassure both sides without adding a complicated ceremony
- The photographer action should be explicit: verify first, then start
- Customer messaging should explain why the PIN matters

## Risks

- confusing PIN wording
- unclear distinction between booking confirmation and arrival verification
- too many notifications in the critical path

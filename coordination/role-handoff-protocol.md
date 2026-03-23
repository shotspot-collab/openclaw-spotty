# ShotSpot Role Handoff Protocol

Use this protocol when one role hands work to another.

## Global rule

Before handing off, write any durable context that another role will need into workspace files.
Do not rely on chat-only memory.

## Coordinator -> UX
Use when:
- user flow is ambiguous
- MVP tradeoff is needed
- onboarding/copy/content direction matters

Must include:
- question to answer
- current project context
- constraints
- expected doc updates

Expected UX output:
- recommendation
- tradeoffs
- workspace files updated
- implementation implications for Architect/Developer

## Coordinator -> Architect
Use when:
- technical design is ambiguous
- contracts/schemas may change
- infra assumptions matter

Must include:
- problem statement
- relevant product/UX decisions
- affected area
- expected design deliverable

Expected Architect output:
- recommendation
- affected files/modules
- schema/API/infra implications
- risks/open questions
- Developer handoff

## Coordinator/Architect -> Developer
Use when:
- implementation is approved

Must include:
- exact task goal
- accepted constraints
- files/areas likely affected
- tests expected

Expected Developer output:
- files changed
- what was implemented
- commands/tests run
- known risks/gaps

## Developer -> QA
Use when:
- behavior changed
- code changed
- runtime validation matters

Must include:
- what changed
- affected flows
- expected validation depth
- known risk areas

Expected QA output:
- affected areas tested
- regression areas tested
- commands run
- pass/fail
- residual risks

## QA -> Coordinator
Must include:
- go/no-go status
- important failures or caveats
- whether user approval is needed for next step

## Any role -> Handoff file
If another session/channel might need the result later, write a short durable entry into:
- `coordination/handoffs.md`

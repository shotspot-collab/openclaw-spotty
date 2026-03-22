# Spotty Role Handoff Template

Use this template when handing work from one role/subagent to the next.

## Handoff block

- From role:
- To role:
- Task:
- Repo path: `C:\Users\nbobb\shotspotwork\ShotSpotMainApp`
- Current task file:
- Summary of current state:
- Constraints / guardrails:
- Expected deliverable:
- Deadline / urgency:
- Open risks / unknowns:

## Common examples

### Architect -> Developer

- From role: Architect
- To role: Developer
- Task: Implement approved design
- Summary of current state: design approved, affected modules identified
- Constraints / guardrails:
  - do not reintroduce demo mode
  - keep backend logic ShotSpot-owned
  - preserve worker/outbox direction
- Expected deliverable:
  - code changes
  - tests run
  - concise implementation summary

### Developer -> QA

- From role: Developer
- To role: QA
- Task: Validate implementation
- Summary of current state: implementation complete, commands/tests already run by developer listed below
- Constraints / guardrails:
  - validate affected areas first
  - run nearby regression checks
  - use Playwright if UI changed
- Expected deliverable:
  - pass/fail report
  - commands run
  - residual risks

### QA -> Deploy

- From role: QA
- To role: Deploy
- Task: Assess release readiness / next safe deploy step
- Summary of current state: QA complete or blocked with findings
- Constraints / guardrails:
  - no deploy without explicit approval
  - focus on readiness, blockers, approvals needed, and verification plan
- Expected deliverable:
  - readiness status
  - blockers
  - exact next safe step

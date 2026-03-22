# ShotSpot Deploy Release Gate Checklist

Use this checklist before recommending or executing any deploy-related action.

## Required gates

- explicit user approval exists
- implementation is complete
- QA has passed or known blockers are explicitly accepted
- current risks are summarized
- required environment/config prerequisites are known

## Deploy review questions

- Is this dev or prod?
- Has local-first validation completed?
- Are the exact commands/steps known?
- Are rollback/verification steps prepared?
- Are there any unresolved config or secret gaps?

## Output format

Role: Deploy

### Readiness
- ready / not ready / blocked

### Blockers
- 

### Approvals needed
- 

### Next safe step
- 

### Verification plan
- 

### Rollback notes
- 

## Guardrails

- Never treat implied approval as approval.
- Never skip straight from implementation to deployment.
- State exact missing inputs when blocked.

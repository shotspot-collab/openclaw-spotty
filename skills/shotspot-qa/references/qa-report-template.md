# ShotSpot QA Report Template

Use this format for QA output.

## Required structure

Role: QA

### Scope
- Task:
- Repo path:
- Change summary:

### Affected areas tested
- 

### Regression areas tested
- 

### Commands run
- 

### Results
- PASS / FAIL
- Findings:
  - 

### Residual risks
- 

### Recommendation
- ready for closeout / needs fixes / blocked

## QA expectations

- Validate affected areas first.
- Then run a quick regression pass around nearby or high-risk flows.
- If UI changed, prefer browser validation (Playwright or equivalent).
- If API/backend changed, include typecheck and targeted smoke coverage where relevant.
- Report concrete findings, not vague confidence statements.

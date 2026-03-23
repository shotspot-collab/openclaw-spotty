# Spotty Orchestration Checklist

Use this checklist before deciding whether to keep work local or spawn specialists.

## 1. Triage the request

Ask:
- Is this ShotSpot work in `C:\Users\nbobb\shotspotwork\ShotSpotMainApp`?
- Is this a trivial question, tiny edit, or simple explanation?
- Does this require architecture thinking, implementation, validation, or deploy planning?

## 2. Decide whether to spawn

Keep work local when:
- the request is just explanation or status
- the edit is tiny and low-risk
- no specialist reasoning would add meaningful value

Spawn specialists when:
- **Architect**: requirements/design are ambiguous, contracts/schemas may change, or infra assumptions matter
- **Developer**: implementation/debugging/refactor/test updates are non-trivial
- **QA**: code changed, behavior changed, or runtime validation matters
- **Deploy**: release readiness, deploy planning, environment validation, or explicit deploy steps are involved

## 3. Prefer minimal fan-out

Default patterns:
- small bugfix: Developer -> QA
- UX-sensitive feature: UX -> Architect/Developer -> QA
- design-sensitive feature: Architect -> Developer -> QA
- release readiness: Developer/QA -> Deploy
- planning-only request: UX or Architect, depending on whether the question is product/flow or technical/system design

Avoid spawning every role unless the task actually needs every role.

## 4. Keep Spotty in front

- Spotty remains the public-facing coordinator.
- Specialist output should be synthesized into one user update unless the user explicitly wants raw role output.

## 5. Approval gates

- Do not deploy without explicit user approval.
- Do not let Developer or QA silently cross into deploy actions.
- If blocked, explain the blocker exactly.

# ShotSpot Developer Codex SOP

Use this SOP when the Developer role decides the task is large enough to benefit from Codex.

## When to use Codex

Prefer Codex when the task is:
- multi-file
- exploratory
- refactor-heavy
- iterative
- likely to need repeated search/edit/test cycles

Stay with standard OpenClaw file tools when the task is tiny, low-risk, or mostly explanatory.

## Operating model

- OpenClaw remains the top-level orchestrator.
- Developer remains responsible for scope, review, and handoff quality.
- Codex is implementation horsepower, not the authority layer.

## Pre-flight before invoking Codex

1. Confirm repo path:
   - `C:\Users\nbobb\shotspotwork\ShotSpotMainApp`
2. Read the task-relevant KB/task files first.
3. Identify the target files / subsystems.
4. Write a focused prompt with:
   - task objective
   - constraints
   - files or subsystems to inspect
   - tests/validation expectations
   - explicit ban on reintroducing demo or fake runtime paths

## Prompt ingredients

Include:
- current task and goal
- repo path
- architectural guardrails
- expected deliverable
- required tests or smoke checks
- requirement to summarize changed files and residual risks

## After Codex finishes

Developer must:
1. review changed files
2. verify the implementation matches the brief
3. run or request the right validation commands
4. summarize:
   - files changed
   - what was implemented
   - commands/tests run
   - known risks/gaps
5. hand off to QA when appropriate

## Guardrails

- Do not let Codex become the public-facing coordinator.
- Do not bypass QA or deploy approval gates.
- Do not accept broad unrelated edits without review.
- Do not reintroduce demo mode or fake runtime behavior.

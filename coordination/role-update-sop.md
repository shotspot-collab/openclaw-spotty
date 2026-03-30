# ShotSpot Role Update SOP

Use this SOP to keep all roles synchronized without over-documenting.

## Core rule

If a decision, risk, status change, or handoff in one channel would matter in another channel later, write it down immediately in the smallest durable place that fits.

## Keep it lightweight

Do not write huge summaries every turn.
Prefer small precise updates:
- one decision entry
- one handoff entry
- one workstream paragraph tweak
- one task-board move
- one concise architecture note

## Anti-patterns

Avoid:
- leaving accepted decisions only in chat
- updating five docs when one would do
- mixing MVP truth with task status
- treating scratch discussion as accepted project truth
- treating `.codex` as the first coordination memory when workspace docs already capture the durable state

## UX: what to write after each meaningful decision

### Update `project/decisions.md` when
- a UX recommendation becomes accepted project truth
- wording, flow, or product behavior is chosen between options
- an MVP tradeoff is decided

### Update `project/mvp.md` when
- scope changes
- something moves into MVP or out of MVP
- a constraint becomes part of the MVP definition

### Update `ux/flows/*.md` when
- a flow is clarified enough to be durable
- the main path or edge cases materially changed
- implementation needs a stable flow reference

### Update `coordination/handoffs.md` when
- Coordinator, Architect, or Developer needs the result next
- a recommendation needs explicit baton-pass language
- an unresolved risk/open question should follow the decision

### UX minimum output rule
After a meaningful UX turn, at least one of these should be true:
- durable docs updated
- explicit note that no durable project truth changed

## Coordinator: what to write after each meaningful execution step

### Update `coordination/active-workstreams.md` when
- a workstream meaningfully advanced
- status/risk/remaining work changed
- the recommended next lane changed

### Update `coordination/task-board.md` when
- active/next/done items changed
- a lane started, finished, or was deprioritized

### Update `coordination/handoffs.md` when
- another role/session/channel now owns the next move
- specialist output needs a durable baton pass
- a blocker or approval dependency should survive chat context

### Update `project/decisions.md` when
- execution revealed a decision that is now accepted project truth
- a contradiction was resolved

### Update `project/open-questions.md` when
- a new unresolved cross-role question appears
- a previously tracked open question is resolved or reframed

### Coordinator task-record lifecycle rule
For every meaningful task lane, Coordinator must keep the local coordination record current:
1. update the task record when the task starts or materially advances
2. update the task record again when the task completes, is blocked, is handed off, or is deprioritized
3. reflect the change in the smallest durable place that fits, usually `coordination/active-workstreams.md`, `coordination/task-board.md`, and `coordination/handoffs.md` when ownership changes

### Coordinator minimum output rule
After a meaningful coordination turn, at least one of these should be true:
- coordination docs updated
- explicit note that no durable coordination state changed

## Architect: what to write after each meaningful design step

### Update `architecture/system-overview.md` when
- the quick coordination-layer architecture summary changed
- a cross-role technical constraint should be visible without digging into repo docs

### Update `project/open-questions.md` when
- a design uncertainty remains unresolved
- a product/technical contradiction needs coordinator attention

### Update `coordination/handoffs.md` when
- Developer or Coordinator needs a durable implementation handoff
- risks/open questions should survive beyond the current chat

### Update `project/decisions.md` when
- a technical/product decision becomes accepted project truth at the coordination layer

### Architect minimum output rule
After a meaningful architect turn, at least one of these should be true:
- architecture/handoff/open-question docs updated
- explicit note that no durable architecture state changed

## Developer: what to write after each meaningful implementation step

### Update `coordination/active-workstreams.md` when
- implementation materially advanced a tracked lane
- remaining work or risks changed in a way Coordinator should see quickly

### Update `coordination/handoffs.md` when
- QA is the next owner
- Coordinator needs a durable summary of what changed, what was tested, and what remains risky

### Update `project/open-questions.md` when
- implementation uncovered a cross-role ambiguity or contradiction that blocks clean progress

### Developer minimum output rule
After a meaningful developer turn, at least one of these should be true:
- workstream/handoff/open-question docs updated
- explicit note that no durable coordination state changed

## QA: what to write after each meaningful validation step

### Update `coordination/handoffs.md` when
- Coordinator needs a durable go/no-go signal
- QA found a failure, caveat, or residual risk that should survive chat context

### Update `coordination/active-workstreams.md` when
- validation materially changes the perceived status or risk of a workstream

### Update `project/open-questions.md` when
- QA uncovered an unresolved product/technical ambiguity that needs a decision

### QA minimum output rule
After a meaningful QA turn, at least one of these should be true:
- handoff/workstream/open-question docs updated
- explicit note that no durable QA state changed

## Deploy: what to write after each meaningful deploy-readiness step

### Update `coordination/handoffs.md` when
- Coordinator or the user needs a durable readiness/blocker summary
- explicit approvals or missing config should survive chat context

### Update `coordination/active-workstreams.md` when
- deploy readiness materially changes the status of a release lane

### Update `project/open-questions.md` when
- release readiness depends on an unresolved cross-role decision

### Deploy minimum output rule
After a meaningful deploy turn, at least one of these should be true:
- handoff/workstream/open-question docs updated
- explicit note that no durable deploy-readiness state changed

# ShotSpot Update Rules

Use these rules to keep Coordinator and UX synchronized without over-documenting.

## Core rule

If a decision or status change in one channel would matter in another channel later, write it down immediately.

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

### Coordinator minimum output rule
After a meaningful coordination turn, at least one of these should be true:
- coordination docs updated
- explicit note that no durable coordination state changed

## Keep it lightweight

Do not write huge summaries every turn.
Prefer small precise updates:
- one decision entry
- one handoff entry
- one workstream paragraph tweak
- one task-board move

## Anti-patterns

Avoid:
- leaving accepted decisions only in chat
- updating five docs when one would do
- mixing MVP truth with task status
- treating scratch discussion as accepted project truth

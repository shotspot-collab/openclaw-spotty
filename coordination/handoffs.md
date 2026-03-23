# ShotSpot Handoffs

Use this file for short durable role-to-role handoffs when a decision or status change must survive across channels/sessions.

## Template

## YYYY-MM-DD HH:MM <from role> -> <to role>
- Task:
- Context:
- Ask:
- Files updated:
- Risks/open questions:

---

## 2026-03-23 09:15 Coordinator -> All roles
- Task: Shared-memory migration to Spotty workspace
- Context: Spotty workspace is now the primary coordination and project-memory layer. UX is a first-class specialist role. `.codex` should be treated as secondary/legacy context rather than the first read.
- Ask: Read `coordination/status.md`, `coordination/task-board.md`, `project/mvp.md`, and `project/decisions.md` before consulting repo-local task history.
- Files updated: `project/*`, `coordination/*`, `ux/*`, role skills under `skills/`
- Risks/open questions: payment-flow wording appears inconsistent between repo requirements and recent implementation/status notes; reconcile before assuming settled truth.

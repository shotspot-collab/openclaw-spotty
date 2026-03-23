# ShotSpot Decision Log

Record accepted cross-agent decisions here.

## Entry format

## YYYY-MM-DD - <decision title>
- Owner:
- Status: proposed | accepted | superseded
- Context:
- Decision:
- Impact:
- Follow-ups:

---

## 2026-03-23 - Spotty workspace is the primary coordination memory
- Owner: Coordinator
- Status: accepted
- Context: Cross-channel/session coordination was split between repo-local `.codex` files and chat-local memory, which made continuity harder and increased coupling to repo internals.
- Decision: Use `workspace-spotty` as the primary shared knowledge layer for project coordination, UX direction, task status, and handoffs. Keep the ShotSpot repo focused on code and implementation-coupled technical docs.
- Impact: Coordinator, UX, Architect, Developer, and QA should read/write Spotty workspace shared files first for project memory.
- Follow-ups: add workspace-level status/task docs, add UX role skill, and de-emphasize `.codex` as the primary coordination mechanism.

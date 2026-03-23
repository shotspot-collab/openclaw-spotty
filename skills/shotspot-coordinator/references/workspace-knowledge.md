# Spotty Workspace Knowledge Model

Use Spotty workspace as the primary shared memory layer for ShotSpot coordination.

## First reads for fresh coordination

Read these first before falling back to repo-local workflow records:
- `C:\Users\nbobb\.openclaw\workspace-spotty\coordination\status.md`
- `C:\Users\nbobb\.openclaw\workspace-spotty\coordination\task-board.md`
- `C:\Users\nbobb\.openclaw\workspace-spotty\project\mvp.md`
- `C:\Users\nbobb\.openclaw\workspace-spotty\project\decisions.md`

## Purpose split

### Spotty workspace
Use for:
- project priorities
- task coordination
- handoffs
- accepted product decisions
- UX rationale and shared flow docs
- cross-channel continuity

### ShotSpot repo
Use for:
- code
- tests
- migrations
- implementation-coupled technical docs
- technical specs that belong with the software

## Rule

If another agent/channel will need to know it later, write it into the Spotty workspace shared docs.

## `.codex` posture

Do not treat repo-local `.codex` files as the primary shared memory layer anymore.
Use them only when legacy task context must be consulted during migration or when repo-local workflow evidence is specifically needed.

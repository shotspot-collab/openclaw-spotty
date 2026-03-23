# Daily Context Commit SOP

Use this SOP to checkpoint Spotty workspace coordination memory into git at least once every 24 hours when meaningful context changed.

## Goal

Keep Spotty's shared project memory durable, reviewable, and synchronized through git commits.

## What to commit

Prioritize workspace coordination artifacts:
- `coordination/`
- `project/`
- `ux/`
- `architecture/`
- `skills/` when role instructions changed

Do not scoop unrelated temporary files or broad unreviewed changes into the commit.

## Trigger

Run when either is true:
- at least 24 hours passed since the last context checkpoint commit
- important project context changed materially (decisions, priorities, handoffs, workstreams, role instructions)

## Procedure

1. Review changed workspace files.
2. Exclude unrelated scratch/temp/unreviewed files.
3. Confirm that key updates were written to durable workspace docs.
4. Stage only the intended coordination/context files.
5. Commit with a message like:
   - `Checkpoint Spotty project context`
   - `Update Spotty workstreams and decisions`
   - `Refresh Spotty coordination context`
6. Mention the checkpoint in the next user-facing status update when relevant.

## Guardrails

- Do not auto-commit code changes from the ShotSpot repo under this SOP unless explicitly included on purpose.
- Keep the commit scoped and explainable.
- If no meaningful context changed, skip the commit.
- If git state looks confusing or risky, surface it rather than forcing a commit.

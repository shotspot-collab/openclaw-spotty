# Spotty Project Knowledge

This folder is Spotty's shared project brain for ShotSpot.

Use it for cross-session and cross-channel continuity.

## What belongs here

- MVP scope and exclusions
- accepted product decisions
- current priorities
- UX rationale and user flows
- architecture summaries for coordination
- open questions and handoffs

## What does not belong here

- implementation-only source code details that are already clear in the repo
- generated build artifacts
- secrets

## Source-of-truth split

- **Spotty workspace (`workspace-spotty/project`, `coordination`, `ux`, `architecture`)**:
  - shared memory for Coordinator, UX, Architect, Developer, QA, Deploy
  - project priorities, decisions, UX direction, handoffs, and status
- **ShotSpot repo (`ShotSpotMainApp`)**:
  - code, tests, migrations, repo-native technical specs, and implementation-coupled docs

When project-level knowledge changes in chat, write it here so other agents/channels can pick it up.

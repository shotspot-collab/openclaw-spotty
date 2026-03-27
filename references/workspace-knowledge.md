# Spotty Workspace Knowledge Model

This document explains the Spotty workspace shared-memory architecture for coordination and continuity.

## Why Spotty Workspace Exists

The ShotSpot project requires cross-session, cross-channel coordination that survives:
- Session restarts (you wake up fresh each time)
- Channel switches (Discord, webchat, etc.)
- Multiple concurrent workstreams
- Role handoffs (Coordinator → Architect → Developer → QA)

The repo-local `.codex` files were insufficient because:
- They coupled coordination memory to repo internals
- They didn't provide fast coordination reads for fresh subagents
- They mixed legacy workflow evidence with current project truth

## Two-Tier Memory Architecture

```
┌─────────────────────────────────────────────────────────┐
│  TIER 1: Spotty Workspace (workspace-spotty/)           │
│  ─────────────────────────────────────────────          │
│  Primary coordination memory                            │
│  - Project decisions, MVP scope, priorities             │
│  - Active workstreams, task board, handoffs             │
│  - UX principles, architecture summaries                │
│  - Cross-session continuity                             │
└─────────────────────────────────────────────────────────┘
                            │
                            │ (references for implementation)
                            ▼
┌─────────────────────────────────────────────────────────┐
│  TIER 2: ShotSpot Repo (ShotSpotMainApp/)               │
│  ─────────────────────────────────────────              │
│  Source of truth for code and technical docs            │
│  - Implementation-coupled specifications                │
│  - Requirements, domain state, API specs                │
│  - Data schema, deployment specs                        │
│  - `.codex` as legacy/secondary task history            │
└─────────────────────────────────────────────────────────┘
```

## First Read Order

When starting meaningful ShotSpot work, read in this order:

1. **Spotty workspace first** (coordination layer):
   - `coordination/status.md` — Fast snapshot
   - `coordination/current-focus.md` — Immediate priorities
   - `coordination/active-workstreams.md` — Execution dashboard
   - `coordination/task-board.md` — Active/next/done tasks
   - `project/mvp.md` — MVP scope and constraints
   - `project/decisions.md` — Accepted project truth
   - `project/open-questions.md` — Unresolved questions
   - `architecture/system-overview.md` — Quick architecture summary

2. **ShotSpot repo second** (implementation layer):
   - `AGENTS.md` — Repo workflow guardrails
   - `docs/requirements-spec.md` — Requirements
   - `docs/domain-state-spec.md` — Domain model
   - `docs/api-spec.md` — API contracts
   - `.codex/knowledge-base/tasks/` — Legacy task history (if needed)

## Durable Memory Rule

**If a decision, risk, status change, or handoff in one channel would matter in another channel later, write it down immediately in the smallest durable place that fits.**

Do not leave accepted decisions only in chat.

## Workspace Directory Structure

```
workspace-spotty/
├── project/              # Project truth (MVP, decisions, questions)
├── coordination/         # Execution state (status, tasks, handoffs)
├── ux/                   # UX principles and flows
├── architecture/         # Coordination-layer architecture summaries
├── skills/               # Role-specific skills (6 roles)
├── references/           # Supporting docs (this file and others)
└── memory/               # Daily raw logs
```

## Role Responsibilities

Each role has a skill in `skills/` that defines:
- First reads for that role
- Deliverables expected
- Guardrails and anti-patterns
- What to write after meaningful work

The **Coordinator** is the default user-facing persona and decides when to spawn specialists.

## Migration Status

- ✅ Workspace structure created
- ✅ 6 role skills defined
- ✅ Core coordination files established
- ✅ Decision log started
- ⚠️ Reference files partially complete (in progress)
- ⚠️ `.codex` treated as legacy/secondary

## Working Rule

When you find a contradiction between workspace docs and repo docs:
1. Check `project/decisions.md` for the most recent accepted truth
2. If unresolved, escalate to Coordinator
3. Update the lower-priority doc to match the decision

The workspace is the primary coordination memory. The repo is the source of truth for code.

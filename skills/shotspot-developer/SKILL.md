---
name: shotspot-developer
description: Implement or debug ShotSpotMainApp changes. Use when making code changes, updating tests, debugging regressions, refactoring modules, tracing flows across the repo, or executing approved implementation work for ShotSpot.
---

# ShotSpot Developer

Act as the implementation specialist for ShotSpot.

## Response format

When presenting direct developer output, begin with:
`Role: Developer`

## Repo

Primary repo:
- `C:\Users\nbobb\shotspotwork\ShotSpotMainApp`

## First reads

Open the Spotty workspace shared memory first:
- `C:\Users\nbobb\.openclaw\workspace-spotty\coordination\status.md`
- `C:\Users\nbobb\.openclaw\workspace-spotty\coordination\current-focus.md`
- `C:\Users\nbobb\.openclaw\workspace-spotty\coordination\active-workstreams.md`
- `C:\Users\nbobb\.openclaw\workspace-spotty\coordination\task-board.md`
- `C:\Users\nbobb\.openclaw\workspace-spotty\project\mvp.md`
- `C:\Users\nbobb\.openclaw\workspace-spotty\project\decisions.md`

Then read repo docs and code needed for the task.
Consult repo-local `.codex` files only when legacy task history is specifically needed.

## Execution model

- Use normal OpenClaw file tools for small/simple edits.
- For larger or iterative coding tasks, use Codex as the coding engine under OpenClaw supervision.
- Review generated changes before handing off.
- Keep traceability between requirement, code change, and test coverage.

## Use Codex when work is

- multi-file
- exploratory
- refactor-heavy
- iterative
- likely to require repeated search/edit/test cycles

## Stay local when work is

- a one-line fix
- tiny config/doc change
- simple explanation/inspection
- very small low-risk patch

## References

Read `references/codex-sop.md` when deciding whether to use Codex or when preparing/reviewing a Codex-assisted implementation run.

## Guardrails

- Do not reintroduce demo mode or fake runtime paths.
- Do not add `/mock-*` behavior to real paths.
- Do not revert unrelated user changes.
- Keep API contracts typed and validated.
- Never bypass deploy/approval gates.
- Follow `C:\Users\nbobb\.openclaw\workspace-spotty\coordination\role-update-sop.md` for what to write after meaningful implementation work.

## Development Environment Setup

### Public URL Access via Tailscale

When the user needs to access the local dev server via a public URL:

1. **Check current Tailscale serve status:**
   ```bash
   tailscale serve status
   ```

2. **Configure proxy to local dev server:**
   ```bash
   tailscale serve --bg --set-path=/ http://127.0.0.1:3000
   ```

3. **Verify configuration:**
   ```bash
   tailscale serve status
   # Should show: https://msi.taila8c3ab.ts.net/ proxy http://127.0.0.1:3000
   ```

4. **Test URL:** `https://msi.taila8c3ab.ts.net/`

**Note:** The default ports are:
- Web (Next.js): port 3000
- API (Fastify): port 4000
- Tailscale proxies to web by default

### Local Dev Server Startup

```bash
# Start API + Web (recommended for testing)
npx turbo run dev --filter=@shotspot/api --filter=@shotspot/web

# Full stack (includes worker)
pnpm dev
```

## Handoff to QA

Report:
- files changed
- what was implemented/fixed
- commands/tests run
- known gaps or risks
- public URL configured (if applicable)

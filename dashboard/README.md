# 🐾 Spotty Dashboard

A local web dashboard for monitoring Spotty's ShotSpot Factory in real time.

## What it does

1. **Subagents panel** — polls the OpenClaw gateway every 10s and lists all sessions (main + subagents) with label, model, status, runtime, and token count.
2. **Workspace file browser** — browses the Spotty workspace file tree and renders markdown inline via `marked.js`.
3. **ShotSpot Factory animation** — a 2D canvas "factory floor" showing Spotty as the coordinator/foreman, active subagents as animated worker characters with speech bubbles, idle workers resting, and a conveyor belt showing the Architect → Developer → QA → Deploy pipeline.

## Quick Start (Windows PowerShell)

```powershell
cd C:\Users\nbobb\.openclaw\workspace-spotty\dashboard
.\start.ps1
```

The script will:
- Start the **workspace file server** on `http://127.0.0.1:4445`
- Start the **dashboard HTTP server** on `http://localhost:4444`
- Open your browser automatically

Press **Ctrl+C** to stop both servers.

## Manual start (two terminals)

```powershell
# Terminal 1 — file server
node file-server.js

# Terminal 2 — dashboard
node dashboard-server.js
```

Then open `http://localhost:4444` in your browser.

## Architecture

```
browser (localhost:4444)
    │
    ├── GET /            → dashboard-server.js (static HTML/JS/CSS)
    │
    ├── WS  →  ws://127.0.0.1:18789   (OpenClaw gateway, sessions.list)
    │
    └── HTTP → http://127.0.0.1:4445  (file-server.js)
                ├── GET /tree          → workspace file tree JSON
                └── GET /file?path=… → file content JSON
```

## Files

| File | Purpose |
|------|---------|
| `index.html` | Single-page dashboard (all JS/CSS inline) |
| `dashboard-server.js` | Serves `index.html` on port 4444 |
| `file-server.js` | Serves workspace files on port 4445 |
| `start.ps1` | PowerShell startup script |
| `README.md` | This file |

## Gateway connection

The dashboard connects to `ws://127.0.0.1:18789` using the hardcoded token in `index.html`. The token must match your OpenClaw gateway config.

**Client ID used:** `openclaw-gateway-cli` with `mode: backend` — this passes the gateway's client validation requirements.

## Factory characters

| Role | Emoji | Belt position |
|------|-------|---------------|
| Coordinator (Spotty) | 🐾 | Center |
| Architect | 🏛️ | Belt start |
| Developer | 💻 | Belt station 2 |
| QA | 🔍 | Belt station 3 |
| Deploy | 🚀 | Belt end |
| UX | 🎨 | Off-belt, left |

Workers bob gently when idle, pulse with a glow ring when running, and show a speech bubble with their session label.

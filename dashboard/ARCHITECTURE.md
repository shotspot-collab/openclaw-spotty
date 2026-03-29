# Spotty Dashboard — Architecture Design

**Role: Architect**  
**Status: Final — ready for Developer handoff**

---

## Overview

A self-contained local web dashboard that runs entirely on localhost. Three panels:

1. **Subagents panel** — live list of sessions (main + subagents) from the OpenClaw gateway
2. **Workspace file browser** — file tree + markdown viewer of the Spotty workspace
3. **ShotSpot Factory animation** — 2D canvas showing roles as worker characters with a conveyor belt pipeline

---

## Runtime Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Browser  (http://localhost:4444)                            │
│                                                             │
│  ┌─────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  Subagents  │  │  File Browser    │  │  Factory       │ │
│  │  Panel      │  │  Panel           │  │  Animation     │ │
│  └──────┬──────┘  └────────┬─────────┘  └───────┬────────┘ │
│         │                  │                     │          │
│         └────────┬─────────┘                     │          │
│                  │ fetch (CORS)                   │ data     │
│                  ▼                                │ from     │
└──────────────────┼────────────────────────────────┼─────────┘
                   │                                │
     ┌─────────────▼─────────────┐                  │
     │  file-server.js            │◄─────────────────┘
     │  localhost:4445            │
     │                           │
     │  Routes:                  │
     │  GET /tree                │ → filesystem scan
     │  GET /file?path=…         │ → fs.readFileSync
     │  GET /sessions            │ → openclaw CLI subprocess
     └─────────────┬─────────────┘
                   │
     ┌─────────────▼─────────────┐
     │  openclaw gateway call    │
     │  sessions.list             │  (child_process.execSync)
     │  → 127.0.0.1:18789        │
     └────────────────────────────┘

     ┌─────────────────────────┐
     │  dashboard-server.js    │
     │  localhost:4444          │
     │  → serves index.html    │
     └─────────────────────────┘
```

---

## Data Flow — Subagents Panel

**Why CLI subprocess instead of WS:**

The OpenClaw gateway WS protocol requires device identity signing to receive `operator.read` scope. Without a valid signed device identity, scopes are stripped at connect time. The `openclaw` CLI already handles this correctly (it loads the device identity from `~/.openclaw/identity/device.json` and signs the challenge).

**Solution:** `file-server.js` calls `openclaw gateway call sessions.list` as a child process. This is proven to work (confirmed in this session). The output is JSON; the file server parses and forwards it to the browser over HTTP with CORS headers.

**Flow:**
```
Browser
  → GET http://127.0.0.1:4445/sessions   (poll every 10s)
  
file-server.js
  → child_process.execSync("openclaw gateway call sessions.list")
  → parse stdout JSON
  → extract sessions array
  → return JSON to browser

Browser
  → render Subagents panel + factory state
```

**Response shape (from confirmed sessions.list output):**
```json
{
  "ts": 1774744380229,
  "count": 43,
  "defaults": { "modelProvider": "anthropic", "model": "claude-sonnet-4-6", ... },
  "sessions": [
    {
      "key": "agent:spotty:main",
      "kind": "direct",
      "label": "Architect – Spotty Dashboard",
      "spawnedBy": "agent:spotty:main",
      "status": "running",
      "startedAt": 1774744204879,
      "endedAt": null,
      "runtimeMs": 179926,
      "modelProvider": "anthropic",
      "model": "claude-sonnet-4-6",
      "totalTokens": 92151,
      "estimatedCostUsd": 0.818,
      "childSessions": [...],
      "deliveryContext": { "channel": "webchat" }
    }
  ]
}
```

**Key fields to use:**
- `key` — unique session identifier (e.g. `agent:spotty:subagent:uuid`)
- `label` — human label set at spawn time, often contains role name
- `spawnedBy` — present on subagents; absent on main session
- `status` — `"running"` | `"done"` | `"error"` | `"idle"`
- `model` — full model name (shorten for display)
- `startedAt` / `runtimeMs` — for elapsed time display
- `totalTokens` / `estimatedCostUsd` — optional cost display

**Role inference from label:**
The session `label` field (set by the coordinator at spawn time) contains the role name. Examples seen:
- `"Architect – Spotty Dashboard"` → Architect
- `"Developer: implement storage signer"` → Developer
- Match order: Architect, Developer, QA, Deploy, UX, Coordinator

---

## Data Flow — Workspace File Browser

**File server** runs on `localhost:4445` and serves two endpoints:

### `GET /tree`
Returns the workspace directory tree as JSON. Excludes:
- `dashboard/` folder (never shown in browser)
- Hidden dotfiles (except top-level `AGENTS.md` etc.)
- Non-markdown/non-text files

**Response:**
```json
{
  "tree": [
    { "type": "file", "name": "AGENTS.md", "path": "AGENTS.md" },
    {
      "type": "dir", "name": "coordination", "path": "coordination",
      "children": [
        { "type": "file", "name": "status.md", "path": "coordination/status.md" },
        ...
      ]
    }
  ]
}
```

### `GET /file?path=<relPath>`
Returns file contents as JSON. Path is validated to stay within workspace root and never serve `dashboard/`.

**Response:**
```json
{ "path": "coordination/status.md", "content": "# ShotSpot Coordination Status\n..." }
```

**Browser renders** `content` via `marked.js` (CDN loaded) into a styled div.

---

## Factory Animation Design

### Layout (canvas, fills panel)

```
┌────────────────────────────────────────────────────────────┐
│             SHOTSPOT FACTORY (dim title text)              │
│                                                            │
│    🏛️ Architect ──────────────────────────── 🚀 Deploy     │
│        (belt start)    conveyor belt         (belt end)    │
│              ↓                     ↑                       │
│          📋 packages              📋                        │
│              ↓                                             │
│         🐾 SPOTTY (Coordinator, center, large)             │
│                                                            │
│    🎨 UX        💻 Developer ────→ 🔍 QA                   │
│   (off-belt)    (belt mid)        (belt mid)               │
└────────────────────────────────────────────────────────────┘
```

### Worker positions (as fraction of canvas W×H)

| Role        | Emoji | x    | y    | Notes              |
|-------------|-------|------|------|--------------------|
| Coordinator | 🐾    | 0.50 | 0.45 | Center, large (r=34)|
| Architect   | 🏛️    | 0.18 | 0.30 | Belt start          |
| Developer   | 💻    | 0.38 | 0.62 | Belt mid            |
| QA          | 🔍    | 0.58 | 0.62 | Belt mid            |
| Deploy      | 🚀    | 0.78 | 0.30 | Belt end            |
| UX          | 🎨    | 0.18 | 0.68 | Off-belt, bottom    |

### Conveyor belt path (waypoints in order)
```
Architect (0.18, 0.30) → Developer (0.38, 0.62) → QA (0.58, 0.62) → Deploy (0.78, 0.30)
```

Drawn as a thick rounded polyline with animated stripe dashes scrolling along it. Belt packages (📦 emoji boxes) travel along the path when the upstream role is `running`.

### Worker states

| State    | Visual                                                    |
|----------|-----------------------------------------------------------|
| `idle`   | Dim border, gentle sine-wave bob (3px amplitude, 1.2 Hz) |
| `running`| Colored border + pulsing outer ring + glow halo           |
| `done`   | Muted grey border, no animation                           |
| `error`  | Red border, static                                        |

### Speech bubbles
- Appear above the worker circle when `status === 'running'`
- Show `session.label` truncated to ~22 chars
- Rounded rect with small triangular tail pointing down
- Border color matches the worker's role color

### Belt packages
- Appear between two belt stations when the source role is `running`
- Travel from source to destination over ~30 seconds (progress += 0.002/frame at 60fps)
- Rendered as small rounded squares with 📦
- Reset to start when source goes idle

---

## File / Folder Layout

```
dashboard/
  index.html            ← Single-page app (all JS/CSS inline)
  dashboard-server.js   ← HTTP static server on port 4444
  file-server.js        ← Proxy + file API server on port 4445
  start.ps1             ← PowerShell startup script
  ARCHITECTURE.md       ← This document
  IMPLEMENTATION.md     ← Developer brief
  README.md             ← Usage guide
```

---

## Startup Script (`start.ps1`)

1. Kill any existing listeners on 4444 and 4445 (`netstat -ano` + `Stop-Process`)
2. Start `node file-server.js` in background (hidden window, log to `file-server.log`)
3. Start `node dashboard-server.js` in background (hidden window, log to `dashboard.log`)
4. Wait 800ms, probe both servers
5. Open `http://localhost:4444` in default browser
6. Wait for Ctrl+C, then stop both processes

---

## Security Notes

- All servers bind to `127.0.0.1` only — never `0.0.0.0`
- File server validates all paths stay within workspace root
- File server never serves `dashboard/` contents
- Gateway auth token hardcoded for local-only use (acceptable for localhost dashboard)
- No persistent data; all state is ephemeral in-memory

---

## Constraints Respected

| Constraint | How met |
|------------|---------|
| No build pipeline | Plain HTML + vanilla JS, CDN-loaded marked.js |
| No npm installs | Only uses Node.js built-ins (http, fs, path, child_process) |
| Works on Windows | PowerShell startup script, `child_process.execSync` with `openclaw` on PATH |
| No heavy 3D | Canvas 2D API only |
| No React | Zero framework dependencies |
| Dashboard excluded from file browser | Explicit path exclusion in file-server.js |

# Spotty Dashboard — Implementation Brief

**Role: Architect → Developer handoff**  
**Status: Ready for implementation**

---

## What to build

Three files need to be fully implemented:

1. `file-server.js` — Node.js HTTP server (port 4445)
2. `dashboard-server.js` — Node.js static HTTP server (port 4444)
3. `index.html` — Single-page dashboard app

Plus `start.ps1` for startup.

Stubs/skeletons already exist in the dashboard folder. This brief describes exactly what each must do.

---

## 1. `file-server.js`

**Port:** `4445`  
**Bind:** `127.0.0.1` only  
**Dependencies:** Node.js built-ins only (`http`, `fs`, `path`, `child_process`)

### Routes

#### `OPTIONS *`
Return 204 with CORS headers. Required for browser preflight.

**CORS headers** (all responses):
```
Access-Control-Allow-Origin: http://localhost:4444
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

#### `GET /tree`
Walk the workspace root (`path.resolve(__dirname, '..')`) and return the file tree as JSON.

**Rules:**
- Never include `dashboard/` folder
- At root level: only include dirs in `['coordination', 'project', 'memory', 'ux', 'skills', 'architecture', 'references']`
- At root level: only include files in `['AGENTS.md', 'SOUL.md', 'TOOLS.md', 'IDENTITY.md', 'USER.md', 'HEARTBEAT.md', 'MEMORY.md']`
- Within allowed dirs: include all `.md`, `.json`, `.txt` files
- Skip hidden files/dirs (names starting with `.`)
- Skip `node_modules/`
- Recurse fully into allowed dirs

**Response:**
```json
{
  "tree": [
    { "type": "file", "name": "AGENTS.md", "path": "AGENTS.md" },
    {
      "type": "dir", "name": "coordination", "path": "coordination",
      "children": [
        { "type": "file", "name": "status.md", "path": "coordination/status.md" }
      ]
    }
  ]
}
```

#### `GET /file?path=<relPath>`
Read and return a single file's content.

**Security:** Resolve the path with `path.resolve(WORKSPACE_ROOT, relPath)` and verify:
1. Result starts with `WORKSPACE_ROOT + path.sep` (path traversal guard)
2. Result does not start with the `dashboard/` path
3. File exists and is a regular file

**Response:**
```json
{ "path": "coordination/status.md", "content": "# ShotSpot Coordination Status\n..." }
```

**Error responses:**
```json
{ "error": "Path not allowed" }   // 403
{ "error": "File not found" }     // 404
{ "error": "Missing path param" } // 400
```

#### `GET /sessions`
Get live session data from the OpenClaw gateway via the `openclaw` CLI.

**Implementation:**
```javascript
const { execSync } = require('child_process');

function getSessions() {
  try {
    const stdout = execSync('openclaw gateway call sessions.list', {
      timeout: 10000,
      encoding: 'utf8',
      // Skip the first line "Gateway call: sessions.list"
    });
    // stdout format:
    // Gateway call: sessions.list\n
    // { "ts": ..., "sessions": [...] }
    const jsonStart = stdout.indexOf('{');
    if (jsonStart === -1) return { sessions: [], error: 'no JSON in output' };
    const data = JSON.parse(stdout.slice(jsonStart));
    return { sessions: data.sessions || [], ts: data.ts, count: data.count };
  } catch (err) {
    return { sessions: [], error: err.message };
  }
}
```

**Caching:** Cache the result for up to 8 seconds. If a cached result exists and is <8s old, return it immediately without re-running the CLI. This prevents hammering the CLI on every browser poll.

**Response:**
```json
{
  "sessions": [...],
  "ts": 1774744380229,
  "count": 43,
  "cachedAt": 1774744380000
}
```

**Error case (gateway down etc.):**
```json
{ "sessions": [], "error": "spawn openclaw ENOENT", "cachedAt": null }
```

### Full server structure

```javascript
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 4445;
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
// ... routes as above ...

const server = http.createServer((req, res) => {
  // OPTIONS → CORS preflight
  // /tree   → buildTree()
  // /file   → readFile()
  // /sessions → getSessions() with cache
  // else 404
});

server.listen(PORT, '127.0.0.1', () => { ... });
```

---

## 2. `dashboard-server.js`

**Port:** `4444`  
**Bind:** `127.0.0.1` only  
**Purpose:** Serve `index.html` and any co-located static assets  
**Dependencies:** Node.js built-ins only (`http`, `fs`, `path`)

Simple static file server:
- Map `GET /` → `index.html`
- Map `GET /<file>` → `dashboard/<file>` (if it exists and is within `__dirname`)
- Set `Cache-Control: no-store` on all responses
- MIME types: `.html` → `text/html`, `.js` → `text/javascript`, `.css` → `text/css`
- 404 for anything not found; 403 for path traversal attempts

---

## 3. `index.html`

**Served from:** `http://localhost:4444/`  
**Dependencies:** `marked.js` from CDN, vanilla JS, inline CSS  
**No build step required**

### Panel layout (CSS Grid)

```
┌──────────────────────────────────────────────────────┐
│  header: 🐾 Spotty Dashboard        [status] [time]  │
├──────────────────────────────────────┬───────────────┤
│  Subagents Panel (left, top)         │               │
│  320px wide                          │  Factory      │
├──────────────────────────────────────┤  Panel        │
│  File Browser Panel (left, bottom)   │  (right,      │
│  320px wide                          │  full height) │
└──────────────────────────────────────┴───────────────┘
```

**Grid:**
```css
.panels {
  display: grid;
  grid-template-columns: 320px 1fr;
  grid-template-rows: 1fr 1fr;
}
.panel-factory {
  grid-row: 1 / 3;      /* spans both rows */
  grid-column: 2;
}
```

### Subagents Panel

**Data fetch:**
```javascript
async function fetchSessions() {
  const r = await fetch('http://127.0.0.1:4445/sessions');
  const data = await r.json();
  return data.sessions || [];
}
```

**Poll:** Call `fetchSessions()` every 10 seconds via `setInterval`.

**Rendering:** For each session, render a card showing:
- Label: `session.label || session.displayName || session.key`
- Role badge (inferred from label: Architect/Developer/QA/Deploy/UX/Coordinator)
- Status pill: running (green) / done (grey) / error (red) / idle (yellow)
- Model: `session.model` shortened (strip `claude-`, `gemini-`, etc.)
- Runtime: `session.runtimeMs` formatted as `Xs` or `Xm Ys`; for running sessions use `Date.now() - session.startedAt`
- Token count: `(session.totalTokens / 1000).toFixed(1) + 'k'` if present

**Ordering:** Main session first (no `spawnedBy`), then subagents sorted by `startedAt` descending.

**Show at most 25 cards.** Cap the list.

**Role inference:**
```javascript
function inferRole(session) {
  const label = (session.label || session.displayName || session.key || '').toLowerCase();
  if (label.includes('architect'))  return 'Architect';
  if (label.includes('developer') || label.includes(' dev')) return 'Developer';
  if (label.includes(' qa') || label.includes('test'))  return 'QA';
  if (label.includes('deploy'))     return 'Deploy';
  if (label.includes(' ux') || label.includes('design')) return 'UX';
  if (label.includes('coordinator') || (session.key||'').endsWith(':main')) return 'Coordinator';
  return null;
}
```

### File Browser Panel

**Layout:**
- Left column (160px): scrollable file tree
- Right column (flex 1): markdown rendered content

**File tree:**
- `GET http://127.0.0.1:4445/tree` on page load
- Render tree items recursively
- Directories: click to expand/collapse (toggle `display:none` on children)
- Files: click to load content
- Selected file highlighted with accent color

**File content:**
- `GET http://127.0.0.1:4445/file?path=<encodeURIComponent(relPath)>`
- Render `data.content` with `marked.parse(data.content)`
- Insert result into `.md-content` div
- Show loading indicator while fetching

**Do not** auto-reload file content on poll — only reload when user clicks.

### Factory Animation (Canvas)

**Setup:**
```javascript
const canvas = document.getElementById('factory');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  canvas.width  = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
```

**Animation loop:** `requestAnimationFrame` — target 60fps.

**State update:** `factoryState` object updated when sessions are fetched. The draw loop reads from `factoryState` — no re-fetching in the draw loop.

#### Draw order per frame

1. **Clear + grid background**
   - Fill with `#0a0c10`
   - Draw subtle 40px grid lines at `rgba(255,255,255,0.03)`

2. **Dim title text**
   - `'SHOTSPOT FACTORY'` in large, very low-opacity font in center-top area

3. **Conveyor belt track**
   - Thick rounded polyline connecting Architect → Developer → QA → Deploy
   - Dark grey fill (`#1e2535`), 18px wide, rounded caps
   - Animated scrolling stripes (offset increases with `timestamp`)
   - Thin accent-color edge glow on top

4. **Belt stage labels**
   - Small text between stations: `→ Dev`, `→ QA`, `→ Deploy`

5. **Belt packages** (📦 boxes traveling the belt)
   - Each active upstream role spawns one package
   - `progress` increments by `0.002` per frame; reset when source goes idle
   - Position computed by interpolating along the belt polyline at `progress * totalLength`

6. **Workers** (drawn last, on top of belt)
   - For each role: draw platform circle + emoji + name label
   - Running: glow halo + pulsing ring + speech bubble
   - Idle: gentle bob animation (sin wave on y offset)
   - Error: red border

#### Belt geometry helpers needed

```javascript
// Total length of the polyline
function beltLength(points) { ... }

// Point at distance d along polyline
function pointAtDistance(points, d) { ... }

// Rounded rectangle path helper
function roundRect(ctx, x, y, w, h, r) { ... }
```

#### Worker → session mapping

Called each time `fetchSessions()` returns new data:

```javascript
function updateFactoryState(sessions) {
  const roleMap = {};  // role name → {status, session}
  
  sessions.forEach(s => {
    const role = inferRole(s);
    if (!role) return;
    // Running takes priority over done/idle
    if (s.status === 'running' || !roleMap[role]) {
      roleMap[role] = { status: s.status || 'idle', session: s };
    }
  });

  factoryState.workers = Object.entries(ROLES).map(([name, def]) => ({
    name, ...def,
    status: roleMap[name]?.status || 'idle',
    session: roleMap[name]?.session || null,
  }));
}
```

#### Tooltip on hover

- `mousemove` event on canvas
- Check distance from cursor to each worker center (< 36px radius)
- Show `#tooltip` div with worker name + status + model + runtime
- Hide on `mouseleave`

### Polling & refresh

```javascript
// On load
fetchSessions().then(updateUI);
loadFileTree();

// Every 10s
setInterval(() => fetchSessions().then(updateUI), 10_000);

function updateUI(sessions) {
  renderAgentCards(sessions);
  updateFactoryState(sessions);   // factory re-reads on next draw frame
}
```

No WebSocket needed in the browser. All gateway data comes via HTTP proxy from `file-server.js`.

---

## 4. `start.ps1`

Already designed. Key points:
- Use `netstat -ano` to find and kill existing listeners on 4444/4445 before starting
- Start both servers with `Start-Process node ... -PassThru -WindowStyle Hidden`
- Redirect stdout/stderr to `*.log` files in the dashboard dir
- Wait 800ms then probe both ports with `Invoke-WebRequest`
- Open browser with `Start-Process "http://localhost:4444"`
- `Wait-Process` then clean up on Ctrl+C

---

## Known Constraints & Edge Cases

| Situation | Handling |
|-----------|----------|
| Gateway offline | `/sessions` returns `{sessions:[], error:"..."}`. Browser shows "Gateway offline" state in subagents panel. Factory shows all workers idle. |
| openclaw not on PATH | `execSync` throws. Catch and return error JSON. Log to stderr. |
| File server down | Browser fetch fails. File browser shows "File server offline" message. Subagents panel shows "Loading…" and retries next poll. |
| Large workspace | `buildTree` is synchronous — acceptable for a workspace of this size (<100 files). |
| Windows path separators | Use `path.join`/`path.resolve` everywhere; normalize to forward slashes in API responses. |
| Canvas resize | `resizeCanvas()` on `window.resize`. Factory re-draws at new size next frame. |
| Sessions list grows large | Cap rendering at 25 cards. Gateway returns up to 43 by default. |
| Multiple same-role sessions | Running takes priority; otherwise first seen. |

---

## Color Palette Reference

```javascript
const COLORS = {
  bg:       '#0d0f14',
  bg2:      '#141720',
  bg3:      '#1c2030',
  border:   '#2a2f42',
  accent:   '#6c8eff',
  success:  '#3ecf8e',
  warn:     '#f5c842',
  danger:   '#ff5c5c',
  muted:    '#6b7280',
  text:     '#e2e8f0',
  text2:    '#9ca3af',
};

const ROLE_COLORS = {
  Coordinator: '#6c8eff',
  Architect:   '#f5c842',
  Developer:   '#3ecf8e',
  QA:          '#ff8c42',
  Deploy:      '#c084fc',
  UX:          '#fb7185',
};
```

---

## Acceptance Criteria

- [ ] `start.ps1` starts both servers cleanly and opens the browser
- [ ] Subagents panel renders session cards, auto-refreshes every 10s
- [ ] Running sessions show green status pill and live runtime counter
- [ ] File tree loads on startup and expands/collapses on click
- [ ] Clicking a file renders its markdown content
- [ ] `dashboard/` folder never appears in the file tree
- [ ] Factory canvas renders all 6 worker characters at defined positions
- [ ] Belt draws between Architect → Developer → QA → Deploy
- [ ] Running workers show glow + speech bubble with session label
- [ ] Idle workers animate with gentle bob
- [ ] Belt packages travel for running upstream roles
- [ ] Tooltip appears on worker hover
- [ ] All servers bind to `127.0.0.1` only
- [ ] No npm, no build step — runs directly with `node`

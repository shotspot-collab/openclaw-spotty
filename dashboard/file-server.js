/**
 * Spotty Dashboard — Workspace File Server + Gateway Proxy
 * Port: 4445 (127.0.0.1 only)
 *
 * Routes:
 *   GET /tree              → workspace file tree JSON
 *   GET /file?path=…       → file contents JSON
 *   GET /sessions          → gateway sessions.list via openclaw CLI subprocess
 *   OPTIONS *              → CORS preflight
 */

'use strict';

const http         = require('http');
const fs           = require('fs');
const path         = require('path');
const { execSync } = require('child_process');

const PORT           = 4445;
const WORKSPACE_ROOT = path.resolve(__dirname, '..');
const DASHBOARD_DIR  = __dirname;

// ─── Allowed root-level dirs/files ───────────────────────────────────────
const ALLOWED_DIRS = new Set([
  'coordination', 'project', 'memory', 'ux',
  'skills', 'architecture', 'references',
]);
const ALLOWED_ROOT_FILES = new Set([
  'AGENTS.md', 'SOUL.md', 'TOOLS.md', 'IDENTITY.md',
  'USER.md', 'HEARTBEAT.md', 'MEMORY.md',
]);

// ─── Sessions cache ───────────────────────────────────────────────────────
const SESSIONS_CACHE_MS = 8_000;
let sessionsCache = null;  // { data, fetchedAt }

// ═══════════════════════════════════════════════════════════════════════════
//  CORS
// ═══════════════════════════════════════════════════════════════════════════
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, code, data) {
  setCors(res);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// ═══════════════════════════════════════════════════════════════════════════
//  FILE TREE
// ═══════════════════════════════════════════════════════════════════════════
function buildTree(dir, relBase) {
  const entries = [];
  let items;
  try { items = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return entries; }

  for (const item of items) {
    // Skip hidden items and node_modules
    if (item.name.startsWith('.')) continue;
    if (item.name === 'node_modules') continue;

    const relPath = relBase ? `${relBase}/${item.name}` : item.name;

    if (item.isDirectory()) {
      // Root-level: only allowed dirs; never dashboard/
      if (relBase === '' && !ALLOWED_DIRS.has(item.name)) continue;

      entries.push({
        type: 'dir',
        name: item.name,
        path: relPath,
        children: buildTree(path.join(dir, item.name), relPath),
      });
    } else if (item.isFile()) {
      // Root-level: only whitelisted files
      if (relBase === '' && !ALLOWED_ROOT_FILES.has(item.name)) continue;
      // Only text file types
      if (!/\.(md|json|txt)$/i.test(item.name)) continue;

      entries.push({ type: 'file', name: item.name, path: relPath });
    }
  }

  // Dirs first, then files, each alphabetical
  entries.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return entries;
}

function handleTree(res) {
  const tree = buildTree(WORKSPACE_ROOT, '');
  sendJson(res, 200, { tree });
}

// ═══════════════════════════════════════════════════════════════════════════
//  FILE CONTENT
// ═══════════════════════════════════════════════════════════════════════════
function safeResolve(relPath) {
  // Normalize separators
  const clean = relPath.replace(/\\/g, '/');
  const abs   = path.resolve(WORKSPACE_ROOT, clean);

  // Must stay within workspace
  if (!abs.startsWith(WORKSPACE_ROOT + path.sep) && abs !== WORKSPACE_ROOT) return null;
  // Never serve dashboard/ contents
  if (abs.startsWith(DASHBOARD_DIR + path.sep) || abs === DASHBOARD_DIR) return null;

  return abs;
}

function handleFile(url, res) {
  const relPath = url.searchParams.get('path') || '';
  if (!relPath) return sendJson(res, 400, { error: 'Missing path param' });

  const abs = safeResolve(relPath);
  if (!abs) return sendJson(res, 403, { error: 'Path not allowed' });

  let stat;
  try { stat = fs.statSync(abs); } catch { return sendJson(res, 404, { error: 'File not found' }); }
  if (!stat.isFile()) return sendJson(res, 404, { error: 'Not a file' });

  let content;
  try { content = fs.readFileSync(abs, 'utf8'); }
  catch (e) { return sendJson(res, 500, { error: `Read error: ${e.message}` }); }

  sendJson(res, 200, { path: relPath, content });
}

// ═══════════════════════════════════════════════════════════════════════════
//  SESSIONS (gateway proxy via openclaw CLI)
// ═══════════════════════════════════════════════════════════════════════════
function fetchSessionsFromGateway() {
  try {
    const stdout = execSync('openclaw gateway call sessions.list', {
      timeout: 10_000,
      encoding: 'utf8',
      windowsHide: true,
    });

    // stdout starts with "Gateway call: sessions.list\n" then JSON
    const jsonStart = stdout.indexOf('{');
    if (jsonStart === -1) {
      console.error('[file-server] sessions.list: no JSON in output:', stdout.slice(0, 200));
      return { sessions: [], error: 'No JSON in CLI output', ts: Date.now() };
    }

    const data = JSON.parse(stdout.slice(jsonStart));
    return {
      sessions: data.sessions || [],
      ts:       data.ts || Date.now(),
      count:    data.count || 0,
    };
  } catch (err) {
    console.error('[file-server] sessions.list failed:', err.message);
    return { sessions: [], error: err.message, ts: Date.now() };
  }
}

function handleSessions(res) {
  const now = Date.now();

  // Serve from cache if fresh enough
  if (sessionsCache && (now - sessionsCache.fetchedAt) < SESSIONS_CACHE_MS) {
    return sendJson(res, 200, { ...sessionsCache.data, cachedAt: sessionsCache.fetchedAt });
  }

  const data = fetchSessionsFromGateway();
  sessionsCache = { data, fetchedAt: now };
  sendJson(res, 200, { ...data, cachedAt: now });
}

// ═══════════════════════════════════════════════════════════════════════════
//  HTTP SERVER
// ═══════════════════════════════════════════════════════════════════════════
const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    setCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  let url;
  try { url = new URL(req.url, `http://localhost:${PORT}`); }
  catch { sendJson(res, 400, { error: 'Bad URL' }); return; }

  const { pathname } = url;

  if (pathname === '/tree')     return handleTree(res);
  if (pathname === '/file')     return handleFile(url, res);
  if (pathname === '/sessions') return handleSessions(res);

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[file-server] Spotty workspace file server on http://127.0.0.1:${PORT}`);
  console.log(`[file-server] Workspace root: ${WORKSPACE_ROOT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[file-server] Port ${PORT} already in use.`);
    process.exit(1);
  }
  throw err;
});

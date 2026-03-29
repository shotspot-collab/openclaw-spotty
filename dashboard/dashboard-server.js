/**
 * Spotty Dashboard – Static HTTP Server
 * Serves the dashboard HTML/JS/CSS on localhost:4444
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4444;
const DASHBOARD_DIR = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.png':  'image/png',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  let urlPath = new URL(req.url, `http://localhost:${PORT}`).pathname;
  if (urlPath === '/') urlPath = '/index.html';

  const filePath = path.join(DASHBOARD_DIR, urlPath);
  // Safety: must stay within dashboard dir
  if (!filePath.startsWith(DASHBOARD_DIR + path.sep) && filePath !== DASHBOARD_DIR) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404); res.end('Not found'); return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime, 'Cache-Control': 'no-store' });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[dashboard] Spotty Dashboard running at http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[dashboard] Port ${PORT} already in use. Is another dashboard running?`);
    process.exit(1);
  }
  throw err;
});

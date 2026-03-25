/**
 * MVP — Static + REST HTTP Server (server/server.js)
 * ====================================================
 * Usage:  node server/server.js [port]
 *         PORT=3000 node server/server.js
 *
 * Zero dependencies — uses only Node.js built-ins: http, fs, path, url.
 *
 * Serves:
 *   /store/*  → store/
 *   /admin/*  → admin/
 *   /data/*   → data/        (static JSON + images)
 *   /shared/* → shared/
 *   /api/*    → router.js    (REST API)
 *   /         → store/index.html
 */

'use strict';

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const { URL }= require('url');

const { handleApiRequest } = require('./router');

// ── Config ────────────────────────────────────────────────────────────────
const PORT    = parseInt(process.env.PORT || process.argv[2] || '3000', 10);
const ROOT    = path.resolve(__dirname, '..');  // MVP/
const STORE   = path.join(ROOT, 'store');
const ADMIN   = path.join(ROOT, 'admin');
const DATA    = path.join(ROOT, 'data');
const SHARED  = path.join(ROOT, 'shared');

// ── MIME types ─────────────────────────────────────────────────────────────
const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.json': 'application/json',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.txt':  'text/plain',
    '.webmanifest': 'application/manifest+json',
};

// ── Static file sender ──────────────────────────────────────────────────────
function sendFile(res, filePath) {
    if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found: ' + filePath);
    }

    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    const stat = fs.statSync(filePath);

    res.writeHead(200, {
        'Content-Type':   mime,
        'Content-Length': stat.size,
        'Cache-Control':  'no-cache',
    });

    fs.createReadStream(filePath).pipe(res);
}

// ── Route → directory mapping ────────────────────────────────────────────────
function resolveStaticPath(urlPathname) {
    // /  or  /store  or  /store/...
    if (urlPathname === '/' || urlPathname === '') {
        return path.join(STORE, 'index.html');
    }
    if (urlPathname.startsWith('/store')) {
        const rel = urlPathname.slice('/store'.length) || '/index.html';
        const p   = path.join(STORE, rel);
        // Directory → index.html
        if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
            return path.join(p, 'index.html');
        }
        return p;
    }
    if (urlPathname.startsWith('/admin')) {
        const rel = urlPathname.slice('/admin'.length) || '/index.html';
        const p   = path.join(ADMIN, rel);
        if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
            return path.join(p, 'index.html');
        }
        return p;
    }
    if (urlPathname.startsWith('/data/')) {
        // Prevent path traversal
        const rel = urlPathname.slice('/data/'.length);
        const p   = path.normalize(path.join(DATA, rel));
        if (!p.startsWith(DATA)) return null; // Security: block traversal
        return p;
    }
    if (urlPathname.startsWith('/shared/')) {
        const rel = urlPathname.slice('/shared/'.length);
        const p   = path.normalize(path.join(SHARED, rel));
        if (!p.startsWith(SHARED)) return null;
        return p;
    }
    return null;
}

// ── Request handler ─────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
    let parsedUrl;
    try {
        parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    } catch {
        res.writeHead(400); res.end('Bad Request');
        return;
    }

    const urlPath = parsedUrl.pathname;

    console.log(`[${req.method}] ${urlPath}`);

    // ── REST API
    if (urlPath.startsWith('/api/')) {
        return handleApiRequest(req, res, urlPath);
    }

    // ── Static files (GET only)
    if (req.method !== 'GET') {
        res.writeHead(405); res.end('Method Not Allowed');
        return;
    }

    const filePath = resolveStaticPath(urlPath);

    if (!filePath) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        return res.end('404 Not Found');
    }

    sendFile(res, filePath);
});

// ── Start ───────────────────────────────────────────────────────────────────
server.listen(PORT, () => {
    console.log('\n╔══════════════════════════════════════╗');
    console.log(`║  MVP Server running                  ║`);
    console.log(`║  Store  →  http://localhost:${PORT}/store  ║`);
    console.log(`║  Admin  →  http://localhost:${PORT}/admin  ║`);
    console.log(`║  API    →  http://localhost:${PORT}/api    ║`);
    console.log('╚══════════════════════════════════════╝\n');
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌  Port ${PORT} is already in use. Try: node server/server.js ${PORT + 1}`);
    } else {
        console.error('Server error:', err);
    }
    process.exit(1);
});

module.exports = server; // for testing

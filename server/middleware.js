/**
 * MVP — Middleware (server/middleware.js)
 * ========================================
 * CORS, request parsing, auth token validation,
 * and multi-tenant isolation helpers.
 * Zero dependencies — pure Node.js.
 */

'use strict';

const path = require('path');
const fs   = require('fs');

// ── Configuration ──────────────────────────────────────────────────────────
const ADMIN_SECRET = process.env.MVP_SECRET || 'admin';  // change in production
const DATA_DIR     = path.resolve(__dirname, '..', 'data');

// Simple in-memory token store: { token: { storeId, exp } }
const _tokens = new Map();

// ── CORS ────────────────────────────────────────────────────────────────────
/**
 * Attach CORS headers to every response.
 * For production restrict `origin` to your actual domain.
 */
function cors(req, res) {
    res.setHeader('Access-Control-Allow-Origin',  '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Store-Id');
    res.setHeader('Access-Control-Max-Age',       '86400');
}

/**
 * Handle preflight OPTIONS and apply CORS headers.
 * Returns true if the request was a preflight (already handled).
 */
function handleCors(req, res) {
    cors(req, res);
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return true;
    }
    return false;
}

// ── Request body parser ────────────────────────────────────────────────────
/**
 * Reads and parses the request body as JSON.
 * @returns {Promise<any>}
 */
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', chunk => { raw += chunk; });
        req.on('end',  ()    => {
            if (!raw.trim()) return resolve({});
            try { resolve(JSON.parse(raw)); }
            catch { reject(new Error('Invalid JSON body')); }
        });
        req.on('error', reject);
    });
}

// ── Token helpers ───────────────────────────────────────────────────────────
/**
 * Issue a session token for a given storeId.
 * Tokens expire after `ttl` ms (default 8 hours).
 */
function issueToken(storeId, ttl = 8 * 60 * 60 * 1000) {
    const token = 'mvp-' + Buffer.from(`${storeId}:${Date.now()}:${Math.random()}`).toString('base64').slice(0, 32);
    _tokens.set(token, { storeId, exp: Date.now() + ttl });
    return token;
}

/** Verify a Bearer token. Returns { storeId } or null. */
function verifyToken(req) {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return null;
    const entry = _tokens.get(token);
    if (!entry) return null;
    if (Date.now() > entry.exp) { _tokens.delete(token); return null; }
    return entry;
}

/**
 * Auth middleware — rejects requests without a valid token.
 * Returns the decoded { storeId } or sends 401 and returns null.
 */
function requireAuth(req, res) {
    const entry = verifyToken(req);
    if (!entry) {
        sendJSON(res, 401, { error: 'Unauthorized — token missing or expired' });
        return null;
    }
    return entry;
}

// ── Multi-tenant isolation ────────────────────────────────────────────────
/**
 * Returns the data directory for a given storeId.
 * Validates the storeId to prevent path traversal.
 */
function storeDataPath(storeId, filename) {
    if (!/^[a-z0-9_-]+$/i.test(storeId)) throw new Error('Invalid storeId');
    return path.join(DATA_DIR, storeId, filename);
}

/**
 * Checks that the requesting token's storeId matches the URL storeId.
 * Prevents store A from reading store B's data.
 */
function requireStoreMatch(auth, urlStoreId, res) {
    if (auth.storeId !== urlStoreId) {
        sendJSON(res, 403, { error: 'Forbidden — storeId mismatch' });
        return false;
    }
    return true;
}

/** Read a JSON data file; returns default if missing or invalid. */
function readData(storeId, filename, def = []) {
    try {
        const filePath = storeDataPath(storeId, filename);
        if (!fs.existsSync(filePath)) return def;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch { return def; }
}

/** Write JSON data file atomically via temp rename. */
function writeData(storeId, filename, data) {
    const filePath = storeDataPath(storeId, filename);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const tmp = filePath + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
}

// ── Response helpers ────────────────────────────────────────────────────────
function sendJSON(res, status, data) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
    });
    res.end(body);
}

function send404(res) {
    sendJSON(res, 404, { error: 'Not found' });
}

function send500(res, err) {
    console.error('[MVP] 500:', err?.message || err);
    sendJSON(res, 500, { error: err?.message || 'Internal server error' });
}

function methodNotAllowed(res) {
    sendJSON(res, 405, { error: 'Method not allowed' });
}

// ── License check helper ────────────────────────────────────────────────────
function getLicense(storeId) {
    try {
        const licensePath = path.join(DATA_DIR, 'licenses.json');
        if (!fs.existsSync(licensePath)) return { active: false };
        const licenses = JSON.parse(fs.readFileSync(licensePath, 'utf8'));
        return licenses[storeId] || { active: false };
    } catch { return { active: false }; }
}

// ── Exports ─────────────────────────────────────────────────────────────────
module.exports = {
    handleCors,
    parseBody,
    issueToken,
    verifyToken,
    requireAuth,
    requireStoreMatch,
    storeDataPath,
    readData,
    writeData,
    sendJSON,
    send404,
    send500,
    methodNotAllowed,
    getLicense,
    ADMIN_SECRET,
    DATA_DIR,
};

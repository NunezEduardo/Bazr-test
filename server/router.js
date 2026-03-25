/**
 * MVP — REST Router (server/router.js)
 * ======================================
 * All API routes. Called by server.js for any request matching /api/*
 *
 * Routes:
 *   POST   /api/auth/login
 *   GET    /api/licenses/:storeId
 *
 *   GET    /api/:storeId/products
 *   POST   /api/:storeId/products
 *   PUT    /api/:storeId/products
 *   DELETE /api/:storeId/products/:id
 *
 *   GET    /api/:storeId/categories
 *   POST   /api/:storeId/categories
 *   PUT    /api/:storeId/categories
 *   DELETE /api/:storeId/categories/:id
 *
 *   GET    /api/:storeId/orders
 *   POST   /api/:storeId/orders
 *   PUT    /api/:storeId/orders
 *   POST   /api/:storeId/orders/:id/status
 *   DELETE /api/:storeId/orders
 *
 *   GET    /api/:storeId/payment-methods
 *   POST   /api/:storeId/payment-methods
 *   PUT    /api/:storeId/payment-methods
 *   DELETE /api/:storeId/payment-methods/:id
 *
 *   GET    /api/:storeId/config
 *   PUT    /api/:storeId/config
 *
 *   POST   /api/:storeId/images
 */

'use strict';

const path = require('path');
const fs   = require('fs');
const mw   = require('./middleware');

// ── Route Dispatcher ────────────────────────────────────────────────────────
/**
 * Main entry point called from server.js.
 * Parses /api/** paths and dispatches to the appropriate handler.
 */
async function handleApiRequest(req, res, urlPath) {
    if (mw.handleCors(req, res)) return;

    // Normalize path: strip /api prefix
    const trimmed = urlPath.replace(/^\/api\/?/, '');
    const segments = trimmed.split('/').filter(Boolean);

    try {
        // POST /api/auth/login
        if (segments[0] === 'auth' && segments[1] === 'login') {
            return await handleLogin(req, res);
        }

        // GET /api/licenses/:storeId
        if (segments[0] === 'licenses' && segments[1]) {
            return handleLicense(req, res, segments[1]);
        }

        // All other routes require :storeId as first segment
        const storeId = segments[0];
        const resource = segments[1];
        const param1   = segments[2]; // e.g. product id
        const param2   = segments[3]; // e.g. 'status'

        if (!storeId || !resource) return mw.send404(res);

        switch (resource) {
            case 'products':        return await handleProducts(req, res, storeId, param1);
            case 'categories':      return await handleCategories(req, res, storeId, param1);
            case 'orders':          return await handleOrders(req, res, storeId, param1, param2);
            case 'payment-methods': return await handlePayments(req, res, storeId, param1);
            case 'config':          return await handleConfig(req, res, storeId);
            case 'images':          return await handleImages(req, res, storeId);
            default:                return mw.send404(res);
        }
    } catch (err) {
        mw.send500(res, err);
    }
}

// ══════════════════════════════════════════════════════════════════════════════
// AUTH
// ══════════════════════════════════════════════════════════════════════════════

async function handleLogin(req, res) {
    if (req.method !== 'POST') return mw.methodNotAllowed(res);
    const body = await mw.parseBody(req);
    const { password, storeId } = body;

    if (!storeId) return mw.sendJSON(res, 400, { error: 'storeId is required' });

    // Check license active
    const license = mw.getLicense(storeId);
    if (!license.active) {
        return mw.sendJSON(res, 403, { error: 'License inactive for this store' });
    }

    // Validate password (per-store override via env or data file)
    const expected = process.env[`MVP_PASS_${storeId.toUpperCase()}`] || mw.ADMIN_SECRET;
    if (password !== expected) {
        return mw.sendJSON(res, 401, { error: 'Invalid password' });
    }

    const token = mw.issueToken(storeId);
    console.log(`[AUTH] Login OK — storeId=${storeId}`);
    mw.sendJSON(res, 200, { token, storeId });
}

// ══════════════════════════════════════════════════════════════════════════════
// LICENSES
// ══════════════════════════════════════════════════════════════════════════════

function handleLicense(req, res, storeId) {
    if (req.method !== 'GET') return mw.methodNotAllowed(res);
    const license = mw.getLicense(storeId);
    mw.sendJSON(res, 200, license);
}

// ══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// GET    /api/:storeId/products          — list all
// POST   /api/:storeId/products          — add one
// PUT    /api/:storeId/products          — replace all (bulk save)
// DELETE /api/:storeId/products/:id      — delete one
// ══════════════════════════════════════════════════════════════════════════════

async function handleProducts(req, res, storeId, productId) {
    const auth = mw.requireAuth(req, res);
    if (!auth) return;
    if (!mw.requireStoreMatch(auth, storeId, res)) return;

    if (req.method === 'GET') {
        const products = mw.readData(storeId, 'products.json', []);
        return mw.sendJSON(res, 200, products);
    }

    if (req.method === 'PUT') {
        const body = await mw.parseBody(req);
        if (!Array.isArray(body)) return mw.sendJSON(res, 400, { error: 'Body must be an array' });
        mw.writeData(storeId, 'products.json', body);
        return mw.sendJSON(res, 200, body);
    }

    if (req.method === 'POST') {
        const body = await mw.parseBody(req);
        if (!body.name || body.price === undefined) {
            return mw.sendJSON(res, 400, { error: 'name and price are required' });
        }
        const products = mw.readData(storeId, 'products.json', []);
        body.id     = body.id    || ('prod-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
        body.active = body.active !== undefined ? body.active : true;
        products.push(body);
        mw.writeData(storeId, 'products.json', products);
        console.log(`[PRODUCTS] Added "${body.name}" to ${storeId}`);
        return mw.sendJSON(res, 201, body);
    }

    if (req.method === 'DELETE' && productId) {
        let products = mw.readData(storeId, 'products.json', []);
        const before = products.length;
        products = products.filter(p => p.id !== productId);
        if (products.length === before) return mw.sendJSON(res, 404, { error: 'Product not found' });
        mw.writeData(storeId, 'products.json', products);
        console.log(`[PRODUCTS] Deleted ${productId} from ${storeId}`);
        return mw.sendJSON(res, 200, { ok: true, id: productId });
    }

    mw.methodNotAllowed(res);
}

// ══════════════════════════════════════════════════════════════════════════════
// CATEGORIES
// ══════════════════════════════════════════════════════════════════════════════

async function handleCategories(req, res, storeId, categoryId) {
    const auth = mw.requireAuth(req, res);
    if (!auth) return;
    if (!mw.requireStoreMatch(auth, storeId, res)) return;

    if (req.method === 'GET') {
        return mw.sendJSON(res, 200, mw.readData(storeId, 'categories.json', []));
    }

    if (req.method === 'PUT') {
        const body = await mw.parseBody(req);
        if (!Array.isArray(body)) return mw.sendJSON(res, 400, { error: 'Body must be an array' });
        mw.writeData(storeId, 'categories.json', body);
        return mw.sendJSON(res, 200, body);
    }

    if (req.method === 'POST') {
        const body = await mw.parseBody(req);
        if (!body.name) return mw.sendJSON(res, 400, { error: 'name is required' });
        const cats = mw.readData(storeId, 'categories.json', []);
        body.id   = body.id || ('cat-' + Date.now());
        body.slug = body.slug || body.name.toLowerCase().replace(/\s+/g, '-');
        cats.push(body);
        mw.writeData(storeId, 'categories.json', cats);
        console.log(`[CATEGORIES] Added "${body.name}" to ${storeId}`);
        return mw.sendJSON(res, 201, body);
    }

    if (req.method === 'DELETE' && categoryId) {
        let cats = mw.readData(storeId, 'categories.json', []);
        const before = cats.length;
        cats = cats.filter(c => c.id !== categoryId);
        if (cats.length === before) return mw.sendJSON(res, 404, { error: 'Category not found' });
        mw.writeData(storeId, 'categories.json', cats);
        return mw.sendJSON(res, 200, { ok: true, id: categoryId });
    }

    mw.methodNotAllowed(res);
}

// ══════════════════════════════════════════════════════════════════════════════
// ORDERS
// GET    /api/:storeId/orders              — list all
// POST   /api/:storeId/orders              — add order (customer checkout)
// PUT    /api/:storeId/orders              — bulk replace (admin)
// POST   /api/:storeId/orders/:id/status   — update status
// DELETE /api/:storeId/orders              — clear all orders (admin)
// ══════════════════════════════════════════════════════════════════════════════

async function handleOrders(req, res, storeId, orderId, action) {
    // POST /orders (customer checkout) — no auth required
    if (req.method === 'POST' && !orderId) {
        const body = await mw.parseBody(req);
        if (!body.items || !body.customer) {
            return mw.sendJSON(res, 400, { error: 'items and customer are required' });
        }
        const orders = mw.readData(storeId, 'orders.json', []);
        body.id     = body.id     || ('ord-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
        body.date   = body.date   || new Date().toISOString();
        body.status = body.status || 'pendiente';
        orders.push(body);
        mw.writeData(storeId, 'orders.json', orders);
        console.log(`[ORDERS] New order ${body.id} for ${storeId}`);
        return mw.sendJSON(res, 201, body);
    }

    // All other order routes require auth
    const auth = mw.requireAuth(req, res);
    if (!auth) return;
    if (!mw.requireStoreMatch(auth, storeId, res)) return;

    if (req.method === 'GET') {
        return mw.sendJSON(res, 200, mw.readData(storeId, 'orders.json', []));
    }

    if (req.method === 'PUT') {
        const body = await mw.parseBody(req);
        if (!Array.isArray(body)) return mw.sendJSON(res, 400, { error: 'Body must be an array' });
        mw.writeData(storeId, 'orders.json', body);
        return mw.sendJSON(res, 200, body);
    }

    // POST /orders/:id/status
    if (req.method === 'POST' && orderId && action === 'status') {
        const body   = await mw.parseBody(req);
        const orders = mw.readData(storeId, 'orders.json', []);
        const idx    = orders.findIndex(o => o.id === orderId);
        if (idx === -1) return mw.sendJSON(res, 404, { error: 'Order not found' });
        orders[idx].status = body.status;
        mw.writeData(storeId, 'orders.json', orders);
        console.log(`[ORDERS] ${orderId} → ${body.status}`);
        return mw.sendJSON(res, 200, orders[idx]);
    }

    // DELETE /orders (clear all)
    if (req.method === 'DELETE' && !orderId) {
        mw.writeData(storeId, 'orders.json', []);
        console.log(`[ORDERS] Cleared all orders for ${storeId}`);
        return mw.sendJSON(res, 200, { ok: true });
    }

    mw.methodNotAllowed(res);
}

// ══════════════════════════════════════════════════════════════════════════════
// PAYMENT METHODS
// ══════════════════════════════════════════════════════════════════════════════

async function handlePayments(req, res, storeId, methodId) {
    const auth = mw.requireAuth(req, res);
    if (!auth) return;
    if (!mw.requireStoreMatch(auth, storeId, res)) return;

    if (req.method === 'GET') {
        return mw.sendJSON(res, 200, mw.readData(storeId, 'payment_methods.json', []));
    }

    if (req.method === 'PUT') {
        const body = await mw.parseBody(req);
        if (!Array.isArray(body)) return mw.sendJSON(res, 400, { error: 'Body must be an array' });
        mw.writeData(storeId, 'payment_methods.json', body);
        return mw.sendJSON(res, 200, body);
    }

    if (req.method === 'POST') {
        const body = await mw.parseBody(req);
        if (!body.name) return mw.sendJSON(res, 400, { error: 'name is required' });
        const methods = mw.readData(storeId, 'payment_methods.json', []);
        body.id = body.id || ('pay-' + Date.now());
        body.active = body.active !== undefined ? body.active : true;
        methods.push(body);
        mw.writeData(storeId, 'payment_methods.json', methods);
        return mw.sendJSON(res, 201, body);
    }

    if (req.method === 'DELETE' && methodId) {
        let methods = mw.readData(storeId, 'payment_methods.json', []);
        const before = methods.length;
        methods = methods.filter(m => m.id !== methodId);
        if (methods.length === before) return mw.sendJSON(res, 404, { error: 'Payment method not found' });
        mw.writeData(storeId, 'payment_methods.json', methods);
        return mw.sendJSON(res, 200, { ok: true, id: methodId });
    }

    mw.methodNotAllowed(res);
}

// ══════════════════════════════════════════════════════════════════════════════
// CONFIG
// GET /api/:storeId/config
// PUT /api/:storeId/config
// ══════════════════════════════════════════════════════════════════════════════

async function handleConfig(req, res, storeId) {
    const auth = mw.requireAuth(req, res);
    if (!auth) return;
    if (!mw.requireStoreMatch(auth, storeId, res)) return;

    if (req.method === 'GET') {
        return mw.sendJSON(res, 200, mw.readData(storeId, 'config.json', {}));
    }

    if (req.method === 'PUT') {
        const body = await mw.parseBody(req);
        // Deep merge with existing config to avoid overwriting unrelated keys
        const existing = mw.readData(storeId, 'config.json', {});
        const merged = deepMerge(existing, body);
        mw.writeData(storeId, 'config.json', merged);
        console.log(`[CONFIG] Updated config for ${storeId}`);
        return mw.sendJSON(res, 200, merged);
    }

    mw.methodNotAllowed(res);
}

// ══════════════════════════════════════════════════════════════════════════════
// IMAGES
// POST /api/:storeId/images  (multipart/form-data with webp blob)
// ══════════════════════════════════════════════════════════════════════════════

async function handleImages(req, res, storeId) {
    const auth = mw.requireAuth(req, res);
    if (!auth) return;
    if (!mw.requireStoreMatch(auth, storeId, res)) return;

    if (req.method !== 'POST') return mw.methodNotAllowed(res);

    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
        return mw.sendJSON(res, 400, { error: 'Expected multipart/form-data' });
    }

    // Parse multipart manually (minimal, no deps)
    const boundary = contentType.split('boundary=')[1];
    if (!boundary) return mw.sendJSON(res, 400, { error: 'Missing multipart boundary' });

    const buffers = [];
    await new Promise((resolve, reject) => {
        req.on('data', c => buffers.push(c));
        req.on('end',  resolve);
        req.on('error', reject);
    });

    const buf      = Buffer.concat(buffers);
    const parsed   = parseMultipart(buf, boundary);
    const imageField  = parsed.find(f => f.name === 'image');
    const productId   = (parsed.find(f => f.name === 'productId') || {}).value || '';

    if (!imageField || !imageField.data) {
        return mw.sendJSON(res, 400, { error: 'No image field found' });
    }

    // Save image to data/:storeId/images/
    const imagesDir = path.join(mw.DATA_DIR, storeId, 'images');
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

    const filename = (productId || ('img-' + Date.now())) + '.webp';
    const filePath = path.join(imagesDir, filename);
    fs.writeFileSync(filePath, imageField.data);

    // Build public URL (served by server.js static handler)
    const url = `/data/${storeId}/images/${filename}`;
    console.log(`[IMAGES] Saved ${filename} for ${storeId}`);
    mw.sendJSON(res, 201, { url, filename, productId });
}

// ── Multipart parser (no-dep, minimal) ────────────────────────────────────
function parseMultipart(buffer, boundary) {
    const sep    = Buffer.from('\r\n--' + boundary);
    const parts  = [];
    let pos      = buffer.indexOf('--' + boundary);

    while (pos !== -1) {
        const start = buffer.indexOf('\r\n\r\n', pos);
        if (start === -1) break;
        const headerBlock = buffer.slice(pos + boundary.length + 2, start).toString();
        const headers     = parseMultipartHeaders(headerBlock);
        const bodyStart   = start + 4;
        const end         = buffer.indexOf(sep, bodyStart);
        if (end === -1) break;

        const data = buffer.slice(bodyStart, end);
        const cd   = headers['content-disposition'] || '';
        const name = (cd.match(/name="([^"]+)"/) || [])[1] || null;
        const filename = (cd.match(/filename="([^"]*)"/) || [])[1] || null;

        if (filename) {
            parts.push({ name, filename, data, headers });
        } else {
            parts.push({ name, value: data.toString(), headers });
        }
        pos = buffer.indexOf('--' + boundary, end);
    }
    return parts;
}

function parseMultipartHeaders(raw) {
    const headers = {};
    raw.split('\r\n').filter(Boolean).forEach(line => {
        const colon = line.indexOf(':');
        if (colon > 0) {
            headers[line.slice(0, colon).trim().toLowerCase()] = line.slice(colon + 1).trim();
        }
    });
    return headers;
}

// ── Deep merge helper ──────────────────────────────────────────────────────
function deepMerge(target, source) {
    const out = { ...target };
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            out[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            out[key] = source[key];
        }
    }
    return out;
}

// ── Exports ──────────────────────────────────────────────────────────────────
module.exports = { handleApiRequest };

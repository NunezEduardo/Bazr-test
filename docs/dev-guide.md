# Developer Guide — MVP SaaS

This guide explains how to extend the MVP: add new stores, add new admin commands, customise the store theme, and deploy to production.

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Running Locally](#running-locally)
3. [Adding a New Store (Multi-tenant)](#adding-a-new-store)
4. [Adding a New Admin Command](#adding-a-new-admin-command)
5. [Customising the Store Theme](#customising-the-store-theme)
6. [Swapping the Backend](#swapping-the-backend)
7. [Deployment](#deployment)

---

## 1. Project Structure

```
MVP/
├── server/           # Zero-dependency Node.js backend
│   ├── server.js     # HTTP server + static file router
│   ├── router.js     # REST API route handlers
│   └── middleware.js # Auth, CORS, multi-tenant, file I/O
│
├── shared/           # Shared assets (loaded by both store + admin)
│   ├── api.js        # MvpAPI — data layer (REST or local JSON)
│   ├── utils.js      # MvpUtils — toast, formatters, escapeHtml
│   └── styles.css    # Global design tokens (CSS variables)
│
├── store/            # Customer-facing storefront
│   ├── index.html
│   ├── styles.css
│   └── js/
│       ├── settings-loader.js  # Load + apply config.json
│       ├── ui.js               # Pure rendering functions
│       └── store.js            # State, events, cart, checkout
│
├── admin/            # Admin PWA
│   ├── index.html
│   ├── styles.css
│   ├── manifest.json
│   ├── sw.js
│   └── js/
│       ├── auth.js             # Login / session
│       ├── chat.js             # Chat UI
│       ├── commands.js         # Command engine
│       ├── help.js             # Help modal
│       └── image-webp.js       # Image → WebP upload
│
├── data/             # Multi-tenant data (one folder per storeId)
│   ├── licenses.json
│   └── bazr/
│       ├── config.json
│       ├── products.json
│       ├── categories.json
│       ├── orders.json
│       ├── payment_methods.json
│       └── images/
│
└── docs/             # Documentation
    ├── api.md
    ├── commands.md
    └── dev-guide.md
```

---

## 2. Running Locally

```bash
# Requires Node.js ≥ 18
cd MVP
node server/server.js

# Default port: 3000
# Store  →  http://localhost:3000/store/
# Admin  →  http://localhost:3000/admin/
# API    →  http://localhost:3000/api/
```

**Environment variables (optional):**

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | HTTP port |
| `MVP_SECRET` | `admin` | Global admin password |
| `MVP_PASS_<STOREID>` | — | Per-store password override. Example: `MVP_PASS_BAZR=mypass` |
| `DATA_DIR` | `./data` | Custom data directory path |

```bash
# Example with custom port + password
PORT=8080 MVP_SECRET=supersecret node server/server.js
```

---

## 3. Adding a New Store

Every store is completely isolated by its `storeId`. Create the folder structure and seed files:

```bash
# 1. Create data directory
mkdir data/mystore
mkdir data/mystore/images

# 2. Copy the seed files from bazr
cp data/bazr/config.json       data/mystore/config.json
cp data/bazr/categories.json   data/mystore/categories.json
cp data/bazr/payment_methods.json data/mystore/payment_methods.json
echo "[]" > data/mystore/products.json
echo "[]" > data/mystore/orders.json

# 3. Add license entry to data/licenses.json
```

**Update `data/licenses.json`:**
```json
{
  "bazr":    { "active": true, "plan": "pro",   "expires": null },
  "mystore": { "active": true, "plan": "basic",  "expires": "2027-01-01" }
}
```

**Access the new store:**
```
Store  →  http://localhost:3000/store/?store=mystore
Admin  →  http://localhost:3000/admin/?store=mystore
```

**Optional:** Set a per-store admin password:
```bash
MVP_PASS_MYSTORE=storepassword node server/server.js
```

---

## 4. Adding a New Admin Command

Commands live in `admin/js/commands.js`. Follow this pattern:

### Step 1 — Add the dispatch case

In the `dispatch()` function, add your command keyword:

```js
if (lcText === 'mi-comando') return await cmdMiComando(text);
```

### Step 2 — Write the handler

```js
// mi-comando param1=valor param2=valor
async function cmdMiComando(text) {
    await AdminChat.typeMsg(async () => {
        const a = args(text);               // parse key=value arguments
        const param1 = a.param1;

        if (!param1) return '❌ Falta el campo <code>param1</code>.';

        // Do your thing — call the API, transform data, etc.
        const productos = await _api.getProducts();
        // ...

        return `✅ Comando ejecutado con: <strong>${param1}</strong>`;
    });
}
```

### Step 3 — Add it to the Help modal

Open `admin/js/help.js` and find the relevant `SECTIONS` entry, then add:

```js
{ cmd: 'mi-comando param1=valor', desc: 'Hace algo útil', example: 'mi-comando param1=foo' }
```

### Available API methods

```js
_api.getProducts()                  // → Promise<Product[]>
_api.updateProducts(products)       // → Promise<void>
_api.getCategories()                // → Promise<Category[]>
_api.updateCategories(cats)         // → Promise<void>
_api.getOrders()                    // → Promise<Order[]>
_api.updateOrderStatus(id, status)  // → Promise<void>
_api.clearOrders()                  // → Promise<void>
_api.getPaymentMethods()            // → Promise<PaymentMethod[]>
_api.updatePaymentMethods(methods)  // → Promise<void>
_api.getConfig()                    // → Promise<Config>
_api.updateConfig(config)           // → Promise<void>
```

---

## 5. Customising the Store Theme

### Via Admin Panel (recommended)

```
config-color primario=#ff6b35        # Change primary color
config storeName="Mi Tienda"         # Change store name
config-logo                          # Upload a logo
```

### Via config.json directly

Edit `data/bazr/config.json`:

```json
{
  "storeName": "Mi Tienda",
  "theme": "dark",
  "colors": {
    "primary": "#c9a96e",
    "primaryDark": "#b08a4e",
    "accent": "#e8c99a",
    "bg": "#0a0a0a",
    "text": "#f5f5f4"
  },
  "font": "Outfit"
}
```

### Via CSS variables (advanced)

All tokens are defined in `shared/styles.css`. Override any token in `store/styles.css`:

```css
:root {
  --clr-primary:       #ff6b35;
  --clr-primary-dark:  #e05a25;
  --clr-primary-glow:  rgba(255,107,53,0.15);
  --bg:                #0d0d0d;
  --font-display:      'Playfair Display', serif;
}
```

---

## 6. Swapping the Backend

`shared/api.js` uses a factory that automatically detects whether it's talking to the Node server or reading local JSON files directly. To swap to a different backend:

### Point to a custom API base URL

In `shared/api.js`, the `BASE_URL` is auto-detected. You can override it:

```js
// At the top of your init script
MvpAPI.BASE_URL = 'https://my-server.com/api';
```

### Use with PHP

The REST routes in `server/router.js` map directly to PHP patterns. Create a PHP router with the same URL structure:

```
GET    /api/:storeId/products          → products.php?action=list
POST   /api/:storeId/products          → products.php?action=add
PUT    /api/:storeId/products          → products.php?action=replace
DELETE /api/:storeId/products/:id      → products.php?action=delete&id=...
```

All responses use the same JSON shapes — no frontend changes needed.

### Switch to local JSON mode (no server)

Set the mode flag in `api.js` to use flat JSON files from `<script>` tags:

```js
const api = MvpAPI.forStore('bazr', { mode: 'local' });
```

---

## 7. Deployment

### Shared Hosting / VPS

```bash
# Upload the MVP folder to your server
# Install Node.js >= 18
npm install -g pm2

# Start with PM2 (process manager)
pm2 start server/server.js --name mvp-store
pm2 save
pm2 startup
```

Nginx reverse-proxy example:
```nginx
server {
    listen 80;
    server_name mystore.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote-addr;
    }
}
```

### Serverless / Edge (Vercel, Netlify)

The server does file I/O which isn't compatible with serverless. For edge hosting:

1. Keep `store/` and `admin/` as static files
2. Replace `server/` with a serverless backend (Vercel API routes, Cloudflare Workers, etc.)
3. Point `MvpAPI.BASE_URL` to your serverless endpoint

### Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY . .
EXPOSE 3000
CMD ["node", "server/server.js"]
```

```bash
docker build -t mvp-store .
docker run -p 3000:3000 -v ./data:/app/data mvp-store
```

> **Important:** Mount `data/` as a volume so store data persists between container restarts.

---

## Design Decisions & Notes

- **Zero dependencies** — the server runs on pure Node.js stdlib (`http`, `fs`, `path`). No npm install needed.
- **Multi-tenancy via directory isolation** — each `storeId` maps to `data/<storeId>/`, preventing cross-store data access.
- **Atomic writes** — all file writes use a write-then-rename pattern to prevent data corruption on concurrent requests.
- **Token format** — tokens are `mvp-<timestamp>-<random>`. They're validated by presence in an in-memory map. Restarting the server invalidates all tokens.
- **Lint notes** — `scrollbar-width/color` properties in `shared/styles.css` produce CSS lint warnings for older Safari/Chrome versions. These are progressive enhancements and are safe to leave as-is for this MVP scope.

# MVP — Ultralight B2B2C SaaS Virtual Store

> Pure HTML/CSS/JS frontend · Zero-dependency Node.js backend · Multi-tenant · PWA Admin

---

## Quickstart

### Local (no server needed)

Open `store/index.html` directly in your browser.  
Data is read from `data/bazr/*.json` via `fetch()` and cached in `localStorage`.

> ⚠️ Some browsers block local `fetch()` requests. Use the server mode below for best results.

### With the Node.js Server

```bash
# No npm install needed — zero dependencies!
node server/server.js

# Or specify a port:
node server/server.js 8080

# Or via npm:
npm start
```

Then open:

| URL | Description |
|---|---|
| `http://localhost:3000/store/` | Customer storefront |
| `http://localhost:3000/admin/` | Admin PWA (chat-based) |
| `http://localhost:3000/api/` | REST API |

---

## Folder Structure

```
MVP/
├── data/
│   ├── licenses.json          ← { "bazr": { "active": true, "plan": "pro" } }
│   └── bazr/                  ← isolated store data (multi-tenant)
│       ├── config.json        ← theme, texts, logo, contact, policies
│       ├── products.json
│       ├── categories.json
│       ├── orders.json
│       └── payment_methods.json
├── shared/
│   ├── api.js                 ← MvpAPI.forStore('bazr') — centralized data layer
│   ├── utils.js               ← toast, toWebP, formatCurrency, parseCommandArgs
│   └── styles.css             ← design system: tokens, components, animations
├── store/                     ← Customer-facing storefront
│   ├── index.html
│   ├── styles.css
│   └── js/
│       ├── store.js           ← init, cart, checkout, orders
│       ├── ui.js              ← render products, collections, filters
│       └── settings-loader.js ← applies config.json to DOM
├── admin/                     ← Owner-only PWA (chat-based)
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js
│   ├── styles.css
│   └── js/
│       ├── auth.js            ← login/session/license check
│       ├── chat.js            ← chat UI renderer
│       ├── commands.js        ← command parser + all handlers
│       ├── help.js            ← help modal
│       └── image-webp.js      ← client-side image→webp
├── server/
│   ├── server.js              ← HTTP server (static + /api/*)
│   ├── router.js              ← REST route handlers
│   └── middleware.js          ← CORS, auth, multi-tenant, file I/O
├── package.json
└── README.md
```

---

## REST API Reference

**Base URL:** `http://localhost:3000/api`

### Authentication

```http
POST /api/auth/login
Content-Type: application/json

{ "password": "admin", "storeId": "bazr" }
```

Response: `{ "token": "mvp-...", "storeId": "bazr" }`

> Use the token as `Authorization: Bearer <token>` on all protected routes.

### Licenses

```http
GET /api/licenses/:storeId
```

---

### Products

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/:storeId/products` | ✅ | List all products |
| `POST` | `/api/:storeId/products` | ✅ | Add a product |
| `PUT` | `/api/:storeId/products` | ✅ | Replace all products (bulk) |
| `DELETE` | `/api/:storeId/products/:id` | ✅ | Delete a product |

**POST body:**
```json
{
  "name": "Camisa Lino",
  "price": 49.99,
  "category": "Camisas",
  "categoryId": "cat-001",
  "colors": ["Blanco", "Azul"],
  "sizes": ["S", "M", "L"],
  "description": "Descripción del producto",
  "featured": false
}
```

---

### Categories

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/:storeId/categories` | ✅ | List all |
| `POST` | `/api/:storeId/categories` | ✅ | Add category |
| `PUT` | `/api/:storeId/categories` | ✅ | Replace all (bulk) |
| `DELETE` | `/api/:storeId/categories/:id` | ✅ | Delete one |

---

### Orders

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/:storeId/orders` | ✅ | List all orders |
| `POST` | `/api/:storeId/orders` | ❌ | Submit order (customer checkout) |
| `PUT` | `/api/:storeId/orders` | ✅ | Bulk replace |
| `POST` | `/api/:storeId/orders/:id/status` | ✅ | Update order status |
| `DELETE` | `/api/:storeId/orders` | ✅ | Clear all orders |

**Order status values:** `pendiente` · `confirmado` · `enviado` · `entregado` · `cancelado`

---

### Payment Methods

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/:storeId/payment-methods` | ✅ | List all |
| `POST` | `/api/:storeId/payment-methods` | ✅ | Add method |
| `PUT` | `/api/:storeId/payment-methods` | ✅ | Bulk replace |
| `DELETE` | `/api/:storeId/payment-methods/:id` | ✅ | Delete one |

---

### Config

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET` | `/api/:storeId/config` | ✅ | Get full config |
| `PUT` | `/api/:storeId/config` | ✅ | Deep-merge update |

---

### Images

```http
POST /api/:storeId/images
Content-Type: multipart/form-data

Fields:
  image      — WebP image blob (required)
  productId  — product ID (optional, used as filename)
```

Response: `{ "url": "/data/bazr/images/prod-001.webp", "filename": "..." }`

---

## Admin Chat Commands

| Command | Description |
|---|---|
| `ayuda` / `help` | Show all commands |
| `agregar nombre="..." precio=XX coleccion="..."` | Add product |
| `editar id=XXX campo=valor` | Edit product field |
| `eliminar id=XXX` | Delete product |
| `listar [coleccion]` | List products |
| `ver-pedidos [estado]` | List orders |
| `aprobar-pedido id=XXX` | Confirm order |
| `agregar-imagen id=XXX` | Upload image for product |
| `agregar-categoria nombre="..."` | Add category |
| `listar-categorias` | List categories |
| `config campo=valor` | Update config key |
| `config-color primario=#HEX` | Change primary color |
| `config-logo` | Upload store logo |
| `listar-pagos` | List payment methods |
| `agregar-pago nombre="..." instrucciones="..."` | Add payment method |
| `exportar productos` | Download products.json |
| `limpiar-pedidos` | Clear all orders |
| `estado` | Show store stats |

---

## Adding a New Store (Multi-tenant)

1. Create `data/newstore/` folder with: `config.json`, `products.json`, `categories.json`, `orders.json`, `payment_methods.json`
2. Add `"newstore": { "active": true, "plan": "pro" }` to `data/licenses.json`
3. Set env var for password: `MVP_PASS_NEWSTORE=mysecret`
4. Open `admin/index.html?store=newstore`

---

## Switching to REST Mode (Local → Server)

In `shared/api.js`, change:

```js
const USE_REST_API = false;  // ← local JSON mode
// to:
const USE_REST_API = true;   // ← full REST mode
```

No other code changes needed. The store and admin panels are fully API-agnostic.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `MVP_SECRET` | `admin` | Default admin password |
| `MVP_PASS_<STOREID>` | — | Per-store password override |

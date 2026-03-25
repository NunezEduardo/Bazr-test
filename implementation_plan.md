# Bazr MVP SaaS B2B2C — Implementation Plan

A full rewrite of `Bazr` into `MVP`: an ultra-light, portable, multi-tenant SaaS platform for virtual stores. Pure HTML/CSS/JS on the frontend. A minimal Node.js backend simulator (easily swappable with PHP/Express/Flask). Admin fully via chat-based PWA.

---

## Proposed Changes

### Folder Structure
```
MVP/
├── data/
│   ├── licenses.json                 ← { "bazr": { "active": true, "plan": "pro" } }
│   └── bazr/                         ← isolated store data (multi-tenant ready)
│       ├── config.json               ← theme, texts, logo, contact, policies
│       ├── products.json
│       ├── categories.json
│       ├── orders.json
│       └── payment_methods.json
├── shared/
│   ├── api.js                        ← centralized fetch API (mode switch: local ↔ REST)
│   ├── utils.js                      ← toast, webp converter, formatters, helpers
│   └── styles.css                    ← shared CSS (tokens, typography, resets)
├── store/                            ← Customer-facing storefront
│   ├── index.html
│   ├── styles.css
│   └── js/
│       ├── store.js                  ← main init, cart, checkout, orders
│       ├── ui.js                     ← render products, collections, filters
│       └── settings-loader.js       ← applies config.json to DOM
├── admin/                            ← Owner-only PWA (chat-based)
│   ├── index.html
│   ├── manifest.json
│   ├── sw.js
│   ├── styles.css
│   └── js/
│       ├── auth.js                   ← login, session, license check
│       ├── chat.js                   ← chat UI renderer
│       ├── commands.js               ← command parser + all handlers
│       ├── help.js                   ← help modal
│       └── image-webp.js            ← client-side image→webp
├── server/                           ← Minimal backend simulator
│   ├── server.js                     ← Node.js static + REST server
│   └── router.js                     ← all route handlers
├── README.md
└── docs/
    ├── api.md
    ├── commands.md
    └── dev-guide.md
```

---

### Component: `shared/api.js`
**[MODIFY adapted from Bazr]** — Centralized API layer, identical pattern to [Bazr/js/api.js](file:///c:/Users/eduardo%20nunez/Importante/Escritorio/Bazr/js/api.js) but:
- Multi-tenant: accepts `storeId` param
- `USE_REST_API` flag to switch local↔server
- All data paths prefixed: `data/{storeId}/resource`
- Token stored in `sessionStorage`

---

### Component: Store Frontend

#### [NEW] `store/index.html`
Adapted from [Bazr/index.html](file:///c:/Users/eduardo%20nunez/Importante/Escritorio/Bazr/index.html) — same layout, sections, modals. Key differences:
- `<script>` loads from `shared/api.js`, `store/js/settings-loader.js`, `store/js/ui.js`, `store/js/store.js`
- All text content is blank at load (filled by `settings-loader.js`)
- Logo and theme applied dynamically from config

#### [NEW] `store/styles.css`
Adapted from [Bazr/styles.css](file:///c:/Users/eduardo%20nunez/Importante/Escritorio/Bazr/styles.css) — same design tokens & classes. CSS variables for theme override.

#### [NEW] `store/js/settings-loader.js`
- On load: fetches `config.json` via API
- Applies theme class to `<html>`, sets font, colors
- Fills all `[data-txt]` elements from `config.texts`
- Sets logo `src` from `config.logoMain`
- Sets contact hrefs/text

#### [NEW] `store/js/ui.js`
- `renderProducts(products, categories)` → builds product grid HTML
- `renderCollections(categories)` → collections section
- `renderFilterChips(categories)` → filter buttons
- `renderCartItem(item)`, `renderCheckoutList(items)`
- `renderInvoice(order, settings)`

#### [NEW] `store/js/store.js`
- Init: loads products, categories, settings, payment methods
- Cart: add, remove, select, totals
- Checkout flow: step 1→2→3, order submission
- Opens product modal, sets sizes/colors/qty

---

### Component: Admin PWA

#### [NEW] `admin/index.html`
- Login screen (password input)
- Chat interface: message list + input bar
- Top bar: store name, logout, help button
- Help modal: full command list

#### [NEW] `admin/manifest.json` + `admin/sw.js`
- PWA manifest with icons, name, start_url
- Service worker for offline shell caching

#### [NEW] `admin/styles.css`
- Dark premium design (reuses Bazr admin.css tokens)
- Chat bubble styles (bot vs user)
- Login screen glass card

#### [NEW] `admin/js/auth.js`
- `login(password)` → calls API `/auth/login`
- `isLoggedIn()` → checks session token
- `checkLicense(storeId)` → fetches licenses.json, validates `active: true`
- `logout()` → clears token, shows login screen

#### [NEW] `admin/js/commands.js` — Command Parser (core feature)
Extensible registry pattern:
```js
CommandRegistry.register({
  name: 'agregar-producto',
  aliases: ['add', 'nuevo'],
  args: ['nombre', 'precio', 'coleccion', 'descripcion?'],
  handler: async (args, ctx) => { ... }
});
```
**Supported commands (MVP):**
| Command | Description |
|---|---|
| `ayuda` / `help` | Shows command list |
| `agregar nombre="..." precio=XX coleccion="..."` | Add product |
| `editar id=XXX campo=valor` | Edit product field |
| `eliminar id=XXX` | Delete product |
| `listar [coleccion]` | List products |
| `ver-pedidos [estado]` | List orders |
| `aprobar-pedido id=XXX` | Change order status |
| `agregar-imagen id=XXX` | Upload image for product |
| `agregar-categoria nombre="..."` | Add category |
| `listar-categorias` | List categories |
| `config campo=valor` | Update config key |
| `config-color primario=#HEX` | Change primary color |
| `config-logo` | Upload logo |
| `listar-pagos` | List payment methods |
| `agregar-pago nombre="..." instrucciones="..."` | Add payment method |
| `exportar productos` | Download JSON |
| `limpiar-pedidos` | Clear all orders |
| `estado` | Show store stats |

#### [NEW] `admin/js/image-webp.js`
- `toWebP(file, maxWidth, quality)` → returns Promise<Blob>
- Uses `<canvas>` to convert uploaded images to WebP
- Used by `agregar-imagen` and `config-logo` commands

---

### Component: Backend Simulator

#### [NEW] `server/server.js`
Minimal Node.js (no frameworks needed) HTTP server:
- Serves static files from `store/` and [admin/](file:///c:/Users/eduardo%20nunez/Importante/Escritorio/Bazr/js/api.js#277-302)
- Routes `/api/*` to `router.js`
- Uses only built-in `http`, `fs`, `path` modules

#### [NEW] `server/router.js`
REST API — all routes documented:
```
GET    /api/:storeId/products
PUT    /api/:storeId/products
POST   /api/:storeId/products
DELETE /api/:storeId/products/:id
GET    /api/:storeId/categories
PUT    /api/:storeId/categories
POST   /api/:storeId/categories
GET    /api/:storeId/orders
POST   /api/:storeId/orders
POST   /api/:storeId/orders/:id/status
DELETE /api/:storeId/orders
GET    /api/:storeId/payment-methods
PUT    /api/:storeId/payment-methods
GET    /api/:storeId/config
PUT    /api/:storeId/config
POST   /api/:storeId/images (multipart, saves as .webp)
POST   /api/auth/login
GET    /api/licenses/:storeId
```

---

### Component: Data

#### [NEW] `data/licenses.json`
```json
{
  "bazr": { "active": true, "plan": "pro", "expires": null }
}
```

#### [NEW] `data/bazr/config.json`
All store-level settings: `storeName`, `logoMain`, `theme`, `colors`, `texts`, `contact`, `invoiceSettings`, `policies`.

#### [NEW] Sample data files
- `data/bazr/products.json` — 3–5 sample products
- `data/bazr/categories.json` — 2–3 sample categories
- `data/bazr/orders.json` — `[]`
- `data/bazr/payment_methods.json` — 2 sample methods

---

### Component: Documentation

#### [NEW] `README.md`
- Quickstart (local + server)
- Command examples: add product, upload image, change colors
- Architecture overview
- Migration guide (local → real server)

#### [NEW] `docs/api.md`, `docs/commands.md`, `docs/dev-guide.md`

---

## Verification Plan

### Manual Verification (Local)
1. **Setup**: Run `node server/server.js` from `MVP/` → visit `http://localhost:3000/store/`
   - Store loads with sample products and config applied
2. **Admin login**: Visit `http://localhost:3000/admin/`
   - Login with password [admin](file:///c:/Users/eduardo%20nunez/Importante/Escritorio/Bazr/js/api.js#277-302) → chat loads
   - License check passes for `bazr`
3. **Chat commands**:
   - Type `ayuda` → help modal appears with all commands
   - Type `agregar nombre="Camisa Test" precio=29.99 coleccion="Nueva"` → product added, confirmado en chat
   - Type `listar` → products listed in chat
   - Type `agregar-imagen id=<id>` → file picker appears, image converted to webp and uploaded
   - Type `config-color primario=#ff6600` → store color updated
   - Type `ver-pedidos` → orders listed
4. **Store frontend**:
   - Products visible in catalog
   - Add to cart, checkout, order submitted → appears in admin orders
5. **PWA install**: On mobile browser, install admin as app → works offline for shell

### No automated test suite exists — tests are manual as described above.

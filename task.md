# Bazr MVP SaaS B2B2C — Task Checklist

## Phase 1: Planning
- [x] Read and analyze existing Bazr project (index.html, admin.html, admin.css, styles.css, js/api.js, api/router.php, data/*.json)
- [x] Create implementation plan (implementation_plan.md)
- [x] Get user approval on plan

## Phase 2: Project Structure & Shared Assets
- [x] Create MVP folder structure
- [x] Create `shared/api.js` — centralized API layer (adapted from Bazr)
- [x] Create `shared/styles.css` — base/shared styles (adapted from Bazr)
- [x] Create `shared/utils.js` — shared utilities (toast, image→webp, formatters)
- [x] Create `data/bazr/` store data files (products.json, config.json, orders.json, payment_methods.json, licenses.json)

## Phase 3: Backend Simulator (Node.js/Express-compatible)
- [x] Create `server/server.js` — minimal static file + REST API simulator
- [x] Create `server/router.js` — REST routes for all resources
- [x] Create `server/middleware.js` — auth, CORS, multi-tenant isolation
- [x] Document all endpoints in README

## Phase 4: Store Frontend (Client-facing)
- [x] Create `store/index.html` — landing page (adapted from Bazr index.html)
- [x] Create `store/styles.css` — store-specific styles (adapted from Bazr styles.css)
- [x] Create `store/js/store.js` — main store module (products, cart, modal, checkout)
- [x] Create `store/js/ui.js` — UI helpers (render products, collections, filters)
- [x] Create `store/js/settings-loader.js` — loads config.json and applies theme/texts

## Phase 5: Admin PWA (Chat-based)
- [x] Create `admin/index.html` — admin PWA shell (login + chat interface)
- [x] Create `admin/manifest.json` — PWA manifest
- [x] Create `admin/sw.js` — service worker for offline/PWA
- [x] Create `admin/styles.css` — admin-specific styles (dark, premium)
- [x] Create `admin/js/auth.js` — login/session/licensing check
- [x] Create `admin/js/chat.js` — chat UI (render messages, input handling)
- [x] Create `admin/js/commands.js` — command parser + all command handlers
- [x] Create `admin/js/help.js` — help modal with all commands listed
- [x] Create `admin/js/image-webp.js` — client-side image→webp conversion

## Phase 6: Data & Multi-tenant Isolation
- [x] Create `data/` structure for each store (by storeId)
- [x] Create `data/licenses.json` — licensing/active status per store
- [x] Create `data/bazr/config.json` — store config (theme, texts, logos, contact)
- [x] Create `data/bazr/products.json` — 10 sample products (4 categories)
- [x] Create `data/bazr/orders.json` — empty orders array
- [x] Create `data/bazr/payment_methods.json` — 4 payment methods
- [x] Create `data/bazr/categories.json` — 4 categories

## Phase 7: Documentation
- [x] Create `README.md` — full setup, examples, command reference, dev guide
- [x] Create `docs/api.md` — endpoint documentation
- [x] Create `docs/commands.md` — admin chat commands reference
- [x] Create `docs/dev-guide.md` — how to extend commands and add new stores

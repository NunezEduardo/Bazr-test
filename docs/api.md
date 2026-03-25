# API Reference — MVP SaaS

> **Base URL:** `http://localhost:3000/api`  
> **Content-Type:** `application/json`  
> **Auth:** `Authorization: Bearer <token>` on all protected routes

---

## Authentication

### POST /api/auth/login

Authenticate and receive a session token.

**Body:**
```json
{ "password": "admin", "storeId": "bazr" }
```

**Response `200`:**
```json
{ "token": "mvp-1711234567890-abc123", "storeId": "bazr" }
```

**Response `401`:**
```json
{ "error": "Invalid password" }
```

---

## Licenses

### GET /api/licenses/:storeId

Check if a store has an active license.

**Response `200`:**
```json
{ "active": true, "plan": "pro", "expires": null }
```

**Response `403`:**
```json
{ "error": "Store inactive or not found" }
```

---

## Products

### GET /api/:storeId/products ✅ Auth

List all products for a store.

**Response `200`:**
```json
[
  {
    "id": "prod-001",
    "name": "Camisa Lino Premium",
    "price": 49.99,
    "category": "Camisas",
    "categoryId": "cat-001",
    "colors": ["Blanco", "Azul cielo"],
    "sizes": ["S", "M", "L"],
    "image": "",
    "images": [],
    "description": "...",
    "featured": true,
    "active": true,
    "stock": 25
  }
]
```

---

### POST /api/:storeId/products ✅ Auth

Add a new product.

**Body:**
```json
{
  "name": "Camisa Lino",
  "price": 49.99,
  "category": "Camisas",
  "categoryId": "cat-001",
  "colors": ["Blanco"],
  "sizes": ["S", "M", "L"],
  "description": "Descripción...",
  "featured": false
}
```

**Response `201`:** Full product list (after append)

---

### PUT /api/:storeId/products ✅ Auth

**Bulk replace** the entire products array.

**Body:** `[ ...products ]`

**Response `200`:** `{ "ok": true }`

---

### DELETE /api/:storeId/products/:id ✅ Auth

Delete a single product by ID.

**Response `200`:** `{ "ok": true }`  
**Response `404`:** `{ "error": "Product not found" }`

---

## Categories

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET`  | `/api/:storeId/categories` | ✅ | List all |
| `POST` | `/api/:storeId/categories` | ✅ | Add one `{ name }` |
| `PUT`  | `/api/:storeId/categories` | ✅ | Bulk replace |
| `DELETE` | `/api/:storeId/categories/:id` | ✅ | Delete one |

**Category shape:**
```json
{ "id": "cat-001", "name": "Camisas", "slug": "camisas", "description": "..." }
```

---

## Orders

### GET /api/:storeId/orders ✅ Auth

Returns full order list.

### POST /api/:storeId/orders ❌ Public

Customer checkout — creates a new order.

**Body:**
```json
{
  "id": "ORD-1711234567890",
  "date": "2026-03-25T14:00:00.000Z",
  "status": "pendiente",
  "paymentMethod": { "id": "pay-001", "name": "Transferencia Bancaria" },
  "customer": {
    "name": "Juan Pérez",
    "email": "juan@email.com",
    "phone": "+58 412 000 0000",
    "ref": "REF-12345",
    "address": "Av. Principal, Caracas",
    "notes": ""
  },
  "items": [
    { "id": "prod-001", "name": "Camisa Lino", "price": 49.99, "qty": 2, "color": "Blanco", "size": "M" }
  ]
}
```

**Response `201`:** `{ "ok": true, "id": "ORD-..." }`

### POST /api/:storeId/orders/:id/status ✅ Auth

Update a single order's status.

**Body:**
```json
{ "status": "confirmado" }
```

**Valid statuses:** `pendiente` · `confirmado` · `enviado` · `entregado` · `cancelado`

### DELETE /api/:storeId/orders ✅ Auth

Clear all orders.

---

## Payment Methods

| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| `GET`  | `/api/:storeId/payment-methods` | ✅ | List all |
| `POST` | `/api/:storeId/payment-methods` | ✅ | Add one |
| `PUT`  | `/api/:storeId/payment-methods` | ✅ | Bulk replace |
| `DELETE` | `/api/:storeId/payment-methods/:id` | ✅ | Delete one |

**Payment method shape:**
```json
{ "id": "pay-001", "name": "Transferencia", "icon": "🏦", "instructions": "Cuenta: ...", "active": true }
```

---

## Config

### GET /api/:storeId/config ✅ Auth

Returns the full config object (theme, colors, texts, etc.).

### PUT /api/:storeId/config ✅ Auth

Deep-merge update. Only send changed fields.

**Body (example):**
```json
{
  "storeName": "Mi Tienda",
  "colors": { "primary": "#ff6b35" }
}
```

**Response `200`:** `{ "ok": true }`

---

## Images

### POST /api/:storeId/images ✅ Auth

Upload a product image (WebP).

**Content-Type:** `multipart/form-data`

**Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `image` | File (image/webp) | ✅ | WebP image blob |
| `productId` | string | ❌ | Used as filename |

**Response `201`:**
```json
{ "url": "/data/bazr/images/prod-001.webp", "filename": "prod-001.webp" }
```

---

## Error format

All errors return:
```json
{ "error": "Human-readable message" }
```

| Code | Meaning |
|------|---------|
| `400` | Bad request / missing fields |
| `401` | Missing or invalid token |
| `403` | Store inactive or wrong store |
| `404` | Resource not found |
| `405` | Method not allowed |
| `500` | Server / file I/O error |

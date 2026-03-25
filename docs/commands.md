# Admin Chat Commands — MVP SaaS

> Access the admin panel at `http://localhost:3000/admin/`  
> Default password: `admin` (change via env `MVP_SECRET`)

All commands are typed into the chat input and sent with **Enter** or the send button.  
Arguments with spaces must be wrapped in quotes: `nombre="Camisa de Lino"`.

---

## 📦 Products

### `listar`
List all products.
```
listar
```

### `listar [colección]`
Filter by collection name.
```
listar Camisas
```

### `agregar`
Add a new product.  
Required: `nombre`, `precio`  
Optional: `coleccion`, `descripcion`, `tallas`, `colores`

```
agregar nombre="Camisa Lino" precio=49.99 coleccion="Camisas" tallas="S,M,L,XL" colores="Blanco,Azul"
```

### `editar`
Edit one or more fields of an existing product.  
Required: `id`

```
editar id=prod-001 precio=39.99
editar id=prod-001 nombre="Nuevo Nombre" descripcion="Descripción actualizada"
editar id=prod-001 destacado=true
```

### `eliminar`
Delete a product permanently.
```
eliminar id=prod-001
```

### `destacar`
Toggle featured status (on/off).
```
destacar id=prod-001
```

### `agregar-imagen`
Upload a WebP image for a product. Opens a file picker.
```
agregar-imagen id=prod-001
```

### `exportar productos`
Download `products.json`.
```
exportar productos
```

---

## 🗂️ Collections

### `listar-categorias`
List all collections/categories.
```
listar-categorias
```

### `agregar-categoria`
Add a new category/collection.
```
agregar-categoria nombre="Zapatos"
```

### `eliminar-categoria`
Delete a category by ID.
```
eliminar-categoria id=cat-003
```

---

## 📬 Orders

### `ver-pedidos`
List all orders.
```
ver-pedidos
```

### `ver-pedidos estado=X`
Filter by status. Valid values: `pendiente`, `confirmado`, `enviado`, `entregado`, `cancelado`
```
ver-pedidos estado=pendiente
ver-pedidos estado=enviado
```

### `aprobar-pedido`
Mark an order as `confirmado`.
```
aprobar-pedido id=ORD-1711234567890
```

### `estado-pedido`
Set any status on an order.
```
estado-pedido id=ORD-1711234567890 estado=enviado
estado-pedido id=ORD-1711234567890 estado=entregado
estado-pedido id=ORD-1711234567890 estado=cancelado
```

### `limpiar-pedidos`
⚠️ Delete **all** orders permanently.
```
limpiar-pedidos
```

### `exportar pedidos`
Download `orders.json`.
```
exportar pedidos
```

---

## 💳 Payment Methods

### `listar-pagos`
List all payment methods.
```
listar-pagos
```

### `agregar-pago`
Add a payment method.  
Required: `nombre`  
Optional: `instrucciones`, `icono`

```
agregar-pago nombre="Binance Pay" instrucciones="Enviar a: user@example.com" icono="💰"
agregar-pago nombre="PayPal" instrucciones="Enviar a @mitienda" icono="💳"
```

### `eliminar-pago`
Delete a payment method.
```
eliminar-pago id=pay-003
```

---

## ⚙️ Configuration

### `ver-config`
Display the current store configuration.
```
ver-config
```

### `config`
Update one or more config fields.
```
config storeName="Mi Tienda Bonita"
config storeName="BAZR" font="Outfit"
```

### `config-color`
Change the store's primary brand color.
```
config-color primario=#ff6b35
config-color primario=#c9a96e
```

### `config-logo`
Upload a new store logo. Opens a file picker.
```
config-logo
```

### `exportar config`
Download `config.json`.
```
exportar config
```

---

## 📊 Dashboard

### `estado`
Show an overview of store stats: # products, orders, pending/confirmed, approximate revenue.
```
estado
```

### `ayuda` / `help` / `?`
Open the full command reference help modal.
```
ayuda
```

### `salir`
Log out and return to the login screen.
```
salir
```

---

## Argument Syntax

| Pattern | Example |
|---------|---------|
| `key=value` | `precio=49.99` |
| `key="value with spaces"` | `nombre="Camisa de Lino"` |
| `key='value'` | `coleccion='Camisas'` |
| Comma-separated lists | `tallas="S,M,L,XL"` |
| Boolean flags | `destacado=true` |

> **Tip:** Click **▶ Usar** in the help modal to insert any command example directly.

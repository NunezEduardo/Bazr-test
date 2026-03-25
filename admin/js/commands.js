/**
 * MVP Admin — Command Engine (admin/js/commands.js)
 * ===================================================
 * Parses chat input and dispatches to command handlers.
 * All handlers reply via AdminChat.typeMsg().
 *
 * Depends on: MvpAPI, MvpUtils, AdminAuth, AdminChat, ImageWebp
 */
'use strict';

const AdminCommands = (() => {

    let _api     = null;
    let _storeId = null;
    let _token   = null;

    function init(api, storeId, token) {
        _api     = api;
        _storeId = storeId;
        _token   = token;
    }

    // ── Dispatch ─────────────────────────────────────────────────
    async function dispatch(rawText) {
        const text = rawText.trim();
        if (!text) return;

        const lcText = text.toLowerCase().split(/\s/)[0];

        try {
            if (['ayuda', 'help', '?'].includes(lcText)) {
                return await cmdHelp();
            }
            if (lcText === 'estado') return await cmdEstado();
            if (lcText === 'listar-categorias') return await cmdListarCategorias();
            if (lcText === 'listar-pagos')      return await cmdListarPagos();
            if (lcText === 'ver-pedidos')        return await cmdVerPedidos(text);
            if (lcText === 'limpiar-pedidos')    return await cmdLimpiarPedidos();
            if (lcText === 'listar')             return await cmdListar(text);
            if (lcText === 'agregar')            return await cmdAgregar(text);
            if (lcText === 'editar')             return await cmdEditar(text);
            if (lcText === 'eliminar')           return await cmdEliminar(text);
            if (lcText === 'destacar')           return await cmdDestacar(text);
            if (lcText === 'agregar-imagen')     return await cmdAgregarImagen(text);
            if (lcText === 'agregar-categoria')  return await cmdAgregarCategoria(text);
            if (lcText === 'eliminar-categoria') return await cmdEliminarCategoria(text);
            if (lcText === 'aprobar-pedido')     return await cmdAprobarPedido(text);
            if (lcText === 'estado-pedido')      return await cmdEstadoPedido(text);
            if (lcText === 'agregar-pago')       return await cmdAgregarPago(text);
            if (lcText === 'eliminar-pago')      return await cmdEliminarPago(text);
            if (lcText === 'config-color')       return await cmdConfigColor(text);
            if (lcText === 'config-logo')        return await cmdConfigLogo();
            if (lcText === 'ver-config')         return await cmdVerConfig();
            if (lcText === 'config')             return await cmdConfig(text);
            if (lcText === 'exportar')           return await cmdExportar(text);
            if (['salir','logout','cerrar-sesion'].includes(lcText)) return cmdSalir();

            return AdminChat.typeMsg(`Comando no reconocido: <strong>${MvpUtils.escapeHtml(text)}</strong><br>Escribe <code>ayuda</code> para ver todos los comandos disponibles.`);
        } catch (err) {
            AdminChat.appendMsg('error', err.message || 'Error inesperado.');
        }
    }

    // ── Helper: parse arguments ───────────────────────────────────
    function args(text) { return MvpUtils.parseCommandArgs(text); }

    // ── COMMANDS ──────────────────────────────────────────────────

    async function cmdHelp() {
        document.getElementById('help-overlay')?.classList.add('show');
        AdminChat.appendMsg('bot', '📚 Mostrando ayuda. Haz clic en <strong>▶ Usar</strong> para insertar un ejemplo.');
    }

    // estado — store stats
    async function cmdEstado() {
        await AdminChat.typeMsg(async () => {
            const [products, orders, categories, payments] = await Promise.all([
                _api.getProducts(), _api.getOrders(),
                _api.getCategories(), _api.getPaymentMethods(),
            ]);
            const pending   = orders.filter(o => o.status === 'pendiente').length;
            const confirmed = orders.filter(o => o.status === 'confirmado').length;
            const revenue   = orders.filter(o => ['confirmado','enviado','entregado'].includes(o.status))
                                    .reduce((s, o) => s + (o.items || []).reduce((t, i) => t + i.price * i.qty, 0), 0);
            return `
            <div class="stat-grid">
              <div class="stat-card"><span class="stat-val">${products.length}</span><span class="stat-lbl">Productos</span></div>
              <div class="stat-card"><span class="stat-val">${categories.length}</span><span class="stat-lbl">Colecciones</span></div>
              <div class="stat-card"><span class="stat-val">${orders.length}</span><span class="stat-lbl">Pedidos totales</span></div>
              <div class="stat-card"><span class="stat-val">${pending}</span><span class="stat-lbl">Pendientes</span></div>
              <div class="stat-card"><span class="stat-val">${confirmed}</span><span class="stat-lbl">Confirmados</span></div>
              <div class="stat-card"><span class="stat-val">${MvpUtils.formatCurrency(revenue)}</span><span class="stat-lbl">Ingresos aprox.</span></div>
              <div class="stat-card"><span class="stat-val">${payments.length}</span><span class="stat-lbl">Métodos de pago</span></div>
            </div>`;
        });
    }

    // listar [colección]
    async function cmdListar(text) {
        await AdminChat.typeMsg(async () => {
            let products = await _api.getProducts();
            const a = args(text);
            const collection = Object.values(a).find(v => typeof v === 'string') ||
                               text.replace(/^listar\s*/i, '').trim();
            if (collection) {
                products = products.filter(p =>
                    p.category?.toLowerCase().includes(collection.toLowerCase())
                );
            }
            if (!products.length) return 'No se encontraron productos.';
            const rows = products.map(p =>
                `<tr>
                  <td><code>${p.id}</code></td>
                  <td>${MvpUtils.escapeHtml(p.name)}</td>
                  <td>${MvpUtils.escapeHtml(p.category || '—')}</td>
                  <td>${MvpUtils.formatCurrency(p.price)}</td>
                  <td>${p.featured ? '⭐' : '—'}</td>
                </tr>`
            ).join('');
            return `<div class="table-wrap"><table class="cmd-table">
              <thead><tr><th>ID</th><th>Nombre</th><th>Colección</th><th>Precio</th><th>Dest.</th></tr></thead>
              <tbody>${rows}</tbody>
            </table></div>
            <small>${products.length} producto(s)</small>`;
        });
    }

    // agregar nombre="..." precio=XX coleccion="..."
    async function cmdAgregar(text) {
        await AdminChat.typeMsg(async () => {
            const a = args(text);
            const name   = a.nombre || a.name;
            const price  = parseFloat(a.precio || a.price || 0);
            const cat    = a.coleccion || a.collection || a.categoria || a.category || '';
            const desc   = a.descripcion || a.description || '';
            const sizes  = a.tallas  ? String(a.tallas).split(',').map(s => s.trim()) : [];
            const colors = a.colores ? String(a.colores).split(',').map(s => s.trim()) : [];

            if (!name)  return '❌ Falta el campo <code>nombre</code>.';
            if (!price) return '❌ Falta el campo <code>precio</code>.';

            const products = await _api.getProducts();
            const categories = await _api.getCategories();

            const catObj = categories.find(c =>
                c.name.toLowerCase() === cat.toLowerCase()
            );

            const newProd = {
                id:          'prod-' + Date.now(),
                name,
                price,
                category:   cat,
                categoryId: catObj?.id || '',
                description: desc,
                sizes,
                colors,
                featured: false,
            };

            products.push(newProd);
            await _api.updateProducts(products);
            return `✅ Producto <strong>${MvpUtils.escapeHtml(name)}</strong> agregado.<br><code>ID: ${newProd.id}</code>`;
        });
    }

    // editar id=XXX campo=valor
    async function cmdEditar(text) {
        await AdminChat.typeMsg(async () => {
            const a  = args(text);
            const id = a.id;
            if (!id) return '❌ Falta el campo <code>id</code>.';

            const products = await _api.getProducts();
            const idx = products.findIndex(p => p.id === id);
            if (idx === -1) return `❌ Producto <code>${id}</code> no encontrado.`;

            const SKIP = ['id'];
            let changed = [];
            Object.entries(a).forEach(([k, v]) => {
                if (k === 'id' || k === '_cmd') return;
                if (k === 'precio' || k === 'price') { products[idx].price = parseFloat(v); changed.push('precio'); }
                else if (k === 'nombre' || k === 'name') { products[idx].name = v; changed.push('nombre'); }
                else if (k === 'descripcion' || k === 'description') { products[idx].description = v; changed.push('descripción'); }
                else if (k === 'categoria' || k === 'coleccion') { products[idx].category = v; changed.push('colección'); }
                else if (k === 'destacado' || k === 'featured') { products[idx].featured = v === 'true' || v === '1'; changed.push('destacado'); }
                else { products[idx][k] = v; changed.push(k); }
            });

            if (!changed.length) return '⚠️ No se especificaron campos a modificar.';

            await _api.updateProducts(products);
            return `✅ Producto <code>${id}</code> actualizado. Campos: ${changed.join(', ')}.`;
        });
    }

    // eliminar id=XXX
    async function cmdEliminar(text) {
        await AdminChat.typeMsg(async () => {
            const a  = args(text);
            const id = a.id;
            if (!id) return '❌ Falta el campo <code>id</code>.';

            let products = await _api.getProducts();
            const prev = products.length;
            products = products.filter(p => p.id !== id);
            if (products.length === prev) return `❌ Producto <code>${id}</code> no encontrado.`;

            await _api.updateProducts(products);
            return `🗑️ Producto <code>${id}</code> eliminado.`;
        });
    }

    // destacar id=XXX
    async function cmdDestacar(text) {
        await AdminChat.typeMsg(async () => {
            const a  = args(text);
            const id = a.id;
            if (!id) return '❌ Falta el campo <code>id</code>.';

            const products = await _api.getProducts();
            const prod = products.find(p => p.id === id);
            if (!prod) return `❌ Producto <code>${id}</code> no encontrado.`;

            prod.featured = !prod.featured;
            await _api.updateProducts(products);
            return `⭐ Producto <strong>${MvpUtils.escapeHtml(prod.name)}</strong> ${prod.featured ? 'marcado como destacado' : 'desmarcado como destacado'}.`;
        });
    }

    // agregar-imagen id=XXX
    async function cmdAgregarImagen(text) {
        const a  = args(text);
        const id = a.id;
        if (!id) {
            AdminChat.appendMsg('error', 'Falta el campo id. Ejemplo: agregar-imagen id=prod-001');
            return;
        }
        AdminChat.appendMsg('bot', '📂 Selecciona la imagen a subir...');
        try {
            const url = await ImageWebp.pick(_storeId, _token, id);
            // Update product image field
            const products = await _api.getProducts();
            const prod = products.find(p => p.id === id);
            if (prod) {
                prod.image = url;
                await _api.updateProducts(products);
            }
            AdminChat.appendMsg('bot', `🖼️ Imagen subida y asignada.<br><code>${url}</code>`);
        } catch (err) {
            AdminChat.appendMsg('error', err.message);
        }
    }

    // listar-categorias
    async function cmdListarCategorias() {
        await AdminChat.typeMsg(async () => {
            const cats = await _api.getCategories();
            if (!cats.length) return 'No hay colecciones registradas.';
            const rows = cats.map(c =>
                `<tr><td><code>${c.id}</code></td><td>${MvpUtils.escapeHtml(c.name)}</td></tr>`
            ).join('');
            return `<div class="table-wrap"><table class="cmd-table">
              <thead><tr><th>ID</th><th>Nombre</th></tr></thead>
              <tbody>${rows}</tbody>
            </table></div>`;
        });
    }

    // agregar-categoria nombre="..."
    async function cmdAgregarCategoria(text) {
        await AdminChat.typeMsg(async () => {
            const a    = args(text);
            const name = a.nombre || a.name || text.replace(/^agregar-categoria\s*/i, '').trim();
            if (!name) return '❌ Falta el campo <code>nombre</code>.';

            const cats = await _api.getCategories();
            const newCat = { id: 'cat-' + Date.now(), name };
            cats.push(newCat);
            await _api.updateCategories(cats);
            return `✅ Colección <strong>${MvpUtils.escapeHtml(name)}</strong> agregada (<code>${newCat.id}</code>).`;
        });
    }

    // eliminar-categoria id=XXX
    async function cmdEliminarCategoria(text) {
        await AdminChat.typeMsg(async () => {
            const a  = args(text);
            const id = a.id;
            if (!id) return '❌ Falta el campo <code>id</code>.';
            let cats = await _api.getCategories();
            const prev = cats.length;
            cats = cats.filter(c => c.id !== id);
            if (cats.length === prev) return `❌ Colección <code>${id}</code> no encontrada.`;
            await _api.updateCategories(cats);
            return `🗑️ Colección <code>${id}</code> eliminada.`;
        });
    }

    // ver-pedidos [estado=X]
    async function cmdVerPedidos(text) {
        await AdminChat.typeMsg(async () => {
            const a = args(text);
            let orders = await _api.getOrders();
            if (a.estado) {
                orders = orders.filter(o => o.status?.toLowerCase() === a.estado.toLowerCase());
            }
            if (!orders.length) return 'No hay pedidos' + (a.estado ? ` con estado "${a.estado}"` : '') + '.';
            const rows = orders.map(o => {
                const total = (o.items || []).reduce((s, i) => s + i.price * i.qty, 0);
                return `<tr>
                  <td><code>${o.id}</code></td>
                  <td>${MvpUtils.escapeHtml(o.customer?.name || '—')}</td>
                  <td><span class="status-badge status-${o.status}">${o.status}</span></td>
                  <td>${MvpUtils.formatCurrency(total)}</td>
                  <td>${MvpUtils.formatDate(o.date)}</td>
                </tr>`;
            }).join('');
            return `<div class="table-wrap"><table class="cmd-table">
              <thead><tr><th>ID</th><th>Cliente</th><th>Estado</th><th>Total</th><th>Fecha</th></tr></thead>
              <tbody>${rows}</tbody>
            </table></div>
            <small>${orders.length} pedido(s)</small>`;
        });
    }

    // aprobar-pedido id=XXX
    async function cmdAprobarPedido(text) {
        await AdminChat.typeMsg(async () => {
            const a  = args(text);
            const id = a.id;
            if (!id) return '❌ Falta el campo <code>id</code>.';
            await _api.updateOrderStatus(id, 'confirmado');
            return `✅ Pedido <code>${id}</code> confirmado.`;
        });
    }

    // estado-pedido id=XXX estado=enviado
    async function cmdEstadoPedido(text) {
        await AdminChat.typeMsg(async () => {
            const a      = args(text);
            const id     = a.id;
            const estado = a.estado;
            if (!id)     return '❌ Falta el campo <code>id</code>.';
            if (!estado) return '❌ Falta el campo <code>estado</code>.';
            const VALID = ['pendiente', 'confirmado', 'enviado', 'entregado', 'cancelado'];
            if (!VALID.includes(estado.toLowerCase())) {
                return `❌ Estado inválido. Opciones: ${VALID.join(', ')}.`;
            }
            await _api.updateOrderStatus(id, estado.toLowerCase());
            return `📦 Pedido <code>${id}</code> → <strong>${estado}</strong>.`;
        });
    }

    // limpiar-pedidos
    async function cmdLimpiarPedidos() {
        await AdminChat.typeMsg(async () => {
            await _api.clearOrders();
            return '🗑️ Todos los pedidos han sido eliminados.';
        });
    }

    // listar-pagos
    async function cmdListarPagos() {
        await AdminChat.typeMsg(async () => {
            const pays = await _api.getPaymentMethods();
            if (!pays.length) return 'No hay métodos de pago configurados.';
            const rows = pays.map(p =>
                `<tr>
                  <td><code>${p.id}</code></td>
                  <td>${p.icon || ''} ${MvpUtils.escapeHtml(p.name)}</td>
                  <td style="white-space:pre-wrap;font-size:.8rem">${MvpUtils.escapeHtml(p.instructions || '—')}</td>
                </tr>`
            ).join('');
            return `<div class="table-wrap"><table class="cmd-table">
              <thead><tr><th>ID</th><th>Nombre</th><th>Instrucciones</th></tr></thead>
              <tbody>${rows}</tbody>
            </table></div>`;
        });
    }

    // agregar-pago nombre="..." instrucciones="..." icono="💳"
    async function cmdAgregarPago(text) {
        await AdminChat.typeMsg(async () => {
            const a    = args(text);
            const name = a.nombre || a.name;
            const inst = a.instrucciones || a.instructions || '';
            const icon = a.icono || a.icon || '💳';
            if (!name) return '❌ Falta el campo <code>nombre</code>.';

            const pays = await _api.getPaymentMethods();
            const pm = { id: 'pay-' + Date.now(), name, instructions: inst, icon };
            pays.push(pm);
            await _api.updatePaymentMethods(pays);
            return `✅ Método de pago <strong>${MvpUtils.escapeHtml(name)}</strong> agregado (<code>${pm.id}</code>).`;
        });
    }

    // eliminar-pago id=XXX
    async function cmdEliminarPago(text) {
        await AdminChat.typeMsg(async () => {
            const a  = args(text);
            const id = a.id;
            if (!id) return '❌ Falta el campo <code>id</code>.';
            let pays = await _api.getPaymentMethods();
            const prev = pays.length;
            pays = pays.filter(p => p.id !== id);
            if (pays.length === prev) return `❌ Método <code>${id}</code> no encontrado.`;
            await _api.updatePaymentMethods(pays);
            return `🗑️ Método de pago <code>${id}</code> eliminado.`;
        });
    }

    // config campo=valor
    async function cmdConfig(text) {
        await AdminChat.typeMsg(async () => {
            const a = args(text);
            const { _cmd, ...fields } = a;

            if (!Object.keys(fields).length) return '❌ Especifica al menos un campo. Ej: <code>config storeName="Mi Tienda"</code>';

            const cfg = await _api.getConfig();
            const changed = [];
            Object.entries(fields).forEach(([k, v]) => {
                cfg[k] = v; changed.push(k);
            });
            await _api.updateConfig(cfg);
            return `✅ Configuración actualizada: ${changed.map(k => `<code>${k}</code>`).join(', ')}.`;
        });
    }

    // config-color primario=#HEX
    async function cmdConfigColor(text) {
        await AdminChat.typeMsg(async () => {
            const a = args(text);
            const primary = a.primario || a.primary;
            if (!primary) return '❌ Falta el campo <code>primario</code>. Ej: <code>config-color primario=#ff6b35</code>';

            const cfg = await _api.getConfig();
            cfg.colors = cfg.colors || {};
            cfg.colors.primary = primary;
            await _api.updateConfig(cfg);

            // Apply immediately
            document.documentElement.style.setProperty('--clr-primary', primary);

            return `🎨 Color primario cambiado a <span style="color:${primary}">■</span> <code>${primary}</code>.`;
        });
    }

    // config-logo
    async function cmdConfigLogo() {
        AdminChat.appendMsg('bot', '📂 Selecciona el logo de la tienda...');
        try {
            const url = await ImageWebp.pick(_storeId, _token, 'logo');
            const cfg = await _api.getConfig();
            cfg.logoMain = url;
            await _api.updateConfig(cfg);
            AdminChat.appendMsg('bot', `🖼️ Logo actualizado.<br><code>${url}</code>`);
        } catch (err) {
            AdminChat.appendMsg('error', err.message);
        }
    }

    // ver-config
    async function cmdVerConfig() {
        await AdminChat.typeMsg(async () => {
            const cfg = await _api.getConfig();
            const entries = Object.entries(cfg)
                .filter(([k]) => !['texts'].includes(k))
                .map(([k, v]) => {
                    const val = typeof v === 'object' ? JSON.stringify(v) : String(v);
                    return `<tr><td><code>${k}</code></td><td>${MvpUtils.escapeHtml(val)}</td></tr>`;
                }).join('');
            return `<div class="table-wrap"><table class="cmd-table">
              <thead><tr><th>Campo</th><th>Valor</th></tr></thead>
              <tbody>${entries}</tbody>
            </table></div>`;
        });
    }

    // exportar productos
    async function cmdExportar(text) {
        const what = text.replace(/^exportar\s*/i, '').trim().toLowerCase();
        AdminChat.appendMsg('bot', `⏳ Preparando exportación...`);
        try {
            let data, filename;
            if (what === 'productos' || what === 'products') {
                data = await _api.getProducts(); filename = 'products.json';
            } else if (what === 'pedidos' || what === 'orders') {
                data = await _api.getOrders(); filename = 'orders.json';
            } else if (what === 'config') {
                data = await _api.getConfig(); filename = 'config.json';
            } else {
                AdminChat.appendMsg('error', 'Especifica qué exportar: productos, pedidos, config');
                return;
            }
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            AdminChat.appendMsg('bot', `📥 <strong>${filename}</strong> descargado.`);
        } catch (err) {
            AdminChat.appendMsg('error', err.message);
        }
    }

    // salir
    function cmdSalir() {
        AdminChat.appendMsg('bot', '👋 Cerrando sesión...');
        setTimeout(() => AdminAuth.logout(), 800);
    }

    return { init, dispatch };
})();

window.AdminCommands = AdminCommands;

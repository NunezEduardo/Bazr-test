/**
 * MVP — Capa de Datos Centralizada (shared/api.js)
 * =================================================
 * Multi-tenant. Todas las peticiones de datos pasan por aquí.
 * Para producción: cambia USE_REST_API a true y configura API_BASE.
 *
 * Modos:
 *   USE_REST_API = false → JSON estáticos + localStorage como caché
 *   USE_REST_API = true  → endpoints REST reales (/api/:storeId/...)
 *
 * Uso:
 *   const API = MvpAPI.forStore('bazr');
 *   const products = await API.getProducts();
 */

const MvpAPI = (() => {
    'use strict';

    // ── Configuración global ───────────────────────────────────────────────────
    const USE_REST_API = false;     // true = producción con backend
    const API_BASE     = '/api';    // base URL del backend REST

    // ── Fábrica por tienda ────────────────────────────────────────────────────
    function forStore(storeId) {

        // ── Storage Keys (namespace por tienda) ────────────────────────────────
        const ns = `mvp_${storeId}`;
        const SK = {
            products:  `${ns}_products`,
            categories:`${ns}_categories`,
            orders:    `${ns}_orders`,
            payments:  `${ns}_payment_methods`,
            config:    `${ns}_config`,
            auth:      `${ns}_token`,
        };

        // ── localStorage helpers ────────────────────────────────────────────────
        function lsGet(key, def) {
            try { const v = JSON.parse(localStorage.getItem(key)); return v !== null ? v : def; }
            catch { return def; }
        }
        function lsSet(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
        function lsClear()       { Object.values(SK).forEach(k => localStorage.removeItem(k)); }

        // ── Auth token ─────────────────────────────────────────────────────────
        function getToken()        { return sessionStorage.getItem(SK.auth) || ''; }
        function setToken(t)       { sessionStorage.setItem(SK.auth, t); }
        function clearToken()      { sessionStorage.removeItem(SK.auth); }
        function isAuthenticated() { return !!getToken(); }

        // ── REST helpers ────────────────────────────────────────────────────────
        const headers = () => ({
            'Content-Type': 'application/json',
            'X-Store-Id':   storeId,
            'Authorization': `Bearer ${getToken()}`,
        });

        async function restGet(resource) {
            const r = await fetch(`${API_BASE}/${storeId}/${resource}`, { headers: headers() });
            if (!r.ok) throw new Error(`GET ${resource} → ${r.status}`);
            return r.json();
        }

        async function restPut(resource, body) {
            const r = await fetch(`${API_BASE}/${storeId}/${resource}`, {
                method: 'PUT', headers: headers(), body: JSON.stringify(body),
            });
            if (!r.ok) throw new Error(`PUT ${resource} → ${r.status}`);
            return r.json();
        }

        async function restPost(resource, body) {
            const r = await fetch(`${API_BASE}/${storeId}/${resource}`, {
                method: 'POST', headers: headers(), body: JSON.stringify(body),
            });
            if (!r.ok) throw new Error(`POST ${resource} → ${r.status}`);
            return r.json();
        }

        async function restDelete(resource) {
            const r = await fetch(`${API_BASE}/${storeId}/${resource}`, {
                method: 'DELETE', headers: headers(),
            });
            if (!r.ok) throw new Error(`DELETE ${resource} → ${r.status}`);
            return r.json();
        }

        async function fetchStatic(path) {
            try {
                const r = await fetch(path);
                if (!r.ok) return null;
                return await r.json();
            } catch { return null; }
        }

        // ── Data path helper ───────────────────────────────────────────────────
        const dataPath = (resource) => `../data/${storeId}/${resource}`;

        // ══════════════════════════════════════════════════════════════════════
        // PRODUCTOS
        // ══════════════════════════════════════════════════════════════════════
        async function getProducts() {
            if (USE_REST_API) {
                const data = await restGet('products');
                lsSet(SK.products, data);
                return data;
            }
            const cached = lsGet(SK.products, null);
            if (cached) return cached;
            const data = await fetchStatic(dataPath('products.json')) || [];
            lsSet(SK.products, data);
            return data;
        }

        async function saveProducts(products) {
            if (USE_REST_API) { await restPut('products', products); }
            lsSet(SK.products, products);
        }

        async function addProduct(product) {
            const products = await getProducts();
            product.id = product.id || ('prod-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
            products.push(product);
            await saveProducts(products);
            return product;
        }

        async function updateProduct(product) {
            const products = await getProducts();
            const idx = products.findIndex(p => p.id === product.id);
            if (idx === -1) throw new Error('Producto no encontrado: ' + product.id);
            products[idx] = { ...products[idx], ...product };
            await saveProducts(products);
            return products[idx];
        }

        async function deleteProduct(productId) {
            let products = await getProducts();
            products = products.filter(p => p.id !== productId);
            await saveProducts(products);
        }

        // ══════════════════════════════════════════════════════════════════════
        // CATEGORÍAS
        // ══════════════════════════════════════════════════════════════════════
        async function getCategories() {
            if (USE_REST_API) {
                const data = await restGet('categories');
                lsSet(SK.categories, data);
                return data;
            }
            const cached = lsGet(SK.categories, null);
            if (cached) return cached;
            const data = await fetchStatic(dataPath('categories.json')) || [];
            lsSet(SK.categories, data);
            return data;
        }

        async function saveCategories(categories) {
            if (USE_REST_API) { await restPut('categories', categories); }
            lsSet(SK.categories, categories);
        }

        async function addCategory(category) {
            const cats = await getCategories();
            category.id = category.id || ('cat-' + Date.now());
            cats.push(category);
            await saveCategories(cats);
            return category;
        }

        async function deleteCategory(categoryId) {
            let cats = await getCategories();
            cats = cats.filter(c => c.id !== categoryId);
            await saveCategories(cats);
        }

        // ══════════════════════════════════════════════════════════════════════
        // PEDIDOS
        // ══════════════════════════════════════════════════════════════════════
        async function getOrders(forceRefresh = false) {
            if (USE_REST_API) {
                const data = await restGet('orders');
                lsSet(SK.orders, data);
                return data;
            }
            if (!forceRefresh) {
                const fromFile = await fetchStatic(dataPath('orders.json'));
                if (Array.isArray(fromFile)) {
                    lsSet(SK.orders, fromFile);
                    return fromFile;
                }
            }
            return lsGet(SK.orders, []);
        }

        async function saveOrders(orders) {
            if (USE_REST_API) { await restPut('orders', orders); }
            lsSet(SK.orders, orders);
        }

        async function addOrder(order) {
            order.id     = order.id     || ('ord-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6));
            order.date   = order.date   || new Date().toISOString();
            order.status = order.status || 'pendiente';
            if (USE_REST_API) { return restPost('orders', order); }
            const orders = await getOrders(true);
            orders.push(order);
            lsSet(SK.orders, orders);
            return order;
        }

        async function updateOrderStatus(orderId, newStatus) {
            if (USE_REST_API) {
                return restPost(`orders/${orderId}/status`, { status: newStatus });
            }
            const orders = await getOrders(true);
            const idx = orders.findIndex(o => o.id === orderId);
            if (idx === -1) throw new Error('Orden no encontrada: ' + orderId);
            orders[idx].status = newStatus;
            lsSet(SK.orders, orders);
            return orders[idx];
        }

        async function clearOrders() {
            if (USE_REST_API) { await restDelete('orders'); }
            lsSet(SK.orders, []);
        }

        // ══════════════════════════════════════════════════════════════════════
        // MÉTODOS DE PAGO
        // ══════════════════════════════════════════════════════════════════════
        async function getPaymentMethods() {
            if (USE_REST_API) {
                const data = await restGet('payment-methods');
                lsSet(SK.payments, data);
                return data;
            }
            const cached = lsGet(SK.payments, null);
            if (cached) return cached;
            const data = await fetchStatic(dataPath('payment_methods.json')) || [];
            lsSet(SK.payments, data);
            return data;
        }

        async function savePaymentMethods(methods) {
            if (USE_REST_API) { await restPut('payment-methods', methods); }
            lsSet(SK.payments, methods);
        }

        async function addPaymentMethod(method) {
            const methods = await getPaymentMethods();
            method.id = method.id || ('pay-' + Date.now());
            methods.push(method);
            await savePaymentMethods(methods);
            return method;
        }

        async function deletePaymentMethod(methodId) {
            let methods = await getPaymentMethods();
            methods = methods.filter(m => m.id !== methodId);
            await savePaymentMethods(methods);
        }

        // ══════════════════════════════════════════════════════════════════════
        // CONFIGURACIÓN / CONFIG
        // ══════════════════════════════════════════════════════════════════════
        async function getConfig() {
            if (USE_REST_API) {
                const data = await restGet('config');
                lsSet(SK.config, data);
                return data;
            }
            const cached = lsGet(SK.config, null);
            if (cached) return cached;
            const data = await fetchStatic(dataPath('config.json')) || {};
            lsSet(SK.config, data);
            return data;
        }

        async function saveConfig(cfg) {
            if (USE_REST_API) { await restPut('config', cfg); }
            lsSet(SK.config, cfg);
        }

        async function updateConfigKey(key, value) {
            const cfg = await getConfig();
            // Support dot notation: "colors.primary" → cfg.colors.primary
            const keys = key.split('.');
            let obj = cfg;
            for (let i = 0; i < keys.length - 1; i++) {
                if (!obj[keys[i]]) obj[keys[i]] = {};
                obj = obj[keys[i]];
            }
            obj[keys[keys.length - 1]] = value;
            await saveConfig(cfg);
            return cfg;
        }

        // ══════════════════════════════════════════════════════════════════════
        // AUTENTICACIÓN ADMIN
        // ══════════════════════════════════════════════════════════════════════
        async function adminLogin(password) {
            if (USE_REST_API) {
                try {
                    const r = await fetch(`${API_BASE}/auth/login`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Store-Id': storeId },
                        body: JSON.stringify({ password, storeId }),
                    });
                    if (!r.ok) return false;
                    const { token } = await r.json();
                    setToken(token);
                    return true;
                } catch { return false; }
            }
            // Modo local: contraseña en localStorage (configurable)
            const LOCAL_ADMIN_PASS = localStorage.getItem(`mvp_${storeId}_admin_pass`) || 'admin';
            if (password === LOCAL_ADMIN_PASS) {
                setToken('local-' + btoa(`${storeId}:${Date.now()}`));
                return true;
            }
            return false;
        }

        function adminLogout() { clearToken(); }

        // ══════════════════════════════════════════════════════════════════════
        // LICENCIAS
        // ══════════════════════════════════════════════════════════════════════
        async function checkLicense() {
            if (USE_REST_API) {
                try {
                    const r = await fetch(`${API_BASE}/licenses/${storeId}`, { headers: headers() });
                    if (!r.ok) return { active: false };
                    return r.json();
                } catch { return { active: false }; }
            }
            const licenses = await fetchStatic('../data/licenses.json') || {};
            return licenses[storeId] || { active: false };
        }

        // ══════════════════════════════════════════════════════════════════════
        // IMÁGENES
        // ══════════════════════════════════════════════════════════════════════
        async function uploadImage(productId, webpBlob) {
            if (!USE_REST_API) {
                // Modo local: convertir a base64 y guardar en producto
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload  = () => resolve({ url: reader.result, productId });
                    reader.onerror = reject;
                    reader.readAsDataURL(webpBlob);
                });
            }
            const fd = new FormData();
            fd.append('image', webpBlob, `${productId}.webp`);
            fd.append('productId', productId);
            const r = await fetch(`${API_BASE}/${storeId}/images`, {
                method: 'POST',
                headers: { 'X-Store-Id': storeId, 'Authorization': `Bearer ${getToken()}` },
                body: fd,
            });
            if (!r.ok) throw new Error('Upload failed: ' + r.status);
            return r.json();
        }

        // ══════════════════════════════════════════════════════════════════════
        // UTILIDADES
        // ══════════════════════════════════════════════════════════════════════
        function exportJSON(data, filename) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url  = URL.createObjectURL(blob);
            const a    = document.createElement('a');
            a.href = url; a.download = filename; a.click();
            URL.revokeObjectURL(url);
        }

        function clearCache() { lsClear(); }

        // ── API pública de la tienda ────────────────────────────────────────────
        return {
            storeId,
            isRestMode: () => USE_REST_API,
            // Productos
            getProducts, saveProducts, addProduct, updateProduct, deleteProduct,
            // Categorías
            getCategories, saveCategories, addCategory, deleteCategory,
            // Pedidos
            getOrders, saveOrders, addOrder, updateOrderStatus, clearOrders,
            // Pagos
            getPaymentMethods, savePaymentMethods, addPaymentMethod, deletePaymentMethod,
            // Config
            getConfig, saveConfig, updateConfigKey,
            // Auth
            adminLogin, adminLogout, isAuthenticated, getToken, setToken, clearToken,
            // Licencias
            checkLicense,
            // Imágenes
            uploadImage,
            // Utils
            exportJSON, clearCache,
            SK, lsGet, lsSet,
        };
    }

    // ── API pública del módulo ────────────────────────────────────────────────
    return { forStore };
})();

// Exponer globalmente
window.MvpAPI = MvpAPI;

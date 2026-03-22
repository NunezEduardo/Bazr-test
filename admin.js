/* ============================================
   BAZR — Admin Panel (Multi-JSON Architecture)
   Cada tipo de dato tiene su propio JSON:
     data/products.json
     data/categories.json
     data/orders.json
     data/payment_methods.json
     data/settings.json
   ============================================ */

(function () {
    'use strict';

    // ─── Storage Keys (mirrors of each JSON file) ─────────────────────────────
    const SK = {
        products:  'bazr_products',
        cats:      'bazr_categories',
        orders:    'bazr_orders',
        payments:  'bazr_payment_methods',
        settings:  'bazr_settings'
    };

    // ─── State ────────────────────────────────────────────────────────────────
    let products    = [];
    let categories  = [];
    let orders      = [];
    let payMethods  = {};
    let settings    = {};

    let editingId       = null;
    let deleteTargetId  = null;
    let formColors      = [];
    let formSizes       = [];
    let formModels      = [];
    let imageDataUrl    = '';

    const $ = s => document.querySelector(s);
    const $$ = s => document.querySelectorAll(s);

    // ─── Generic localStorage helpers ─────────────────────────────────────────
    function ls_get(key, def) {
        try { const v = JSON.parse(localStorage.getItem(key)); return v !== null ? v : def; }
        catch { return def; }
    }
    function ls_set(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

    // ─── Persist helpers (localStorage + trigger JSON download on demand) ─────
    function saveProducts()  { ls_set(SK.products,  products);  updateJsonPreview(); }
    function saveCategories(){ ls_set(SK.cats,       categories); }
    function saveOrders()    { ls_set(SK.orders,     orders); }
    function savePayments()  { ls_set(SK.payments,   payMethods); }
    function saveSettings()  { ls_set(SK.settings,   settings); }

    // ─── Load from localStorage, fall back to fetch JSON ─────────────────────
    async function loadAll() {
        products   = ls_get(SK.products,  null);
        categories = ls_get(SK.cats,      null);
        // Pedidos: SIEMPRE empezar desde el JSON del servidor (no cachear en localStorage)
        orders     = null;
        payMethods = ls_get(SK.payments,  null);
        settings   = ls_get(SK.settings,  null);

        const loads = [];
        if (!products)   loads.push(fetchJSON('data/products.json').then(d => { products   = Array.isArray(d) ? d : []; ls_set(SK.products, products); }));
        if (!categories) loads.push(fetchJSON('data/categories.json').then(d => { categories = Array.isArray(d) ? d : []; ls_set(SK.cats, categories); }));
        // Pedidos: leer siempre del fichero (fuente de verdad) y luego del localStorage si el fichero falla
        loads.push(fetchJSON('data/orders.json').then(d => {
            if (Array.isArray(d)) {
                orders = d;
            } else {
                orders = ls_get(SK.orders, []);
            }
        }));
        if (!payMethods) loads.push(fetchJSON('data/payment_methods.json').then(d => { payMethods = (d && typeof d === 'object' && !Array.isArray(d)) ? d : {}; ls_set(SK.payments, payMethods); }));
        if (!settings)   loads.push(fetchJSON('data/settings.json').then(d => { settings = (d && typeof d === 'object' && !Array.isArray(d)) ? d : {}; ls_set(SK.settings, settings); }));

        await Promise.allSettled(loads);

        // Garantías de tipo
        if (!Array.isArray(products))   products   = [];
        if (!Array.isArray(categories)) categories = [];
        if (!Array.isArray(orders))     orders     = [];
        if (!payMethods || Array.isArray(payMethods)) payMethods = {};
        if (!settings   || Array.isArray(settings))   settings   = {};

        // Sincronizar pedidos al localStorage para que el script.js los lea
        ls_set(SK.orders, orders);
    }

    async function fetchJSON(url) {
        try {
            const r = await fetch(url);
            if (!r.ok) return null;
            return await r.json();
        } catch { return null; }
    }

    // ─── Guardar JSON en servidor (si hay endpoint de escritura) ──────────────
    // En producción con servidor PHP/Node, este endpoint escribe el archivo.
    const SERVER_SAVE_ENDPOINT = 'api/save.php';
    const USE_SERVER_SAVE      = false;
    const ADMIN_KEY_HEADER     = 'CAMBIA_ESTA_CLAVE_SECRETA';

    async function saveToServer(filename, data) {
        if (!USE_SERVER_SAVE) return false;
        try {
            const res = await fetch(SERVER_SAVE_ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Key': ADMIN_KEY_HEADER },
                body: JSON.stringify({ file: filename, data })
            });
            return res.ok;
        } catch { return false; }
    }

    // Wrapper: guarda en localStorage + intenta sincronizar al servidor
    async function persistOrders() {
        ls_set(SK.orders, orders);
        await saveToServer('data/orders.json', orders);
    }
    async function persistPayments() {
        ls_set(SK.payments, payMethods);
        await saveToServer('data/payment_methods.json', payMethods);
    }
    async function persistSettings() {
        ls_set(SK.settings, settings);
        await saveToServer('data/settings.json', settings);
    }

    // ─── INIT ─────────────────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
        // Limpiar claves legacy de versiones anteriores
        ['morena_products', 'bazr_orders_v0', 'bazr_settings_v0'].forEach(k => localStorage.removeItem(k));
        // Los pedidos siempre se leen del JSON del servidor (no del localStorage)
        localStorage.removeItem('bazr_orders');

        await loadAll();
        setupSidebar();
        setupNavigation();
        setupProducts();
        setupCategories();
        setupOrdersSection();
        setupPaymentSection();
        setupInvoiceSection();
        setupCustomize();
        setupExportImport();
        renderProductsTable();
        updateStats();
        updateJsonPreview();
    });

    // ─── SIDEBAR ──────────────────────────────────────────────────────────────
    function setupSidebar() {
        const toggle = $('#sidebar-toggle'), sidebar = $('#sidebar');
        if (toggle && sidebar) toggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    // ─── NAVIGATION ───────────────────────────────────────────────────────────
    function setupNavigation() {
        $$('.sidebar-link').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                switchSection(link.dataset.section);
                $$('.sidebar-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                $('#sidebar').classList.remove('open');
            });
        });

        const addNewBtn = $('#btn-add-new');
        if (addNewBtn) addNewBtn.addEventListener('click', () => {
            resetForm();
            switchSection('add-section');
            $$('.sidebar-link').forEach(l => l.classList.remove('active'));
            const addLink = document.querySelector('.sidebar-link[data-section="add-section"]');
            if (addLink) addLink.classList.add('active');
        });
    }

    function switchSection(id) {
        $$('.content-section, .admin-section').forEach(s => s.classList.remove('active'));
        const sec = document.getElementById(id);
        if (sec) sec.classList.add('active');
        const titles = {
            'products-section':       'Gestión de Productos',
            'add-section':            editingId ? 'Editar Producto' : 'Agregar Producto',
            'catalogs-section':       'Categorías',
            'export-section':         'Exportar / Importar',
            'customize-section':      'Personalizar Tienda',
            'orders-section':         'Órdenes',
            'payments-section':       'Métodos de Pago',
            'invoice-settings-section':'Nota de Transacción'
        };
        const titleEl = $('#topbar-title');
        if (titleEl) titleEl.textContent = titles[id] || '';
    }

    // ─── TOAST ────────────────────────────────────────────────────────────────
    function showToast(msg) {
        const t = $('#admin-toast'), m = $('#admin-toast-msg');
        if (!t || !m) return;
        m.textContent = msg; t.classList.remove('hidden');
        requestAnimationFrame(() => t.classList.add('show'));
        setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.classList.add('hidden'), 300); }, 3000);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // PRODUCTS
    // ══════════════════════════════════════════════════════════════════════════
    function setupProducts() {
        setupForm();
        setupImageUpload();
        setupDynamicLists();
        setupDeleteModal();
        setupSearch();
    }

    function renderProductsTable(filter = '') {
        const tbody        = $('#products-tbody');
        const empty        = $('#admin-no-products');
        const tableWrapper = $('.products-table-wrapper');

        let filtered = products;
        if (filter) {
            const q = filter.toLowerCase();
            filtered = products.filter(p => p.name.toLowerCase().includes(q) || (p.collection || '').toLowerCase().includes(q));
        }

        if (filtered.length === 0) {
            if (tbody) tbody.innerHTML = '';
            if (tableWrapper) tableWrapper.style.display = 'none';
            if (empty) empty.classList.remove('hidden');
            return;
        }
        if (tableWrapper) tableWrapper.style.display = '';
        if (empty) empty.classList.add('hidden');

        tbody.innerHTML = filtered.map(p => {
            const imgHtml = p.image
                ? `<div class="table-img"><img src="${p.image}" alt="${p.name}"></div>`
                : `<div class="table-img-placeholder"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/></svg></div>`;
            const colorsHtml = (p.colors || []).slice(0, 5).map(c => `<div class="table-color" style="background:${c.hex}" title="${c.name}"></div>`).join('');
            const sizesHtml  = (p.sizes  || []).slice(0, 4).map(s => `<span class="table-size">${s}</span>`).join('') + ((p.sizes||[]).length > 4 ? `<span class="table-size">+${p.sizes.length - 4}</span>` : '');
            return `<tr data-id="${p.id}">
              <td>${imgHtml}</td>
              <td><div class="table-product-name">${p.name}</div>${p.featured ? '<span style="font-size:0.65rem;color:var(--accent);">★ DESTACADO</span>' : ''}</td>
              <td><span class="table-collection">${p.collection || ''}</span></td>
              <td>$${(p.price||0).toFixed(2)}</td>
              <td><div class="table-colors">${colorsHtml}</div></td>
              <td><div class="table-sizes">${sizesHtml}</div></td>
              <td><div class="table-actions">
                <button class="table-btn edit-btn" data-id="${p.id}" title="Editar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                <button class="table-btn delete" data-id="${p.id}" title="Eliminar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button>
              </div></td>
            </tr>`;
        }).join('');

        tbody.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', () => editProduct(btn.dataset.id)));
        tbody.querySelectorAll('.table-btn.delete').forEach(btn => btn.addEventListener('click', () => showDeleteModal(btn.dataset.id)));
    }

    function updateStats() {
        const tp = $('#total-products'), tc = $('#total-collections');
        if (tp) tp.textContent = products.length;
        if (tc) tc.textContent = new Set(products.map(p => p.collection)).size;
    }

    function updateCollectionsList() {
        const dl = $('#collections-list'); if (!dl) return;
        const names = categories.length ? categories.map(c => c.name) : [...new Set(products.map(p => p.collection))];
        dl.innerHTML = names.map(n => `<option value="${n}">`).join('');
    }

    function updateJsonPreview() {
        const el = $('#json-preview'); if (!el) return;
        const clean = products.map(p => ({ ...p, image: p.image ? '[image data]' : '' }));
        el.textContent = JSON.stringify(clean, null, 2);
    }

    // ── Form ──────────────────────────────────────────────────────────────────
    function setupForm() {
        const form = $('#product-form');
        if (form) form.addEventListener('submit', e => { e.preventDefault(); saveForm(); });
        const cancelBtn = $('#form-cancel-btn');
        if (cancelBtn) cancelBtn.addEventListener('click', () => { resetForm(); switchSection('products-section'); });
    }

    function resetForm() {
        editingId = null; formColors = []; formSizes = []; formModels = []; imageDataUrl = '';
        const form = $('#product-form'); if (form) form.reset();
        const editId = $('#edit-id'); if (editId) editId.value = '';
        const ft = $('#form-title'); if (ft) ft.textContent = 'Agregar Nuevo Producto';
        const fsb = $('#form-submit-btn'); if (fsb) fsb.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Guardar Producto';
        renderDynamicList('colors'); renderDynamicList('sizes'); renderDynamicList('models');
        const ph = $('#upload-placeholder'), pv = $('#upload-preview');
        if (ph) ph.classList.remove('hidden');
        if (pv) pv.classList.add('hidden');
        updateCollectionsList();
    }

    function saveForm() {
        const name        = ($('#prod-name') || {}).value?.trim() || '';
        const collection  = ($('#prod-collection') || {}).value?.trim() || '';
        const price       = parseFloat(($('#prod-price') || {}).value);
        const description = ($('#prod-description') || {}).value?.trim() || '';
        const material    = ($('#prod-material') || {}).value?.trim() || '';
        const featured    = ($('#prod-featured') || {}).checked || false;

        if (!name || !collection || isNaN(price)) { showToast('Completa los campos obligatorios'); return; }

        if (editingId) {
            const idx = products.findIndex(p => p.id === editingId);
            if (idx !== -1) {
                products[idx] = { ...products[idx], name, collection, price, description, material, featured, colors: [...formColors], sizes: [...formSizes], models: [...formModels], image: imageDataUrl || products[idx].image };
            }
            showToast('Producto actualizado');
        } else {
            products.push({ id: 'prod-' + Date.now(), name, collection, price, description, material, featured, colors: [...formColors], sizes: [...formSizes], models: [...formModels], image: imageDataUrl });
            showToast('Producto agregado');
        }

        saveProducts(); renderProductsTable(); updateStats(); updateCollectionsList();
        resetForm(); switchSection('products-section');
    }

    function editProduct(id) {
        const p = products.find(p => p.id === id); if (!p) return;
        editingId = id; formColors = [...(p.colors||[])]; formSizes = [...(p.sizes||[])]; formModels = [...(p.models||[])]; imageDataUrl = p.image || '';
        const fields = [['#prod-name', p.name], ['#prod-collection', p.collection], ['#prod-price', p.price], ['#prod-description', p.description||''], ['#prod-material', p.material||'']];
        fields.forEach(([sel, val]) => { const el = $(sel); if (el) el.value = val; });
        const fc = $('#prod-featured'); if (fc) fc.checked = p.featured || false;
        if (imageDataUrl) {
            const pi = $('#preview-img'); if (pi) pi.src = imageDataUrl;
            const ph = $('#upload-placeholder'), pv = $('#upload-preview');
            if (ph) ph.classList.add('hidden'); if (pv) pv.classList.remove('hidden');
        }
        renderDynamicList('colors'); renderDynamicList('sizes'); renderDynamicList('models');
        const ft = $('#form-title'); if (ft) ft.textContent = 'Editar Producto';
        const fsb = $('#form-submit-btn'); if (fsb) fsb.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Actualizar Producto';
        switchSection('add-section');
        const titleEl = $('#topbar-title'); if (titleEl) titleEl.textContent = 'Editar Producto';
    }

    // ── Image Upload ───────────────────────────────────────────────────────────
    function setupImageUpload() {
        const area = $('#image-upload-area'), input = $('#prod-image'), removeBtn = $('#preview-remove');
        if (!area || !input) return;
        area.addEventListener('click', e => { if (!e.target.closest('.preview-remove')) input.click(); });
        area.addEventListener('dragover', e => { e.preventDefault(); area.classList.add('dragover'); });
        area.addEventListener('dragleave', () => area.classList.remove('dragover'));
        area.addEventListener('drop', e => { e.preventDefault(); area.classList.remove('dragover'); if (e.dataTransfer.files[0]) handleImageFile(e.dataTransfer.files[0]); });
        input.addEventListener('change', () => { if (input.files[0]) handleImageFile(input.files[0]); });
        if (removeBtn) removeBtn.addEventListener('click', e => {
            e.stopPropagation(); imageDataUrl = ''; input.value = '';
            const ph = $('#upload-placeholder'), pv = $('#upload-preview');
            if (ph) ph.classList.remove('hidden'); if (pv) pv.classList.add('hidden');
        });
    }

    function handleImageFile(file) {
        if (!file.type.startsWith('image/')) return;
        if (file.size > 5 * 1024 * 1024) { showToast('La imagen no puede superar 5MB'); return; }
        const reader = new FileReader();
        reader.onload = e => {
            imageDataUrl = e.target.result;
            const pi = $('#preview-img'); if (pi) pi.src = imageDataUrl;
            const ph = $('#upload-placeholder'), pv = $('#upload-preview');
            if (ph) ph.classList.add('hidden'); if (pv) pv.classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }

    // ── Dynamic Lists ──────────────────────────────────────────────────────────
    function setupDynamicLists() {
        const addColor = $('#add-color-btn'), colorName = $('#new-color-name'), colorHex = $('#new-color-hex');
        if (addColor) addColor.addEventListener('click', () => {
            const n = (colorName||{}).value?.trim(); if (!n) return;
            formColors.push({ name: n, hex: (colorHex||{}).value || '#000000' });
            renderDynamicList('colors'); if (colorName) colorName.value = '';
        });
        const addSize = $('#add-size-btn'), sizeInput = $('#new-size');
        if (addSize) addSize.addEventListener('click', () => {
            const s = (sizeInput||{}).value?.trim(); if (!s) return;
            s.split(',').map(x => x.trim()).filter(Boolean).forEach(x => { if (!formSizes.includes(x)) formSizes.push(x); });
            renderDynamicList('sizes'); if (sizeInput) sizeInput.value = '';
        });
        const addModel = $('#add-model-btn'), modelInput = $('#new-model');
        if (addModel) addModel.addEventListener('click', () => {
            const m = (modelInput||{}).value?.trim(); if (!m) return;
            m.split(',').map(x => x.trim()).filter(Boolean).forEach(x => { if (!formModels.includes(x)) formModels.push(x); });
            renderDynamicList('models'); if (modelInput) modelInput.value = '';
        });
        ['new-color-name','new-size','new-model'].forEach((id, i) => {
            const el = $(`#${id}`);
            if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); [$('#add-color-btn'),$('#add-size-btn'),$('#add-model-btn')][i]?.click(); }});
        });
    }

    function renderDynamicList(type) {
        const container = $(`#${type}-list`); if (!container) return;
        const items = type === 'colors' ? formColors : type === 'sizes' ? formSizes : formModels;
        container.innerHTML = items.map((item, i) => {
            const label = typeof item === 'object' ? `<span class="item-color" style="background:${item.hex}"></span>${item.name}` : item;
            return `<span class="dynamic-item">${label}<span class="item-remove" data-type="${type}" data-index="${i}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span></span>`;
        }).join('');
        container.querySelectorAll('.item-remove').forEach(btn => btn.addEventListener('click', () => {
            const t = btn.dataset.type, idx = parseInt(btn.dataset.index);
            if (t === 'colors') formColors.splice(idx, 1);
            else if (t === 'sizes') formSizes.splice(idx, 1);
            else formModels.splice(idx, 1);
            renderDynamicList(t);
        }));
    }

    // ── Delete Modal ───────────────────────────────────────────────────────────
    function setupDeleteModal() {
        const confirmBtn = $('#confirm-delete'), cancelBtn = $('#cancel-delete');
        if (confirmBtn) confirmBtn.addEventListener('click', () => {
            if (deleteTargetId) {
                products = products.filter(p => p.id !== deleteTargetId);
                saveProducts(); renderProductsTable(); updateStats(); showToast('Producto eliminado');
            }
            hideDeleteModal();
        });
        if (cancelBtn) cancelBtn.addEventListener('click', hideDeleteModal);
    }

    function showDeleteModal(id) {
        deleteTargetId = id;
        const p = products.find(p => p.id === id);
        const nameEl = $('#delete-product-name'); if (nameEl) nameEl.textContent = p ? p.name : '';
        const modal = $('#delete-modal'); if (modal) modal.classList.remove('hidden');
    }
    function hideDeleteModal() {
        deleteTargetId = null;
        const modal = $('#delete-modal'); if (modal) modal.classList.add('hidden');
    }

    // ── Search ─────────────────────────────────────────────────────────────────
    function setupSearch() {
        const input = $('#admin-search'); if (!input) return;
        let d; input.addEventListener('input', () => { clearTimeout(d); d = setTimeout(() => renderProductsTable(input.value), 250); });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // CATEGORÍAS — su propio JSON
    // ═════════════════════════════════════════════════════════════════════════
    function setupCategories() {
        const addBtn = $('#catalog-add-btn'), input = $('#catalog-name-input');
        if (addBtn && input) {
            addBtn.addEventListener('click', () => {
                const name = input.value.trim(); if (!name) return;
                categories.push({ id: 'cat-' + Date.now(), name });
                saveCategories(); input.value = '';
                renderCategoriesTable(); updateCollectionsList();
                showToast('Categoría agregada');
            });
            input.addEventListener('keydown', e => { if (e.key === 'Enter') addBtn.click(); });
        }
        renderCategoriesTable();
        updateCollectionsList();
    }

    function renderCategoriesTable() {
        const tbody   = $('#catalogs-tbody');
        const empty   = $('#catalogs-empty');
        const wrapper = $('#catalogs-table-wrapper');

        if (!categories.length) {
            if (tbody) tbody.innerHTML = '';
            if (wrapper) wrapper.style.display = 'none';
            if (empty) empty.classList.remove('hidden');
            return;
        }
        if (wrapper) wrapper.style.display = 'block';
        if (empty) empty.classList.add('hidden');
        if (tbody) {
            tbody.innerHTML = categories.map((cat, i) => {
                const count = products.filter(p => p.collection === cat.name).length;
                return `<tr>
                  <td>${i + 1}</td>
                  <td><strong>${cat.name}</strong></td>
                  <td>${count} productos</td>
                  <td><button class="table-btn delete-cat" data-id="${cat.id}" title="Eliminar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg></button></td>
                </tr>`;
            }).join('');
            tbody.querySelectorAll('.delete-cat').forEach(btn => btn.addEventListener('click', () => {
                categories = categories.filter(c => c.id !== btn.dataset.id);
                saveCategories(); renderCategoriesTable(); updateCollectionsList(); showToast('Categoría eliminada');
            }));
        }
        // Also keep download button for categories
        const dlBtn = $('#download-categories-btn');
        if (dlBtn) dlBtn.onclick = () => { downloadJSON(categories, 'categories.json'); showToast('categories.json descargado'); };
    }

    // ═════════════════════════════════════════════════════════════════════════
    // ÓRDENES — su propio JSON
    // ═════════════════════════════════════════════════════════════════════════
    function setupOrdersSection() {
        const filterSel = $('#orders-status-filter');
        if (filterSel) filterSel.addEventListener('change', renderOrdersTable);

        const closeDetail = $('#order-detail-close');
        if (closeDetail) closeDetail.addEventListener('click', () => { const m = $('#order-detail-modal'); if (m) m.classList.add('hidden'); });

        // Limpiar todos los pedidos
        const clearBtn = $('#clear-orders-btn');
        if (clearBtn) clearBtn.addEventListener('click', async () => {
            if (!confirm('¿Eliminar TODOS los pedidos? Esta acción no se puede deshacer.')) return;
            orders = [];
            await persistOrders();
            renderOrdersTable();
            updateOrdersBadge();
            showToast('Todos los pedidos eliminados');
        });

        // Exportar orders.json desde la sección de órdenes
        const exportInline = $('#export-orders-inline-btn');
        if (exportInline) exportInline.addEventListener('click', () => { downloadJSON(orders, 'orders.json'); showToast('orders.json descargado'); });

        updateOrdersBadge();
        renderOrdersTable();
    }
    window.setupOrders = setupOrdersSection;

    function updateOrdersBadge() {
        const pending = orders.filter(o => (o.status||'').toLowerCase() === 'pendiente').length;
        const badge = $('#orders-badge');
        if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? 'inline-flex' : 'none'; }
    }

    function renderOrdersTable() {
        const filterVal = ($('#orders-status-filter')||{}).value || 'all';
        const filtered  = filterVal === 'all' ? orders : orders.filter(o => (o.status||'').toLowerCase() === filterVal);
        const tbody = $('#orders-tbody'), empty = $('#orders-empty'), wrapper = $('#orders-table-wrapper');
        const label = $('#orders-count-label');
        if (label) label.textContent = filtered.length + ' pedido' + (filtered.length !== 1 ? 's' : '');
        if (!filtered.length) {
            if (wrapper) wrapper.style.display = 'none';
            if (empty) empty.classList.remove('hidden'); return;
        }
        if (wrapper) wrapper.style.display = 'block';
        if (empty) empty.classList.add('hidden');
        if (tbody) {
            const sMap = { pendiente:'⏳ Pendiente', pagado:'✅ Pagado', confirmado:'📦 Confirmado', cancelado:'❌ Cancelado' };
            tbody.innerHTML = filtered.map(o => {
                const dateStr = new Date(o.date).toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'2-digit'});
                const st = (o.status||'').toLowerCase();
                return `<tr>
                  <td><span class="order-id-badge">${o.id}</span></td>
                  <td>${dateStr}</td>
                  <td><strong>${o.buyer?.name||''}</strong><br><small>${o.buyer?.email||''}</small></td>
                  <td>${(o.items||[]).length} item(s)</td>
                  <td><strong>$${(o.total||0).toFixed(2)}</strong></td>
                  <td>${o.paymentMethod||''}</td>
                  <td><span class="order-status order-status--${st}">${sMap[st]||o.status}</span></td>
                  <td><button class="table-btn" onclick="openOrderDetail('${o.id}')" title="Ver detalle"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button></td>
                </tr>`;
            }).join('');
        }
    }

    window.openOrderDetail = function(orderId) {
        const order = orders.find(o => o.id === orderId); if (!order) return;
        const modal = $('#order-detail-modal'); if (!modal) return;
        const body = $('#order-detail-body'), actions = $('#order-detail-actions');
        const sMap = { pendiente:'Pendiente', pagado:'Pagado', confirmado:'Confirmado', cancelado:'Cancelado' };
        const st = (order.status||'').toLowerCase();
        if (body) body.innerHTML = `
            <div class="order-detail-grid">
              <div class="order-detail-card"><h4>Datos del Comprador</h4>
                <p><strong>Nombre:</strong> ${order.buyer?.name||''}</p>
                <p><strong>Email:</strong> ${order.buyer?.email||''}</p>
                <p><strong>Tel:</strong> ${order.buyer?.phone||''}</p>
                <p><strong>Dir.:</strong> ${order.buyer?.address||''}</p>
                ${order.buyer?.notes ? `<p><strong>Notas:</strong> ${order.buyer.notes}</p>` : ''}
              </div>
              <div class="order-detail-card"><h4>Pago</h4>
                <p><strong>Método:</strong> ${order.paymentMethod||''}</p>
                <p><strong>Referencia:</strong> ${order.paymentReference||''}</p>
                <p><strong>Estado:</strong> <span class="order-status order-status--${st}">${sMap[st]||order.status}</span></p>
                <p><strong>Fecha:</strong> ${new Date(order.date).toLocaleString('es-ES')}</p>
              </div>
            </div>
            <h4 style="margin:16px 0 10px">Productos</h4>
            <table class="admin-table"><thead><tr><th>Producto</th><th>Detalles</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
            <tbody>${(order.items||[]).map(item => `<tr><td>${item.name}</td><td>${[item.color,item.size,item.model].filter(Boolean).join(' · ')}</td><td>${item.qty}</td><td>$${item.price.toFixed(2)}</td><td>$${(item.price*item.qty).toFixed(2)}</td></tr>`).join('')}
            <tr><td colspan="4"><strong>Total</strong></td><td><strong>$${(order.total||0).toFixed(2)}</strong></td></tr></tbody></table>`;
        if (actions) {
            actions.innerHTML = '';
            if (st === 'pendiente') {
                const pb = document.createElement('button'); pb.className='btn-primary-admin'; pb.textContent='✅ Marcar como Pagado'; pb.onclick=()=>updateOrderStatus(orderId,'pagado');
                const cb = document.createElement('button'); cb.className='btn-danger'; cb.textContent='❌ Cancelar'; cb.onclick=()=>updateOrderStatus(orderId,'cancelado');
                actions.appendChild(pb); actions.appendChild(cb);
            } else if (st === 'pagado') {
                const pb = document.createElement('button'); pb.className='btn-primary-admin'; pb.textContent='📦 Confirmar Compra'; pb.onclick=()=>updateOrderStatus(orderId,'confirmado');
                const cb = document.createElement('button'); cb.className='btn-danger'; cb.textContent='❌ Cancelar'; cb.onclick=()=>updateOrderStatus(orderId,'cancelado');
                actions.appendChild(pb); actions.appendChild(cb);
            }
        }
        modal.classList.remove('hidden');
    };

    async function updateOrderStatus(orderId, newStatus) {
        const idx = orders.findIndex(o => o.id === orderId); if (idx === -1) return;
        orders[idx].status = newStatus;
        await persistOrders();
        showToast('Estado actualizado: ' + newStatus);
        const m = $('#order-detail-modal'); if (m) m.classList.add('hidden');
        renderOrdersTable(); updateOrdersBadge();
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MÉTODOS DE PAGO — su propio JSON
    // ═════════════════════════════════════════════════════════════════════════
    const PM_GROUPS = [
        { group: 'Métodos Manuales', methods: [
            { id:'transferencia', name:'Transferencia Bancaria'}, { id:'pago-movil', name:'Pago Móvil'},
            { id:'deposito', name:'Depósito Bancario'}, { id:'efectivo', name:'Efectivo en Entrega'}, { id:'recogida', name:'Recogida en Tienda'}
        ]},
        { group: 'Billeteras Digitales', methods: [
            { id:'paypal', name:'PayPal'},{ id:'zelle', name:'Zelle'},{ id:'venmo', name:'Venmo'},
            { id:'cashapp', name:'Cash App'},{ id:'mercadopago', name:'Mercado Pago'},{ id:'applepay', name:'Apple Pay'},
            { id:'googlepay', name:'Google Pay'},{ id:'samsungpay', name:'Samsung Pay'},{ id:'alipay', name:'Alipay'},{ id:'wechatpay', name:'WeChat Pay'}
        ]},
        { group: 'Tarjetas y Redes', methods: [
            { id:'credito', name:'Tarjeta de Crédito'},{ id:'debito', name:'Tarjeta de Débito'},
            { id:'visa', name:'Visa'},{ id:'mastercard', name:'Mastercard'},{ id:'amex', name:'American Express'},
            { id:'diners', name:'Diners Club'},{ id:'discover', name:'Discover'},{ id:'maestro', name:'Maestro'},{ id:'jcb', name:'JCB'}
        ]},
        { group: 'Criptomonedas', methods: [
            { id:'btc', name:'Bitcoin (BTC)'},{ id:'eth', name:'Ethereum (ETH)'},{ id:'usdt', name:'Tether (USDT)'},
            { id:'binance', name:'Binance Pay'},{ id:'ltc', name:'Litecoin (LTC)'},{ id:'sol', name:'Solana (SOL)'},{ id:'usdc', name:'USD Coin (USDC)'}
        ]},
        { group: 'Sistemas Locales / QR', methods: [
            { id:'bizum', name:'Bizum'},{ id:'pix', name:'Pix'},{ id:'oxxo', name:'OXXO'},{ id:'oxxo711', name:'7-Eleven'},
            { id:'pse', name:'PSE'},{ id:'nequi', name:'Nequi'},{ id:'daviplata', name:'Daviplata'},
            { id:'mach', name:'Mach'},{ id:'redcompra', name:'Redcompra'},{ id:'webpay', name:'Webpay'},{ id:'sinpe', name:'Sinpe Móvil'}
        ]},
        { group: 'Financiamiento / Cuotas', methods: [
            { id:'bnpl', name:'Compra Ahora, Paga Después'},{ id:'klarna', name:'Klarna'},
            { id:'afterpay', name:'Afterpay'},{ id:'affirm', name:'Affirm'},{ id:'cuotas', name:'Cuotas sin interés'},{ id:'credito-casa', name:'Crédito de la casa'}
        ]},
        { group: 'Otros', methods: [
            { id:'stripe-link', name:'Enlace de Pago (Stripe)'},{ id:'tarjeta-regalo', name:'Tarjeta de Regalo'},
            { id:'monedero', name:'Monedero Interno'},{ id:'cheque', name:'Cheque Certificado'},{ id:'vale', name:'Vale de Despensa'}
        ]}
    ];

    function setupPaymentSection() {
        const container = $('#payments-groups'); if (!container) return;
        container.innerHTML = PM_GROUPS.map(group => `
            <div class="pm-group">
              <div class="pm-group-title">${group.group}</div>
              <div class="pm-group-methods">
                ${group.methods.map(m => {
                    const cfg = payMethods[m.id] || { enabled: false, details: '' };
                    return `<div class="pm-method-row" id="pm-row-${m.id}">
                      <div class="pm-method-head">
                        <label class="pm-toggle-label">
                          <div class="pm-toggle-info"><span class="pm-method-name">${m.name}</span></div>
                          <div class="pm-toggle-switch">
                            <input type="checkbox" class="pm-toggle-cb" data-method="${m.id}" ${cfg.enabled?'checked':''}>
                            <span class="pm-toggle-slider"></span>
                          </div>
                        </label>
                      </div>
                      <div class="pm-details-area ${cfg.enabled?'':'hidden'}" id="pm-details-${m.id}">
                        <textarea class="pm-details-input form-control" data-method="${m.id}" rows="3" placeholder="Instrucciones de pago para el cliente (ej: Cuenta: 0102-1234-5678)">${cfg.details||''}</textarea>
                      </div>
                    </div>`;
                }).join('')}
              </div>
            </div>`).join('');

        container.querySelectorAll('.pm-toggle-cb').forEach(cb => cb.addEventListener('change', () => {
            const area = $(`#pm-details-${cb.dataset.method}`);
            if (area) area.classList.toggle('hidden', !cb.checked);
        }));

        const saveBtn = $('#save-payments-btn');
        if (saveBtn) saveBtn.addEventListener('click', async () => {
            payMethods = {};
            container.querySelectorAll('.pm-toggle-cb').forEach(cb => {
                const id = cb.dataset.method;
                const details = (container.querySelector(`.pm-details-input[data-method="${id}"]`)||{}).value || '';
                payMethods[id] = { enabled: cb.checked, details };
            });
            await persistPayments();
            showToast('Métodos de pago guardados');
        });
    }
    window.setupPaymentMethods = setupPaymentSection;

    // ═════════════════════════════════════════════════════════════════════════
    // NOTA DE TRANSACCIÓN (Invoice) — parte de settings.json
    // ═════════════════════════════════════════════════════════════════════════
    function setupInvoiceSection() {
        const inv = settings.invoiceSettings || {};
        const fields = [['inv-store-name','storeName'],['inv-address','address'],['inv-phone','phone'],['inv-email','email'],['inv-tax-rate','taxRate'],['inv-footer-text','footerText']];
        fields.forEach(([id, key]) => { const el = $(`#${id}`); if (el && inv[key] !== undefined) el.value = inv[key]; });

        const saveBtn = $('#save-invoice-settings-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => {
            if (!settings.invoiceSettings) settings.invoiceSettings = {};
            fields.forEach(([id, key]) => { const el = $(`#${id}`); if (el) settings.invoiceSettings[key] = el.value; });
            saveSettings();
            showToast('Configuración de nota guardada');
        });
    }
    window.setupInvoiceSettings = setupInvoiceSection;

    // ═════════════════════════════════════════════════════════════════════════
    // PERSONALIZACIÓN — settings.json (importable/exportable)
    // ═════════════════════════════════════════════════════════════════════════
    const FONTS = [
        { id:'outfit',    name:'Outfit',              css:"'Outfit', sans-serif" },
        { id:'playfair',  name:'Playfair Display',    css:"'Playfair Display', serif" },
        { id:'inter',     name:'Inter',               css:"'Inter', sans-serif" },
        { id:'raleway',   name:'Raleway',             css:"'Raleway', sans-serif" },
        { id:'josefin',   name:'Josefin Sans',        css:"'Josefin Sans', sans-serif" },
        { id:'cormorant', name:'Cormorant Garamond',  css:"'Cormorant Garamond', serif" }
    ];
    const THEMES = [
        { id:'vibrant-blue',   name:'Azul Vibrante (Default)', bars:['#001529','#002140','#1890ff','#fff'] },
        { id:'oscuro-dorado',  name:'Oscuro Dorado',           bars:['#0a0a0a','#141414','#c9a96e','#f0ece6'] },
        { id:'minimal-blanco', name:'Minimal Blanco',          bars:['#f8f8f6','#ffffff','#2d2d2d','#1a1a1a'] },
        { id:'indigo-premium', name:'Índigo Premium',          bars:['#0d0f1a','#161929','#6c63ff','#e8e6ff'] },
        { id:'esmeralda',      name:'Esmeralda Luxury',        bars:['#051a0f','#0a2e1a','#2ecf7e','#e6f5ee'] },
        { id:'rojo-atardecer', name:'Rojo Atardecer',          bars:['#0f0a08','#1e100c','#e8512a','#f5e6e0'] },
        { id:'oceanic-teal',   name:'Oceanic Teal',            bars:['#002b36','#073642','#268bd2','#fdf6e3'] },
        { id:'midnight-violet',name:'Midnight Violet',         bars:['#120129','#24024f','#9b59b6','#f3e5f5'] }
    ];
    const PALETTES = [
        { id:'dorado', name:'Dorado Clásico',  swatches:['#c9a96e','#a88840','#dfc69e','#f5ead6'] },
        { id:'plata',  name:'Plata Fría',       swatches:['#b0b8c9','#7a8799','#d6dde8','#eef1f6'] },
        { id:'cobre',  name:'Cobre Cálido',     swatches:['#c87941','#9e5c2d','#e0a272','#f5dbc0'] },
        { id:'malva',  name:'Malva Suave',      swatches:['#a97bbd','#7c4e9a','#c9a3d9','#f0e3f7'] },
        { id:'jade',   name:'Jade Natural',     swatches:['#5aad8a','#3a8066','#8dcfb5','#d4f0e6'] },
        { id:'coral',  name:'Coral Vibrante',   swatches:['#e8724a','#c04e2a','#f0a084','#fce8e0'] }
    ];
    const TEXT_FIELDS = [
        ['txt-hero-tag','hero-tag'],['txt-hero-title1','hero-title-line1'],['txt-hero-title2','hero-title-line2'],
        ['txt-hero-subtitle','hero-subtitle'],['txt-hero-cta1','hero-cta-primary'],['txt-hero-cta2','hero-cta-secondary'],
        ['txt-stat1-label','stat-1-label'],['txt-stat2-label','stat-2-label'],['txt-stat3-label','stat-3-label'],
        ['txt-col-tag','collections-tag'],['txt-col-title','collections-title'],['txt-col-desc','collections-desc'],
        ['txt-cat-tag','catalog-tag'],['txt-cat-title','catalog-title'],['txt-about-tag','about-tag'],
        ['txt-about-title','about-title'],['txt-about-p1','about-p1'],['txt-about-p2','about-p2'],
        ['txt-feat1-title','about-feat1-title'],['txt-feat1-desc','about-feat1-desc'],
        ['txt-feat2-title','about-feat2-title'],['txt-feat2-desc','about-feat2-desc'],
        ['txt-feat3-title','about-feat3-title'],['txt-feat3-desc','about-feat3-desc'],
        ['txt-about-card','about-card-text'],['txt-contact-tag','contact-tag'],
        ['txt-contact-title','contact-title'],['txt-contact-desc','contact-desc'],
        ['txt-wa-title','contact-whatsapp-title'],['txt-wa-info','contact-whatsapp-info'],
        ['txt-ig-title','contact-instagram-title'],['txt-ig-info','contact-instagram-info'],
        ['txt-email-title','contact-email-title'],['txt-email-info','contact-email-info'],
        ['txt-tt-title','contact-tiktok-title'],['txt-tt-info','contact-tiktok-info'],
        ['txt-fb-title','contact-facebook-title'],['txt-fb-info','contact-facebook-info'],
        ['txt-hours-title','contact-hours-title'],['txt-hours-info','contact-hours-info'],['txt-hours-sub','contact-hours-sub']
    ];
    const LINK_FIELDS = [
        ['txt-wa-link','contact-whatsapp-link'],['txt-ig-link','contact-instagram-link'],
        ['txt-email-link','contact-email-link'],['txt-tt-link','contact-tiktok-link'],['txt-fb-link','contact-facebook-link']
    ];

    function setupCustomize() {
        // ── Fonts ──
        const fontGrid = $('#font-grid');
        if (fontGrid) {
            fontGrid.innerHTML = FONTS.map(f => `<div class="font-card ${settings.font===f.id?'selected':''}" data-font="${f.id}"><div class="font-card-name">${f.name}</div><div class="font-card-preview" style="font-family:${f.css}">${f.name}</div></div>`).join('');
            fontGrid.addEventListener('click', e => { const c=e.target.closest('.font-card'); if(!c) return; fontGrid.querySelectorAll('.font-card').forEach(x=>x.classList.remove('selected')); c.classList.add('selected'); });
        }
        // ── Themes ──
        const themeGrid = $('#theme-grid');
        if (themeGrid) {
            themeGrid.innerHTML = THEMES.map(t => {
                const bars = t.bars.map(b=>`<div class="theme-preview-bar" style="background:${b}"></div>`).join('');
                return `<div class="theme-card ${settings.theme===t.id?'selected':''}" data-theme="${t.id}"><div class="theme-preview">${bars}</div><div class="theme-label">${t.name}</div></div>`;
            }).join('');
            themeGrid.addEventListener('click', e => { const c=e.target.closest('.theme-card'); if(!c) return; themeGrid.querySelectorAll('.theme-card').forEach(x=>x.classList.remove('selected')); c.classList.add('selected'); });
        }
        // ── Palettes ──
        const paletteGrid = $('#palette-grid');
        if (paletteGrid) {
            paletteGrid.innerHTML = PALETTES.map(p => {
                const sw = p.swatches.map(s=>`<div class="palette-swatch" style="background:${s}"></div>`).join('');
                return `<div class="palette-card ${settings.palette===p.id?'selected':''}" data-palette="${p.id}"><div class="palette-swatches">${sw}</div><div class="palette-name">${p.name}</div></div>`;
            }).join('');
            paletteGrid.addEventListener('click', e => { const c=e.target.closest('.palette-card'); if(!c) return; paletteGrid.querySelectorAll('.palette-card').forEach(x=>x.classList.remove('selected')); c.classList.add('selected'); });
        }
        // ── Store Name & Catalog Label ──
        const nameInput    = $('#cust-store-name');    if (nameInput && settings.storeName)    nameInput.value = settings.storeName;
        const labelSelect  = $('#cust-catalog-label'); if (labelSelect)                        labelSelect.value = settings.catalogLabel || 'Categoría';
        // ── Logos ──
        setupLogoUpload('cust-logo-main','btn-upload-logo-main','logo-main-img','logoMain');
        setupLogoUpload('cust-logo-icon','btn-upload-logo-icon','logo-icon-img','logoIcon');
        // ── Texts ──
        if (settings.texts) {
            [...TEXT_FIELDS, ...LINK_FIELDS].forEach(([inputId]) => {
                const el = $(`#${inputId}`);
                if (el && settings.texts[inputId] !== undefined) el.value = settings.texts[inputId];
            });
        }
        // ── Accordion ──
        $$('.texts-group-toggle').forEach(t => t.addEventListener('click', () => t.closest('.texts-group').classList.toggle('open')));

        // ── Save → updates settings + downloads settings.json ──
        const saveBtn = $('#customize-save-btn');
        if (saveBtn) saveBtn.addEventListener('click', () => {
            collectSettings();
            saveSettings();
            downloadJSON(settings, 'settings.json');
            showToast('Configuración guardada y descargada como settings.json');
        });

        // ── Reset ──
        const resetBtn = $('#customize-reset-btn');
        if (resetBtn) resetBtn.addEventListener('click', () => {
            [SK.settings, SK.products, SK.cats, SK.orders, SK.payments].forEach(k => localStorage.removeItem(k));
            showToast('Todo restablecido — recarga la página');
            setTimeout(() => location.reload(), 1400);
        });

        // ── Import settings.json ──
        const importSettingsInput = $('#import-settings-file');
        if (importSettingsInput) importSettingsInput.addEventListener('change', e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const imported = JSON.parse(ev.target.result);
                    if (typeof imported === 'object' && !Array.isArray(imported)) {
                        settings = imported;
                        saveSettings();
                        showToast('settings.json importado — recargando...');
                        setTimeout(() => location.reload(), 1200);
                    } else showToast('Formato no válido');
                } catch { showToast('Error al leer el JSON'); }
            };
            reader.readAsText(file);
            e.target.value = '';
        });
    }

    function setupLogoUpload(inputId, btnId, imgId, key) {
        const input = $(`#${inputId}`), btn = $(`#${btnId}`), img = $(`#${imgId}`);
        if (!input || !btn || !img) return;
        if (settings[key]) { img.src = settings[key]; img.style.filter = 'none'; }
        btn.addEventListener('click', () => input.click());
        input.addEventListener('change', () => {
            const file = input.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = e => { img.src = e.target.result; img.style.filter = 'none'; };
            reader.readAsDataURL(file);
        });
    }

    function collectSettings() {
        const selFont    = document.querySelector('.font-card.selected');
        const selTheme   = document.querySelector('.theme-card.selected');
        const selPalette = document.querySelector('.palette-card.selected');
        if (selFont)    settings.font    = selFont.dataset.font;
        if (selTheme)   settings.theme   = selTheme.dataset.theme;
        if (selPalette) settings.palette = selPalette.dataset.palette;

        const ni = $('#cust-store-name');    if (ni) settings.storeName    = ni.value.trim();
        const ls = $('#cust-catalog-label'); if (ls) settings.catalogLabel = ls.value;

        const lm = $('#logo-main-img');
        if (lm && lm.src && !lm.src.includes('bazr-logo')) settings.logoMain = lm.src;
        const li = $('#logo-icon-img');
        if (li && li.src && !li.src.includes('bazr-logo')) settings.logoIcon = li.src;

        settings.texts = {};
        [...TEXT_FIELDS, ...LINK_FIELDS].forEach(([inputId]) => {
            const el = $(`#${inputId}`); if (el) settings.texts[inputId] = el.value;
        });
    }

    // ═════════════════════════════════════════════════════════════════════════
    // EXPORTAR / IMPORTAR (sección export-section)
    // ═════════════════════════════════════════════════════════════════════════
    function setupExportImport() {
        // ── Products ──
        const exportBtn = $('#export-btn');
        if (exportBtn) exportBtn.addEventListener('click', () => { downloadJSON(products, 'products.json'); showToast('products.json descargado'); });

        const importFile = $('#import-file');
        if (importFile) importFile.addEventListener('change', e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const imp = JSON.parse(ev.target.result);
                    if (Array.isArray(imp)) {
                        products = imp; saveProducts(); renderProductsTable(); updateStats(); updateJsonPreview(); updateCollectionsList();
                        showToast(`${products.length} productos importados`);
                    } else showToast('Formato no válido');
                } catch { showToast('Error al leer el JSON'); }
            };
            reader.readAsText(file); e.target.value = '';
        });

        // ── Categories ──
        const exportCatsBtn = $('#export-categories-btn');
        if (exportCatsBtn) exportCatsBtn.addEventListener('click', () => { downloadJSON(categories, 'categories.json'); showToast('categories.json descargado'); });

        const importCatsFile = $('#import-categories-file');
        if (importCatsFile) importCatsFile.addEventListener('change', e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const imp = JSON.parse(ev.target.result);
                    if (Array.isArray(imp)) {
                        categories = imp; saveCategories(); renderCategoriesTable(); updateCollectionsList();
                        showToast(`${categories.length} categorías importadas`);
                    } else showToast('Formato no válido');
                } catch { showToast('Error al leer el JSON'); }
            };
            reader.readAsText(file); e.target.value = '';
        });

        // ── Orders ──
        const exportOrdersBtn = $('#export-orders-btn');
        if (exportOrdersBtn) exportOrdersBtn.addEventListener('click', () => { downloadJSON(orders, 'orders.json'); showToast('orders.json descargado'); });

        // ── Payment methods ──
        const exportPMBtn = $('#export-payments-btn');
        if (exportPMBtn) exportPMBtn.addEventListener('click', () => { downloadJSON(payMethods, 'payment_methods.json'); showToast('payment_methods.json descargado'); });

        // ── Settings ──
        const exportSettingsBtn = $('#export-settings-btn');
        if (exportSettingsBtn) exportSettingsBtn.addEventListener('click', () => { collectSettings(); saveSettings(); downloadJSON(settings, 'settings.json'); showToast('settings.json descargado'); });

        const importSettingsBtn = $('#import-settings-btn');
        if (importSettingsBtn) importSettingsBtn.addEventListener('click', () => { const el = $('#import-settings-file-export'); if (el) el.click(); });
        const importSettingsFileExport = $('#import-settings-file-export');
        if (importSettingsFileExport) importSettingsFileExport.addEventListener('change', e => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = ev => {
                try {
                    const imp = JSON.parse(ev.target.result);
                    if (typeof imp === 'object' && !Array.isArray(imp)) {
                        settings = imp; saveSettings(); showToast('settings.json importado — recargando...');
                        setTimeout(() => location.reload(), 1200);
                    } else showToast('Formato no válido');
                } catch { showToast('Error al leer el JSON'); }
            };
            reader.readAsText(file); e.target.value = '';
        });

        // ── JSON Preview ──
        const refreshPreview = $('#refresh-json-preview');
        if (refreshPreview) refreshPreview.addEventListener('click', updateJsonPreview);
    }

})();

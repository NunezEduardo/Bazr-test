/**
 * MVP Store — UI Renderer (store/js/ui.js)
 * =========================================
 * Pure rendering functions. Receives data, returns or inserts HTML.
 * No side effects — all data operations are in store.js.
 */

'use strict';

const StoreUI = (() => {

    // ══════════════════════════════════════════════════════════════
    // PRODUCT GRID
    // ══════════════════════════════════════════════════════════════

    /**
     * Renders all visible products into #product-grid.
     * @param {Array}  products   — filtered & sorted array
     * @param {string} activeFilter — current category filter
     * @param {Function} onCardClick — callback(product)
     */
    function renderProducts(products, onCardClick) {
        const grid      = document.getElementById('product-grid');
        const noResults = document.getElementById('no-results');
        if (!grid) return;

        if (!products.length) {
            grid.innerHTML = '';
            noResults?.classList.remove('hidden');
            return;
        }
        noResults?.classList.add('hidden');
        grid.innerHTML = products.map(p => productCardHTML(p)).join('');

        // Attach click handlers
        grid.querySelectorAll('.product-card').forEach(card => {
            card.addEventListener('click', () => {
                const id = card.dataset.id;
                const product = products.find(p => p.id === id);
                if (product) onCardClick(product);
            });
        });
    }

    function productCardHTML(p) {
        const hasImg  = p.image || (p.images && p.images[0]);
        const imgSrc  = p.image || (p.images && p.images[0]) || '';
        const price   = MvpUtils.formatCurrency(p.price);
        const catName = MvpUtils.escapeHtml(p.category || '');
        const name    = MvpUtils.escapeHtml(p.name);

        const imgHtml = hasImg
            ? `<img src="${imgSrc}" alt="${name}" loading="lazy">`
            : `<div class="product-placeholder">
                 <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
                   <rect x="2" y="2" width="20" height="20" rx="2"/>
                   <circle cx="8.5" cy="8.5" r="1.5"/>
                   <path d="M21 15l-5-5L5 21"/>
                 </svg>
                 <span>${catName || 'Producto'}</span>
               </div>`;

        return `
        <div class="product-card" data-id="${p.id}">
          <div class="product-card-image">
            ${imgHtml}
            ${p.featured ? '<span class="product-badge">Destacado</span>' : ''}
            <div class="product-quick-view">Ver detalles →</div>
          </div>
          <div class="product-card-info">
            <div class="product-card-collection">${catName}</div>
            <h3 class="product-card-name">${name}</h3>
            <div class="product-card-bottom">
              <span class="product-card-price">${price}</span>
            </div>
          </div>
        </div>`;
    }

    // ══════════════════════════════════════════════════════════════
    // COLLECTIONS GRID
    // ══════════════════════════════════════════════════════════════

    /**
     * Renders category collection cards into #collections-grid.
     * @param {Array} categories
     * @param {Array} products — used for product count per category
     * @param {Function} onCollectionClick — callback(categoryName)
     */
    function renderCollections(categories, products, onCollectionClick) {
        const grid = document.getElementById('collections-grid');
        if (!grid) return;

        const icons = ['👔', '👖', '👠', '🧥', '👜', '⌚', '👒', '🩴'];

        grid.innerHTML = categories.map((cat, i) => {
            const count = products.filter(p => p.categoryId === cat.id || p.category === cat.name).length;
            const icon  = icons[i % icons.length];
            return `
            <div class="collection-card" data-cat="${MvpUtils.escapeHtml(cat.name)}">
              <div class="collection-icon">${icon}</div>
              <div>
                <div class="collection-name">${MvpUtils.escapeHtml(cat.name)}</div>
                <div class="collection-count">${count} producto${count !== 1 ? 's' : ''}</div>
              </div>
              <div class="collection-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </div>
            </div>`;
        }).join('');

        grid.querySelectorAll('.collection-card').forEach(card => {
            card.addEventListener('click', () => onCollectionClick(card.dataset.cat));
        });
    }

    // ══════════════════════════════════════════════════════════════
    // FILTER CHIPS
    // ══════════════════════════════════════════════════════════════

    function renderFilterChips(categories, onFilterChange) {
        const container = document.getElementById('filter-chips');
        if (!container) return;

        const catChips = categories.map(cat =>
            `<button class="chip" data-filter="${MvpUtils.escapeHtml(cat.name)}">${MvpUtils.escapeHtml(cat.name)}</button>`
        ).join('');

        // Keep the "Todos" button and add category chips
        container.innerHTML = `<button class="chip active" data-filter="all">Todos</button>${catChips}`;

        container.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                onFilterChange(chip.dataset.filter);
            });
        });
    }

    /** Programmatically set active filter chip */
    function setActiveFilter(filter) {
        document.querySelectorAll('#filter-chips .chip').forEach(chip => {
            chip.classList.toggle('active', chip.dataset.filter === filter);
        });
    }

    // ══════════════════════════════════════════════════════════════
    // PRODUCT MODAL
    // ══════════════════════════════════════════════════════════════

    function renderProductModal(product) {
        const el = id => document.getElementById(id);

        // Image
        const imgWrap = el('modal-image');
        const imgPlaceholder = el('modal-img-placeholder');
        const hasImg = product.image || (product.images && product.images[0]);
        if (hasImg) {
            const src = product.image || product.images[0];
            imgWrap.innerHTML = `<img src="${src}" alt="${MvpUtils.escapeHtml(product.name)}">`;
        } else {
            imgWrap.innerHTML = '';
            imgWrap.appendChild(imgPlaceholder || _makePlaceholder());
        }

        // Text fields
        el('modal-collection').textContent = product.category || '';
        el('modal-title').textContent      = product.name;
        el('modal-price').textContent      = MvpUtils.formatCurrency(product.price);
        el('modal-desc').textContent       = product.description || '';

        // Colors
        const colorsWrap = el('modal-colors-wrap');
        const colorsEl   = el('modal-colors');
        if (product.colors && product.colors.length) {
            colorsEl.innerHTML = product.colors.map(c =>
                `<button class="color-option" data-color="${MvpUtils.escapeHtml(c)}">${MvpUtils.escapeHtml(c)}</button>`
            ).join('');
            colorsEl.querySelector('.color-option')?.classList.add('selected');
            if (colorsWrap) colorsWrap.style.display = '';
        } else {
            if (colorsWrap) colorsWrap.style.display = 'none';
        }

        // Sizes
        const sizesWrap = el('modal-sizes-wrap');
        const sizesEl   = el('modal-sizes');
        if (product.sizes && product.sizes.length) {
            sizesEl.innerHTML = product.sizes.map(s =>
                `<button class="size-option" data-size="${MvpUtils.escapeHtml(s)}">${MvpUtils.escapeHtml(s)}</button>`
            ).join('');
            sizesEl.querySelector('.size-option')?.classList.add('selected');
            if (sizesWrap) sizesWrap.style.display = '';
        } else {
            if (sizesWrap) sizesWrap.style.display = 'none';
        }

        // Color/size toggle
        [colorsEl, sizesEl].forEach(wrapper => {
            if (!wrapper) return;
            wrapper.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    wrapper.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                });
            });
        });

        // Reset qty
        el('modal-qty').textContent = '1';
    }

    function _makePlaceholder() {
        const d = document.createElement('div');
        d.className = 'modal-img-placeholder';
        d.innerHTML = `<svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <rect x="2" y="2" width="20" height="20" rx="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <path d="M21 15l-5-5L5 21"/>
          </svg><span>Imagen del producto</span>`;
        return d;
    }

    // ══════════════════════════════════════════════════════════════
    // CART ITEMS
    // ══════════════════════════════════════════════════════════════

    function renderCartItems(items, onRemove) {
        const container = document.getElementById('cart-items');
        const empty     = document.getElementById('cart-empty');
        const footer    = document.getElementById('cart-footer');
        if (!container) return;

        if (!items.length) {
            container.innerHTML = '';
            empty?.classList.remove('hidden');
            if (footer) footer.style.display = 'none';
            return;
        }
        empty?.classList.add('hidden');
        if (footer) footer.style.display = '';

        container.innerHTML = items.map((item, i) => {
            const imgHtml = item.image
                ? `<img src="${item.image}" alt="${MvpUtils.escapeHtml(item.name)}" style="width:100%;height:100%;object-fit:cover">`
                : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                     <rect x="2" y="2" width="20" height="20" rx="2"/>
                     <circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/>
                   </svg>`;
            const metas = [item.color, item.size].filter(Boolean).join(' · ');
            return `
            <div class="cart-item" data-index="${i}">
              <input type="checkbox" class="cart-item-check" data-index="${i}" checked>
              <div class="cart-item-img">${imgHtml}</div>
              <div class="cart-item-info">
                <div class="cart-item-name">${MvpUtils.escapeHtml(item.name)}</div>
                ${metas ? `<div class="cart-item-meta">${metas} × ${item.qty}</div>` : `<div class="cart-item-meta">Cantidad: ${item.qty}</div>`}
                <div class="cart-item-price">${MvpUtils.formatCurrency(item.price * item.qty)}</div>
              </div>
              <button class="cart-item-remove" data-index="${i}" aria-label="Eliminar">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>`;
        }).join('');

        container.querySelectorAll('.cart-item-remove').forEach(btn => {
            btn.addEventListener('click', () => onRemove(parseInt(btn.dataset.index)));
        });
    }

    function renderCartSummary(items) {
        const checks = document.querySelectorAll('.cart-item-check');
        const selectedIdxs = [];
        checks.forEach((chk, i) => { if (chk.checked) selectedIdxs.push(i); });

        const selected = selectedIdxs.map(i => items[i]).filter(Boolean);
        const subtotal = selected.reduce((s, item) => s + item.price * item.qty, 0);
        const total    = items.reduce((s, item) => s + item.price * item.qty, 0);

        const selCount  = document.getElementById('cart-selected-count');
        const subtotalEl = document.getElementById('cart-subtotal');
        const buySelBtn  = document.getElementById('buy-selected-btn');
        const buyAllBtn  = document.getElementById('buy-all-btn');
        const cartCount  = document.getElementById('cart-count');

        if (selCount)   selCount.textContent  = selectedIdxs.length;
        if (subtotalEl) subtotalEl.textContent = MvpUtils.formatCurrency(subtotal);
        if (buySelBtn)  buySelBtn.disabled     = selectedIdxs.length === 0;
        if (buyAllBtn)  buyAllBtn.disabled     = items.length === 0;
        if (cartCount)  cartCount.textContent  = items.length;

        return { selected, selectedIdxs, subtotal, total };
    }

    // ══════════════════════════════════════════════════════════════
    // CHECKOUT
    // ══════════════════════════════════════════════════════════════

    function renderCheckoutSummary(items, total) {
        const list    = document.getElementById('checkout-order-list');
        const totalEl = document.getElementById('checkout-total');
        if (!list) return;

        list.innerHTML = items.map(item => {
            const metas = [item.color, item.size].filter(Boolean).join(' · ');
            return `<div class="checkout-item">
              <div>
                <div class="checkout-item-name">${MvpUtils.escapeHtml(item.name)}</div>
                ${metas ? `<div class="checkout-item-meta">${metas} × ${item.qty}</div>` : ''}
              </div>
              <div class="checkout-item-price">${MvpUtils.formatCurrency(item.price * item.qty)}</div>
            </div>`;
        }).join('');

        if (totalEl) totalEl.textContent = MvpUtils.formatCurrency(total);
    }

    function renderPaymentMethods(methods, onSelect) {
        const grid = document.getElementById('payment-methods-grid');
        if (!grid) return;

        if (!methods.length) {
            grid.innerHTML = '<p style="color:var(--text-muted);font-size:.9rem">No hay métodos de pago configurados.</p>';
            return;
        }

        grid.innerHTML = methods.map(m => `
            <div class="payment-method-card" data-id="${m.id}">
              <span class="payment-method-icon">${m.icon || '💳'}</span>
              <span class="payment-method-name">${MvpUtils.escapeHtml(m.name)}</span>
            </div>`).join('');

        grid.querySelectorAll('.payment-method-card').forEach(card => {
            card.addEventListener('click', () => {
                grid.querySelectorAll('.payment-method-card').forEach(c => c.classList.remove('selected'));
                card.classList.add('selected');
                const method = methods.find(m => m.id === card.dataset.id);
                onSelect(method);
            });
        });
    }

    function renderPaymentInstructions(method) {
        const card = document.getElementById('payment-info-card');
        if (!card || !method) return;

        card.innerHTML = `
            <strong style="color:var(--text)">${method.icon || '💳'} ${MvpUtils.escapeHtml(method.name)}</strong>
            <div style="margin-top:10px;white-space:pre-line">${MvpUtils.escapeHtml(method.instructions || '')}</div>`;
    }

    // ══════════════════════════════════════════════════════════════
    // INVOICE
    // ══════════════════════════════════════════════════════════════

    function renderInvoice(order, config) {
        const body = document.getElementById('invoice-body');
        if (!body) return;

        const inv      = config?.invoiceSettings || {};
        const storeName = inv.storeName || config?.storeName || 'Tienda';
        const taxRate   = parseFloat(inv.taxRate || 0);
        const subtotal  = order.items.reduce((s, i) => s + i.price * i.qty, 0);
        const tax       = subtotal * (taxRate / 100);
        const total     = subtotal + tax;
        const dateStr   = MvpUtils.formatDate(order.date || new Date().toISOString());

        const rows = order.items.map(item => {
            const metas = [item.color, item.size].filter(Boolean).join(' · ');
            return `<tr>
              <td>${MvpUtils.escapeHtml(item.name)}${metas ? `<br><small style="color:var(--text-muted)">${metas}</small>` : ''}</td>
              <td style="text-align:center">${item.qty}</td>
              <td style="text-align:right">${MvpUtils.formatCurrency(item.price)}</td>
              <td style="text-align:right">${MvpUtils.formatCurrency(item.price * item.qty)}</td>
            </tr>`;
        }).join('');

        body.innerHTML = `
        <div class="invoice-header">
          <div>
            <div class="invoice-store-name">${MvpUtils.escapeHtml(storeName)}</div>
            ${inv.address ? `<div style="font-size:.82rem;color:var(--text-muted)">${MvpUtils.escapeHtml(inv.address)}</div>` : ''}
            ${inv.phone   ? `<div style="font-size:.82rem;color:var(--text-muted)">${MvpUtils.escapeHtml(inv.phone)}</div>` : ''}
          </div>
          <div class="invoice-meta">
            <strong>Nota de Transacción</strong><br>
            N° ${MvpUtils.escapeHtml(order.id)}<br>
            Fecha: ${dateStr}<br>
            Estado: <strong style="color:var(--clr-success)">${order.status || 'pendiente'}</strong>
          </div>
        </div>

        <div class="invoice-section-title">Cliente</div>
        <div style="font-size:.88rem;color:var(--text-secondary);line-height:1.8">
          <strong>${MvpUtils.escapeHtml(order.customer?.name || '')}</strong><br>
          ${MvpUtils.escapeHtml(order.customer?.email || '')}
          ${order.customer?.phone ? ` · ${MvpUtils.escapeHtml(order.customer.phone)}` : ''}<br>
          ${order.customer?.address ? MvpUtils.escapeHtml(order.customer.address) : ''}
        </div>

        <div class="invoice-section-title">Método de Pago</div>
        <div style="font-size:.88rem;color:var(--text-secondary)">${MvpUtils.escapeHtml(order.paymentMethod?.name || '')}</div>
        ${order.customer?.ref ? `<div style="font-size:.82rem;color:var(--text-muted)">Ref: ${MvpUtils.escapeHtml(order.customer.ref)}</div>` : ''}

        <div class="invoice-section-title">Detalle del Pedido</div>
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th style="text-align:center">Cant.</th>
              <th style="text-align:right">P. Unit.</th>
              <th style="text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr><td colspan="3">Subtotal</td><td style="text-align:right">${MvpUtils.formatCurrency(subtotal)}</td></tr>
            ${taxRate > 0 ? `<tr><td colspan="3">Impuesto (${taxRate}%)</td><td style="text-align:right">${MvpUtils.formatCurrency(tax)}</td></tr>` : ''}
            <tr class="invoice-total-row">
              <td colspan="3"><strong>Total</strong></td>
              <td style="text-align:right"><strong>${MvpUtils.formatCurrency(total)}</strong></td>
            </tr>
          </tfoot>
        </table>

        ${inv.footerText ? `<div class="invoice-footer">${MvpUtils.escapeHtml(inv.footerText)}</div>` : ''}`;
    }

    // ── Particle animation ────────────────────────────────────────
    function spawnParticles() {
        const container = document.getElementById('hero-particles');
        if (!container) return;
        const count = 15;
        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left  = Math.random() * 100 + '%';
            p.style.animationDelay = (Math.random() * 8) + 's';
            p.style.animationDuration = (6 + Math.random() * 6) + 's';
            container.appendChild(p);
        }
    }

    // ── Counter animation ─────────────────────────────────────────
    function animateCounters() {
        document.querySelectorAll('.stat-number[data-target]').forEach(el => {
            const target = parseInt(el.dataset.target, 10);
            const dur    = 1800;
            const start  = performance.now();
            const tick   = (now) => {
                const t = Math.min((now - start) / dur, 1);
                el.textContent = Math.floor(t * target);
                if (t < 1) requestAnimationFrame(tick);
                else el.textContent = target;
            };
            requestAnimationFrame(tick);
        });
    }

    // ── Scroll reveal ─────────────────────────────────────────────
    function initScrollReveal() {
        const io = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('animate-fade-up');
                    io.unobserve(e.target);
                }
            });
        }, { threshold: 0.15 });
        document.querySelectorAll('.collection-card, .product-card, .contact-card, .about-feature').forEach(el => {
            el.style.opacity = '0';
            io.observe(el);
        });
    }

    return {
        renderProducts, renderCollections, renderFilterChips, setActiveFilter,
        renderProductModal, renderCartItems, renderCartSummary,
        renderCheckoutSummary, renderPaymentMethods, renderPaymentInstructions,
        renderInvoice, spawnParticles, animateCounters, initScrollReveal,
    };
})();

window.StoreUI = StoreUI;

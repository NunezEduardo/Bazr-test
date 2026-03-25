/**
 * MVP Store — Main Orchestrator (store/js/store.js)
 * ==================================================
 * Initialization, state management, and event wiring.
 * Depends on: MvpAPI (shared/api.js), MvpUtils (shared/utils.js),
 *             SettingsLoader (js/settings-loader.js),
 *             StoreUI (js/ui.js)
 */

'use strict';

const Store = (() => {

    // ── State ────────────────────────────────────────────────────
    let _api        = null;
    let _config     = null;
    let _products   = [];
    let _categories = [];
    let _payments   = [];
    let _cart       = [];
    let _activeFilter  = 'all';
    let _searchQuery   = '';
    let _sortOrder     = 'default';
    let _currentProduct = null;
    let _checkoutItems  = [];
    let _selectedPayment = null;
    let _lastOrder      = null;

    // ── Bootstrap ────────────────────────────────────────────────
    async function init() {
        showLoader();

        // 1. Load settings + apply theme
        try {
            const { config, api } = await SettingsLoader.init();
            _config = config;
            _api    = api;
        } catch (e) {
            console.warn('Settings load error:', e);
            // Continue with defaults if settings fail
            const storeId = new URLSearchParams(location.search).get('store') || 'bazr';
            _api = MvpAPI.forStore(storeId);
        }

        // 2. Load data in parallel
        try {
            [_products, _categories, _payments] = await Promise.all([
                _api.getProducts(),
                _api.getCategories(),
                _api.getPaymentMethods(),
            ]);
        } catch (e) {
            console.error('Data load error:', e);
        }

        // 3. Render UI
        StoreUI.renderCollections(_categories, _products, onCollectionClick);
        StoreUI.renderFilterChips(_categories, onFilterChange);
        renderCatalog();
        StoreUI.spawnParticles();
        StoreUI.initScrollReveal();

        // 4. Wire events
        wireNavbar();
        wireCart();
        wireProductModal();
        wireCheckout();
        wireInvoice();
        wireSearch();

        // 5. Animate stats
        const statsObs = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                StoreUI.animateCounters();
                statsObs.disconnect();
            }
        });
        const statsEl = document.querySelector('.hero-stats');
        if (statsEl) statsObs.observe(statsEl);

        hideLoader();
    }

    // ── Catalog rendering ────────────────────────────────────────
    function renderCatalog() {
        let list = _products.slice();

        // Filter
        if (_activeFilter !== 'all') {
            list = list.filter(p =>
                p.category === _activeFilter || p.categoryId === _activeFilter
            );
        }

        // Search
        if (_searchQuery) {
            const q = _searchQuery.toLowerCase();
            list = list.filter(p =>
                p.name.toLowerCase().includes(q) ||
                (p.category || '').toLowerCase().includes(q) ||
                (p.description || '').toLowerCase().includes(q)
            );
        }

        // Sort
        switch (_sortOrder) {
            case 'price-asc':  list.sort((a, b) => a.price - b.price); break;
            case 'price-desc': list.sort((a, b) => b.price - a.price); break;
            case 'name-asc':   list.sort((a, b) => a.name.localeCompare(b.name)); break;
            case 'name-desc':  list.sort((a, b) => b.name.localeCompare(a.name)); break;
            default:           list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)); break;
        }

        StoreUI.renderProducts(list, onProductCardClick);
    }

    function onCollectionClick(catName) {
        _activeFilter = catName;
        StoreUI.setActiveFilter(catName);
        renderCatalog();
        // Scroll to catalog
        document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
    }

    function onFilterChange(filter) {
        _activeFilter = filter;
        renderCatalog();
    }

    // ── Navbar ───────────────────────────────────────────────────
    function wireNavbar() {
        const navbar   = document.getElementById('navbar');
        const menuBtn  = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');

        window.addEventListener('scroll', () => {
            navbar?.classList.toggle('scrolled', window.scrollY > 60);
        }, { passive: true });

        menuBtn?.addEventListener('click', () => {
            menuBtn.classList.toggle('active');
            mobileMenu?.classList.toggle('active');
        });

        // Close mobile menu when link clicked
        mobileMenu?.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => {
                menuBtn?.classList.remove('active');
                mobileMenu.classList.remove('active');
            });
        });

        // Active nav link on scroll
        const sections = ['hero', 'collections', 'catalog', 'about', 'contact'];
        window.addEventListener('scroll', () => {
            const scrollPos = window.scrollY + 100;
            sections.forEach(sId => {
                const sec  = document.getElementById(sId);
                const link = document.querySelector(`.nav-link[href="#${sId}"]`);
                if (!sec || !link) return;
                const active = sec.offsetTop <= scrollPos && sec.offsetTop + sec.offsetHeight > scrollPos;
                link.classList.toggle('active', active);
            });
        }, { passive: true });
    }

    // ── Search + Sort ────────────────────────────────────────────
    function wireSearch() {
        const input  = document.getElementById('search-input');
        const select = document.getElementById('sort-select');

        let debounceTimer;
        input?.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                _searchQuery = input.value.trim();
                renderCatalog();
            }, 250);
        });

        select?.addEventListener('change', () => {
            _sortOrder = select.value;
            renderCatalog();
        });
    }

    // ── Product Modal ────────────────────────────────────────────
    function onProductCardClick(product) {
        _currentProduct = product;
        StoreUI.renderProductModal(product);
        openModal('product-modal');
    }

    function wireProductModal() {
        document.getElementById('modal-close')?.addEventListener('click', () => closeModal('product-modal'));
        document.getElementById('product-modal')?.addEventListener('click', e => {
            if (e.target === document.getElementById('product-modal')) closeModal('product-modal');
        });

        document.getElementById('modal-qty-minus')?.addEventListener('click', () => {
            const el  = document.getElementById('modal-qty');
            const cur = parseInt(el.textContent, 10);
            if (cur > 1) el.textContent = cur - 1;
        });
        document.getElementById('modal-qty-plus')?.addEventListener('click', () => {
            const el = document.getElementById('modal-qty');
            el.textContent = parseInt(el.textContent, 10) + 1;
        });

        document.getElementById('add-to-cart-btn')?.addEventListener('click', () => {
            addToCart(_currentProduct);
            closeModal('product-modal');
        });

        document.getElementById('buy-now-btn')?.addEventListener('click', () => {
            addToCart(_currentProduct);
            closeModal('product-modal');
            openCart();
        });
    }

    function getSelectedOptions() {
        const color = document.querySelector('#modal-colors .color-option.selected')?.dataset.color || '';
        const size  = document.querySelector('#modal-sizes  .size-option.selected')?.dataset.size  || '';
        const qty   = parseInt(document.getElementById('modal-qty')?.textContent || '1', 10);
        return { color, size, qty };
    }

    // ── Cart ─────────────────────────────────────────────────────
    function addToCart(product) {
        const { color, size, qty } = getSelectedOptions();
        const key = `${product.id}-${color}-${size}`;
        const existing = _cart.find(i => `${i.id}-${i.color}-${i.size}` === key);

        if (existing) {
            existing.qty += qty;
        } else {
            _cart.push({
                id:    product.id,
                name:  product.name,
                price: product.price,
                image: product.image || (product.images && product.images[0]) || '',
                color,
                size,
                qty,
            });
        }
        saveCart();
        StoreUI.renderCartItems(_cart, removeFromCart);
        StoreUI.renderCartSummary(_cart);
        MvpUtils.toast(`${product.name} agregado al carrito`);
    }

    function removeFromCart(index) {
        _cart.splice(index, 1);
        saveCart();
        StoreUI.renderCartItems(_cart, removeFromCart);
        StoreUI.renderCartSummary(_cart);
    }

    function saveCart() {
        try { localStorage.setItem('mvp-cart', JSON.stringify(_cart)); } catch {}
    }
    function loadCart() {
        try { _cart = JSON.parse(localStorage.getItem('mvp-cart') || '[]'); } catch { _cart = []; }
    }

    function openCart() {
        document.getElementById('cart-panel')?.classList.add('active');
        document.getElementById('cart-overlay')?.classList.add('active');
        StoreUI.renderCartItems(_cart, removeFromCart);
        StoreUI.renderCartSummary(_cart);
    }
    function closeCart() {
        document.getElementById('cart-panel')?.classList.remove('active');
        document.getElementById('cart-overlay')?.classList.remove('active');
    }

    function wireCart() {
        loadCart();
        StoreUI.renderCartSummary(_cart); // update badge

        document.getElementById('cart-btn')?.addEventListener('click', openCart);
        document.getElementById('cart-close')?.addEventListener('click', closeCart);
        document.getElementById('cart-overlay')?.addEventListener('click', closeCart);

        // Delegation for checkbox changes
        document.getElementById('cart-items')?.addEventListener('change', () => {
            StoreUI.renderCartSummary(_cart);
        });

        document.getElementById('buy-all-btn')?.addEventListener('click', () => {
            if (!_cart.length) return;
            _checkoutItems = _cart.slice();
            closeCart();
            openCheckout(_checkoutItems);
        });

        document.getElementById('buy-selected-btn')?.addEventListener('click', () => {
            const checks = document.querySelectorAll('.cart-item-check');
            _checkoutItems = [];
            checks.forEach((chk, i) => { if (chk.checked && _cart[i]) _checkoutItems.push(_cart[i]); });
            if (!_checkoutItems.length) return;
            closeCart();
            openCheckout(_checkoutItems);
        });
    }

    // ── Checkout ─────────────────────────────────────────────────
    function openCheckout(items) {
        const total = items.reduce((s, i) => s + i.price * i.qty, 0);
        StoreUI.renderCheckoutSummary(items, total);
        StoreUI.renderPaymentMethods(_payments, p => {
            _selectedPayment = p;
            document.getElementById('checkout-to-step2').disabled = false;
        });
        openModal('checkout-overlay');
        activateStep('checkout-step1');
    }

    function wireCheckout() {
        document.getElementById('checkout-close')?.addEventListener('click', () => closeModal('checkout-overlay'));
        document.getElementById('checkout-overlay')?.addEventListener('click', e => {
            if (e.target === document.getElementById('checkout-overlay')) closeModal('checkout-overlay');
        });

        document.getElementById('checkout-to-step2')?.addEventListener('click', () => {
            if (!_selectedPayment) return;
            StoreUI.renderPaymentInstructions(_selectedPayment);
            activateStep('checkout-step2');
        });

        document.getElementById('checkout-back')?.addEventListener('click', () => {
            activateStep('checkout-step1');
        });

        document.getElementById('checkout-form')?.addEventListener('submit', async e => {
            e.preventDefault();
            await submitOrder();
        });

        document.getElementById('checkout-done-btn')?.addEventListener('click', () => {
            closeModal('checkout-overlay');
        });
    }

    async function submitOrder() {
        const btn = document.getElementById('checkout-submit-btn');
        if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

        const orderId = 'ORD-' + Date.now();
        const order = {
            id:      orderId,
            date:    new Date().toISOString(),
            status:  'pendiente',
            paymentMethod: { name: _selectedPayment?.name, id: _selectedPayment?.id },
            customer: {
                name:    document.getElementById('buyer-name')?.value || '',
                email:   document.getElementById('buyer-email')?.value || '',
                phone:   document.getElementById('buyer-phone')?.value || '',
                ref:     document.getElementById('buyer-ref')?.value || '',
                address: document.getElementById('buyer-address')?.value || '',
                notes:   document.getElementById('buyer-notes')?.value || '',
            },
            items: _checkoutItems,
        };

        try {
            await _api.createOrder(order);
            _lastOrder = order;

            // Remove purchased items from cart
            const purchasedIds = new Set(_checkoutItems.map(i => `${i.id}-${i.color}-${i.size}`));
            _cart = _cart.filter(i => !purchasedIds.has(`${i.id}-${i.color}-${i.size}`));
            saveCart();

            document.getElementById('success-order-id').textContent = `Pedido N° ${orderId}`;
            activateStep('checkout-step3');
        } catch (err) {
            MvpUtils.toast('Error al enviar el pedido. Intenta de nuevo.', 'error');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Confirmar Pedido'; }
        }
    }

    function activateStep(stepId) {
        document.querySelectorAll('.checkout-step').forEach(s => s.classList.remove('active'));
        document.getElementById(stepId)?.classList.add('active');
    }

    // ── Invoice ──────────────────────────────────────────────────
    function wireInvoice() {
        document.getElementById('open-invoice-btn')?.addEventListener('click', () => {
            if (!_lastOrder) return;
            StoreUI.renderInvoice(_lastOrder, _config);
            openModal('invoice-overlay');
        });
        document.getElementById('invoice-close')?.addEventListener('click', () => closeModal('invoice-overlay'));
        document.getElementById('invoice-overlay')?.addEventListener('click', e => {
            if (e.target === document.getElementById('invoice-overlay')) closeModal('invoice-overlay');
        });
    }

    // ── Modal helpers ─────────────────────────────────────────────
    function openModal(overlayId) {
        document.getElementById(overlayId)?.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    function closeModal(overlayId) {
        document.getElementById(overlayId)?.classList.remove('show');
        document.body.style.overflow = '';
    }

    // ── Loader ────────────────────────────────────────────────────
    function showLoader() {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'flex';
    }
    function hideLoader() {
        const loader = document.getElementById('loader');
        if (!loader) return;
        loader.style.opacity = '0';
        loader.style.transition = 'opacity 0.5s ease';
        setTimeout(() => { loader.style.display = 'none'; loader.style.opacity = ''; }, 520);
    }

    return { init };
})();

// Boot when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', Store.init);
} else {
    Store.init();
}

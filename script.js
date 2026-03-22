/* ============================================
   BAZR — Store Script (Full Featured)
   ============================================ */

(function () {
  'use strict';

  // --- State ---
  let products = [];
  let filteredProducts = [];
  let activeFilter = 'all';
  let cart = [];
  let currentProduct = null;
  let selectedColor = null;
  let selectedSize = null;
  let selectedModel = null;
  let modalQty = 1;
  let checkoutItems = [];
  let currentOrderId = null;
  let selectedPaymentMethod = null;

  // --- Storage Keys ---
  const STORAGE_KEY   = 'bazr_products';      // sincronizado con admin.js
  const SETTINGS_KEY  = 'bazr_settings';
  const CATS_KEY      = 'bazr_categories';
  const CART_KEY      = 'bazr_cart';
  const ORDERS_KEY    = 'bazr_orders';

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    applyStoreSettings();
    await loadProducts();
    loadCart();
    setupLoader();
    setupNavbar();
    setupMobileMenu();
    setupParticles();
    setupStatCounters();
    renderCollections();
    renderFilterChips();
    renderProducts();
    setupSearch();
    setupSort();
    setupModal();
    setupCart();
    setupCheckout();
    setupScrollReveal();
    fetchCurrencyRates();
    setInterval(fetchCurrencyRates, 30 * 60 * 1000);
  }

  // --- Default Products ---
  const DEFAULT_PRODUCTS = [
    { "id": "prod-001", "name": "Blazer Oversize Elegance", "collection": "Otoño Urbano", "price": 89.99, "description": "Blazer oversize con corte relajado y hombros caídos.", "colors": [{ "name": "Negro", "hex": "#1a1a1a" }, { "name": "Beige", "hex": "#d4b896" }], "sizes": ["XS", "S", "M", "L", "XL"], "models": ["Slim Fit", "Regular", "Oversize"], "material": "65% Poliéster, 35% Viscosa", "image": "", "featured": true },
    { "id": "prod-002", "name": "Vestido Midi Satin", "collection": "Noche Dorada", "price": 120.00, "description": "Vestido midi en tela satinada con escote en V.", "colors": [{ "name": "Champagne", "hex": "#f7e7ce" }, { "name": "Esmeralda", "hex": "#2d6a4f" }], "sizes": ["XS", "S", "M", "L"], "models": ["Corto", "Midi", "Largo"], "material": "100% Seda Satinada", "image": "", "featured": true },
    { "id": "prod-003", "name": "Jeans High Rise Straight", "collection": "Denim Essential", "price": 65.00, "description": "Jeans de tiro alto con pierna recta.", "colors": [{ "name": "Azul Clásico", "hex": "#4a6fa5" }, { "name": "Negro Lavado", "hex": "#2b2b2b" }], "sizes": ["24", "26", "28", "30", "32"], "models": ["Straight", "Wide Leg"], "material": "98% Algodón, 2% Elastano", "image": "", "featured": false },
    { "id": "prod-004", "name": "Crop Top Knit", "collection": "Streetwear Vibes", "price": 35.00, "description": "Top corto tejido con cuello redondo.", "colors": [{ "name": "Blanco", "hex": "#f5f5f5" }, { "name": "Rosa Pastel", "hex": "#f4c2c2" }], "sizes": ["XS", "S", "M", "L"], "models": ["Ajustado", "Relaxed"], "material": "100% Algodón Orgánico", "image": "", "featured": true },
    { "id": "prod-005", "name": "Pantalón Cargo Wide", "collection": "Streetwear Vibes", "price": 55.00, "description": "Pantalón cargo de pierna ancha.", "colors": [{ "name": "Khaki", "hex": "#c3b091" }, { "name": "Negro", "hex": "#1a1a1a" }], "sizes": ["XS", "S", "M", "L", "XL"], "models": ["Regular", "Wide Leg"], "material": "100% Algodón Ripstop", "image": "", "featured": false },
    { "id": "prod-006", "name": "Abrigo Teddy Bear", "collection": "Otoño Urbano", "price": 140.00, "description": "Abrigo teddy de borrego sintético.", "colors": [{ "name": "Camel", "hex": "#c19a6b" }, { "name": "Crema", "hex": "#fffdd0" }], "sizes": ["S", "M", "L", "XL"], "models": ["Corto", "Largo"], "material": "100% Poliéster", "image": "", "featured": true },
    { "id": "prod-007", "name": "Camisa Lino Resort", "collection": "Brisa de Verano", "price": 48.00, "description": "Camisa de lino ligera con cuello cubano.", "colors": [{ "name": "Blanco Nieve", "hex": "#fafafa" }, { "name": "Arena", "hex": "#d2b48c" }], "sizes": ["S", "M", "L", "XL", "XXL"], "models": ["Regular", "Relaxed Fit"], "material": "100% Lino Natural", "image": "", "featured": false },
    { "id": "prod-008", "name": "Falda Plisada Midi", "collection": "Noche Dorada", "price": 72.00, "description": "Falda plisada midi con cintura elástica.", "colors": [{ "name": "Dorado", "hex": "#d4a574" }, { "name": "Negro", "hex": "#111111" }], "sizes": ["XS", "S", "M", "L"], "models": ["Midi", "Maxi"], "material": "100% Poliéster Plisado", "image": "", "featured": false }
  ];

  // --- Load Products ---
  async function loadProducts() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.length > 0) { products = parsed; filteredProducts = [...products]; return; }
      } catch (e) { }
    }
    try {
      const res = await fetch('data/products.json?t=' + Date.now());
      if (!res.ok) throw new Error();
      products = await res.json();
    } catch (e) {
      products = [];
    }
    filteredProducts = [...products];
  }

  // --- Load/Save Cart ---
  function loadCart() {
    try { cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch (e) { cart = []; }
    updateCartCount();
  }
  function saveCart() { localStorage.setItem(CART_KEY, JSON.stringify(cart)); }

  // --- Loader ---
  function setupLoader() {
    setTimeout(() => { const l = $('#loader'); if (l) l.classList.add('loaded'); }, 2200);
  }

  // --- Navbar ---
  function setupNavbar() {
    const navbar = $('#navbar');
    const sections = $$('section[id]');
    const navLinks = $$('.nav-link');
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
      let current = '';
      sections.forEach(s => { if (window.scrollY >= s.offsetTop - 200) current = s.id; });
      navLinks.forEach(l => { l.classList.toggle('active', l.getAttribute('href') === '#' + current); });
    });
  }

  // --- Mobile Menu ---
  function setupMobileMenu() {
    const btn = $('#mobile-menu-btn'), menu = $('#mobile-menu');
    btn.addEventListener('click', () => { btn.classList.toggle('active'); menu.classList.toggle('active'); });
    $$('.mobile-link').forEach(l => l.addEventListener('click', () => { btn.classList.remove('active'); menu.classList.remove('active'); }));
  }

  // --- Particles ---
  function setupParticles() {
    const c = $('#hero-particles'); if (!c) return;
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div'); p.classList.add('particle');
      p.style.left = Math.random() * 100 + '%';
      p.style.animationDelay = Math.random() * 8 + 's';
      p.style.animationDuration = (6 + Math.random() * 6) + 's';
      c.appendChild(p);
    }
  }

  // --- Stat Counters ---
  function setupStatCounters() {
    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) { animateCounters(); obs.disconnect(); } }, { threshold: 0.5 });
    const stats = $('.hero-stats'); if (stats) obs.observe(stats);
  }
  function animateCounters() {
    $$('.stat-number').forEach(el => {
      const target = parseInt(el.dataset.target), dur = 2000, step = target / (dur / 16); let cur = 0;
      const t = setInterval(() => { cur += step; if (cur >= target) { cur = target; clearInterval(t); } el.textContent = Math.floor(cur); }, 16);
    });
  }

  // --- Collections ---
  const collectionIcons = {
    'Otoño Urbano': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 8l4 4-4 4"/><path d="M3 12h18"/><path d="M7 8l-4 4 4 4"/></svg>',
    'Noche Dorada': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 009 9 9 9 0 11-9-9z"/></svg>',
    'Denim Essential': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
    'Streetwear Vibes': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    'Brisa de Verano': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/></svg>'
  };

  function getCollections() {
    // First priority: categories JSON
    const cats = JSON.parse(localStorage.getItem(CATS_KEY) || 'null');
    if (cats && Array.isArray(cats) && cats.length > 0) {
      return cats.map(cat => ({ name: cat.name, count: products.filter(p => p.collection === cat.name).length }));
    }
    // Fallback: settings.catalogs (legacy)
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    if (settings.catalogs && settings.catalogs.length > 0) {
      return settings.catalogs.map(cat => ({ name: cat.name, count: products.filter(p => p.collection === cat.name).length }));
    }
    // Final fallback: derive from products
    const map = {};
    products.forEach(p => { map[p.collection] = (map[p.collection] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count }));
  }

  function renderCollections() {
    const grid = $('#collections-grid'); if (!grid) return;
    const collections = getCollections();
    grid.innerHTML = collections.map(col => `
      <div class="collection-card reveal" data-collection="${col.name}">
        <div class="collection-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg></div>
        <div class="collection-icon">${collectionIcons[col.name] || ''}</div>
        <h3 class="collection-name">${col.name}</h3>
        <span class="collection-count">${col.count} productos</span>
      </div>
    `).join('');
    grid.querySelectorAll('.collection-card').forEach(card => {
      card.addEventListener('click', () => {
        activeFilter = card.dataset.collection;
        updateFilterChips(); filterAndRender();
        document.getElementById('catalog').scrollIntoView({ behavior: 'smooth' });
      });
    });
  }

  function renderFilterChips() {
    const container = $('#filter-chips'); if (!container) return;
    let html = '<button class="chip active" data-filter="all">Todos</button>';
    getCollections().forEach(col => { html += `<button class="chip" data-filter="${col.name}">${col.name}</button>`; });
    container.innerHTML = html;
    container.querySelectorAll('.chip').forEach(chip => chip.addEventListener('click', () => { activeFilter = chip.dataset.filter; updateFilterChips(); filterAndRender(); }));
  }

  function updateFilterChips() { $$('.chip').forEach(c => c.classList.toggle('active', c.dataset.filter === activeFilter)); }

  function setupSearch() {
    const input = $('#search-input'); if (!input) return;
    let d; input.addEventListener('input', () => { clearTimeout(d); d = setTimeout(filterAndRender, 250); });
  }
  function setupSort() { const s = $('#sort-select'); if (s) s.addEventListener('change', filterAndRender); }

  function filterAndRender() {
    const q = (($('#search-input') || {}).value || '').toLowerCase().trim();
    const sort = ($('#sort-select') || {}).value || 'default';
    filteredProducts = products.filter(p => {
      const mf = activeFilter === 'all' || p.collection === activeFilter;
      const ms = !q || p.name.toLowerCase().includes(q) || p.collection.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q);
      return mf && ms;
    });
    switch (sort) {
      case 'price-asc': filteredProducts.sort((a, b) => a.price - b.price); break;
      case 'price-desc': filteredProducts.sort((a, b) => b.price - a.price); break;
      case 'name-asc': filteredProducts.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name-desc': filteredProducts.sort((a, b) => b.name.localeCompare(a.name)); break;
      default: filteredProducts.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    }
    renderProducts();
  }

  function renderProducts() {
    const grid = $('#product-grid'), noRes = $('#no-results'); if (!grid) return;
    if (filteredProducts.length === 0) { grid.innerHTML = ''; if (noRes) noRes.classList.remove('hidden'); return; }
    if (noRes) noRes.classList.add('hidden');
    grid.innerHTML = filteredProducts.map(p => {
      const colorsHtml = p.colors.slice(0, 4).map(c => `<div class="product-card-color" style="background:${c.hex}" title="${c.name}"></div>`).join('');
      const imageHtml = p.image
        ? `<img src="${p.image}" alt="${p.name}" loading="lazy">`
        : `<div class="product-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span>${p.name}</span></div>`;
      return `
        <div class="product-card reveal" data-id="${p.id}">
          <div class="product-card-image">
            ${p.featured ? '<span class="product-badge">Destacado</span>' : ''}
            ${imageHtml}
            <div class="product-quick-view">Ver Detalles</div>
          </div>
          <div class="product-card-info">
            <div class="product-card-collection">${p.collection}</div>
            <h3 class="product-card-name">${p.name}</h3>
            <div class="product-card-bottom">
              <span class="product-card-price">$${p.price.toFixed(2)}</span>
              <div class="product-card-colors">${colorsHtml}</div>
            </div>
          </div>
        </div>`;
    }).join('');
    grid.querySelectorAll('.product-card').forEach(card => card.addEventListener('click', () => {
      const p = products.find(p => p.id === card.dataset.id); if (p) openModal(p);
    }));
    setupScrollReveal();
  }

  // --- Modal ---
  function setupModal() {
    const overlay = $('#product-modal'), closeBtn = $('#modal-close');
    const addBtn = $('#add-to-cart-btn'), buyBtn = $('#buy-now-btn');
    const qtyMinus = $('#modal-qty-minus'), qtyPlus = $('#modal-qty-plus');

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    addBtn.addEventListener('click', () => { if (!currentProduct) return; addToCart(currentProduct, selectedColor, selectedSize, selectedModel, modalQty); });
    buyBtn.addEventListener('click', () => {
      if (!currentProduct) return;
      addToCart(currentProduct, selectedColor, selectedSize, selectedModel, modalQty);
      closeModal();
      openCheckout([cart[cart.length - 1]]);
    });

    qtyMinus.addEventListener('click', () => { if (modalQty > 1) { modalQty--; $('#modal-qty').textContent = modalQty; } });
    qtyPlus.addEventListener('click', () => { modalQty++; $('#modal-qty').textContent = modalQty; });
  }

  function openModal(product) {
    currentProduct = product;
    selectedColor = product.colors[0] || null;
    selectedSize = product.sizes[0] || null;
    selectedModel = product.models[0] || null;
    modalQty = 1;

    $('#modal-collection').textContent = product.collection;
    $('#modal-title').textContent = product.name;
    $('#modal-price').textContent = `$${product.price.toFixed(2)}`;
    $('#modal-desc').textContent = product.description;
    $('#modal-material').innerHTML = `<strong>Material:</strong> ${product.material}`;
    $('#modal-qty').textContent = '1';

    const imgContainer = $('#modal-image');
    imgContainer.innerHTML = product.image
      ? `<img src="${product.image}" alt="${product.name}">`
      : `<div class="modal-img-placeholder"><svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><rect x="2" y="2" width="20" height="20" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg><span>${product.name}</span></div>`;

    const colorsContainer = $('#modal-colors');
    colorsContainer.innerHTML = product.colors.map((c, i) => `
      <div class="color-swatch ${i === 0 ? 'selected' : ''}" style="background:${c.hex}" data-color="${c.name}" title="${c.name}">
        <span class="color-tooltip">${c.name}</span>
      </div>`).join('');
    colorsContainer.querySelectorAll('.color-swatch').forEach(sw => sw.addEventListener('click', () => {
      colorsContainer.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      sw.classList.add('selected');
      selectedColor = { name: sw.dataset.color, hex: sw.style.background };
    }));

    const sizesContainer = $('#modal-sizes');
    sizesContainer.innerHTML = product.sizes.map((s, i) => `<button class="size-btn ${i === 0 ? 'selected' : ''}" data-size="${s}">${s}</button>`).join('');
    sizesContainer.querySelectorAll('.size-btn').forEach(btn => btn.addEventListener('click', () => {
      sizesContainer.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected'); selectedSize = btn.dataset.size;
    }));

    const modelsContainer = $('#modal-models');
    modelsContainer.innerHTML = product.models.map((m, i) => `<button class="model-btn ${i === 0 ? 'selected' : ''}" data-model="${m}">${m}</button>`).join('');
    modelsContainer.querySelectorAll('.model-btn').forEach(btn => btn.addEventListener('click', () => {
      modelsContainer.querySelectorAll('.model-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected'); selectedModel = btn.dataset.model;
    }));

    const overlay = $('#product-modal');
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const overlay = $('#product-modal');
    overlay.classList.remove('show');
    setTimeout(() => { overlay.classList.add('hidden'); document.body.style.overflow = ''; }, 300);
    currentProduct = null;
  }

  // --- Cart ---
  function addToCart(product, color, size, model, qty) {
    const item = { cartId: Date.now() + Math.random(), id: product.id, name: product.name, price: product.price, color: color ? color.name : '', colorHex: color ? color.hex : '', size: size || '', model: model || '', image: product.image || '', qty: qty || 1 };
    cart.push(item);
    saveCart(); updateCartCount();
    showToast(`${product.name} agregado al carrito`);
    if (qty === 1) closeModal();
    renderCartPanel();
  }

  function updateCartCount() {
    const el = $('#cart-count');
    if (el) el.textContent = cart.reduce((sum, i) => sum + i.qty, 0);
  }

  function setupCart() {
    const cartBtn = $('#cart-btn'), cartClose = $('#cart-close'), cartOverlay = $('#cart-overlay');
    if (cartBtn) cartBtn.addEventListener('click', openCartPanel);
    if (cartClose) cartClose.addEventListener('click', closeCartPanel);
    if (cartOverlay) cartOverlay.addEventListener('click', closeCartPanel);

    const buySelected = $('#buy-selected-btn'), buyAll = $('#buy-all-btn');
    if (buySelected) buySelected.addEventListener('click', () => {
      const selected = cart.filter(i => i._selected);
      if (selected.length === 0) return;
      closeCartPanel(); openCheckout(selected);
    });
    if (buyAll) buyAll.addEventListener('click', () => {
      if (cart.length === 0) return;
      closeCartPanel(); openCheckout([...cart]);
    });

    renderCartPanel();
  }

  function openCartPanel() {
    const panel = $('#cart-panel'), overlay = $('#cart-overlay');
    if (panel) panel.classList.add('open');
    if (overlay) overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    renderCartPanel();
  }

  function closeCartPanel() {
    const panel = $('#cart-panel'), overlay = $('#cart-overlay');
    if (panel) panel.classList.remove('open');
    if (overlay) overlay.classList.add('hidden');
    document.body.style.overflow = '';
  }

  function renderCartPanel() {
    const itemsEl = $('#cart-items'), emptyEl = $('#cart-empty'), footerEl = $('#cart-footer');
    if (!itemsEl) return;
    if (cart.length === 0) {
      itemsEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = 'flex';
      if (footerEl) footerEl.style.display = 'none';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (footerEl) footerEl.style.display = 'flex';

    itemsEl.innerHTML = cart.map(item => `
      <div class="cart-item" data-cart-id="${item.cartId}">
        <label class="cart-item-check"><input type="checkbox" class="cart-select-cb" data-cart-id="${item.cartId}" ${item._selected ? 'checked' : ''}></label>
        <div class="cart-item-img">
          ${item.image ? `<img src="${item.image}" alt="${item.name}">` : `<div class="cart-item-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="20" height="20" rx="2"/><path d="M21 15l-5-5L5 21"/></svg></div>`}
        </div>
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">${[item.color, item.size, item.model].filter(Boolean).join(' · ')}</div>
          <div class="cart-item-row">
            <div class="cart-qty-control">
              <button class="cart-qty-btn" data-action="minus" data-cart-id="${item.cartId}">−</button>
              <span>${item.qty}</span>
              <button class="cart-qty-btn" data-action="plus" data-cart-id="${item.cartId}">+</button>
            </div>
            <span class="cart-item-price">$${(item.price * item.qty).toFixed(2)}</span>
          </div>
        </div>
        <button class="cart-item-remove" data-cart-id="${item.cartId}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    `).join('');

    itemsEl.querySelectorAll('.cart-select-cb').forEach(cb => cb.addEventListener('change', () => {
      const id = parseFloat(cb.dataset.cartId);
      const item = cart.find(i => i.cartId === id);
      if (item) item._selected = cb.checked;
      saveCart(); updateCartSummary();
    }));
    itemsEl.querySelectorAll('.cart-qty-btn').forEach(btn => btn.addEventListener('click', () => {
      const id = parseFloat(btn.dataset.cartId), action = btn.dataset.action;
      const item = cart.find(i => i.cartId === id);
      if (!item) return;
      if (action === 'plus') item.qty++;
      else if (action === 'minus' && item.qty > 1) item.qty--;
      saveCart(); updateCartCount(); renderCartPanel();
    }));
    itemsEl.querySelectorAll('.cart-item-remove').forEach(btn => btn.addEventListener('click', () => {
      const id = parseFloat(btn.dataset.cartId);
      cart = cart.filter(i => i.cartId !== id);
      saveCart(); updateCartCount(); renderCartPanel();
    }));

    updateCartSummary();
  }

  function updateCartSummary() {
    const selected = cart.filter(i => i._selected);
    const countEl = $('#cart-selected-count'), subtotalEl = $('#cart-subtotal');
    const buySelBtn = $('#buy-selected-btn'), buyAllBtn = $('#buy-all-btn');
    if (countEl) countEl.textContent = selected.length;
    if (subtotalEl) subtotalEl.textContent = '$' + selected.reduce((s, i) => s + i.price * i.qty, 0).toFixed(2);
    if (buySelBtn) buySelBtn.disabled = selected.length === 0;
    if (buyAllBtn) buyAllBtn.disabled = cart.length === 0;
  }

  // --- Checkout ---
  function setupCheckout() {
    const overlay = $('#checkout-overlay'), closeBtn = $('#checkout-close');
    const toStep2 = $('#checkout-to-step2'), backBtn = $('#checkout-back');
    const form = $('#checkout-form'), doneBtn = $('#checkout-done-btn');
    const openInvoiceBtn = $('#open-invoice-btn');

    if (closeBtn) closeBtn.addEventListener('click', closeCheckout);
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeCheckout(); });
    if (toStep2) toStep2.addEventListener('click', () => {
      if (!selectedPaymentMethod) return showToast('Selecciona un método de pago');
      showCheckoutStep(2);
      renderPaymentInfo();
    });
    if (backBtn) backBtn.addEventListener('click', () => showCheckoutStep(1));
    if (form) form.addEventListener('submit', e => { e.preventDefault(); submitOrder(); });
    if (doneBtn) doneBtn.addEventListener('click', closeCheckout);
    if (openInvoiceBtn) openInvoiceBtn.addEventListener('click', () => { closeCheckout(); openInvoice(currentOrderId); });

    const invoiceClose = $('#invoice-close');
    if (invoiceClose) invoiceClose.addEventListener('click', () => {
      const inv = $('#invoice-overlay');
      if (inv) { inv.classList.remove('show'); setTimeout(() => inv.classList.add('hidden'), 300); document.body.style.overflow = ''; }
    });
  }

  function openCheckout(items) {
    checkoutItems = items;
    selectedPaymentMethod = null;
    const overlay = $('#checkout-overlay');
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.body.style.overflow = 'hidden';
    showCheckoutStep(1);
    renderCheckoutOrderList();
    renderPaymentMethods();
  }

  function closeCheckout() {
    const overlay = $('#checkout-overlay');
    overlay.classList.remove('show');
    setTimeout(() => { overlay.classList.add('hidden'); document.body.style.overflow = ''; }, 300);
  }

  function showCheckoutStep(num) {
    $$('.checkout-step').forEach(s => s.classList.remove('active'));
    const step = $(`#checkout-step${num}`); if (step) step.classList.add('active');
  }

  function renderCheckoutOrderList() {
    const list = $('#checkout-order-list'), totalEl = $('#checkout-total');
    if (!list) return;
    list.innerHTML = checkoutItems.map(item => `
      <div class="checkout-order-item">
        <div class="coi-img">${item.image ? `<img src="${item.image}" alt="${item.name}">` : `<div class="coi-placeholder"></div>`}</div>
        <div class="coi-info">
          <div class="coi-name">${item.name}</div>
          <div class="coi-meta">${[item.color, item.size, item.model].filter(Boolean).join(' · ')} × ${item.qty}</div>
        </div>
        <div class="coi-price">$${(item.price * item.qty).toFixed(2)}</div>
      </div>`).join('');
    const total = checkoutItems.reduce((s, i) => s + i.price * i.qty, 0);
    if (totalEl) totalEl.textContent = '$' + total.toFixed(2);
  }

  function getEnabledPaymentMethods() {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const pm = settings.paymentMethods || {};
    const I_BANK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="10" width="18" height="12" rx="2"/><path d="M2 10l10-8 10 8"/></svg>`;
    const I_PHONE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>`;
    const I_CASH = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/></svg>`;
    const I_STORE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`;
    const I_WALLET = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12V7H5a2 2 0 010-4h14v2"/><path d="M3 5v14a2 2 0 002 2h16v-5"/><path d="M18 12h.01"/></svg>`;
    const I_CARD = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>`;
    const I_CRYPTO = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M9 8h6a2 2 0 010 4 2 2 0 010 4H9V8z"/><path d="M11 6v2M13 6v2M11 16v2M13 16v2"/></svg>`;
    const I_LOCAL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>`;
    const I_CLOCK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
    const I_LINK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>`;
    const I_GIFT = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>`;

    const ALL_METHODS = [
      { id: 'transferencia', name: 'Transferencia Bancaria', icon: I_BANK, group: 'Manuales' },
      { id: 'pago-movil', name: 'Pago Móvil', icon: I_PHONE, group: 'Manuales' },
      { id: 'deposito', name: 'Depósito Bancario', icon: I_BANK, group: 'Manuales' },
      { id: 'efectivo', name: 'Efectivo en Entrega', icon: I_CASH, group: 'Manuales' },
      { id: 'recogida', name: 'Recogida en Tienda', icon: I_STORE, group: 'Manuales' },
      { id: 'paypal', name: 'PayPal', icon: I_WALLET, group: 'Billeteras' },
      { id: 'zelle', name: 'Zelle', icon: I_WALLET, group: 'Billeteras' },
      { id: 'venmo', name: 'Venmo', icon: I_WALLET, group: 'Billeteras' },
      { id: 'cashapp', name: 'Cash App', icon: I_WALLET, group: 'Billeteras' },
      { id: 'mercadopago', name: 'Mercado Pago', icon: I_WALLET, group: 'Billeteras' },
      { id: 'applepay', name: 'Apple Pay', icon: I_WALLET, group: 'Billeteras' },
      { id: 'googlepay', name: 'Google Pay', icon: I_WALLET, group: 'Billeteras' },
      { id: 'samsungpay', name: 'Samsung Pay', icon: I_WALLET, group: 'Billeteras' },
      { id: 'alipay', name: 'Alipay', icon: I_WALLET, group: 'Billeteras' },
      { id: 'wechatpay', name: 'WeChat Pay', icon: I_WALLET, group: 'Billeteras' },
      { id: 'credito', name: 'Tarjeta de Crédito', icon: I_CARD, group: 'Tarjetas' },
      { id: 'debito', name: 'Tarjeta de Débito', icon: I_CARD, group: 'Tarjetas' },
      { id: 'visa', name: 'Visa', icon: I_CARD, group: 'Tarjetas' },
      { id: 'mastercard', name: 'Mastercard', icon: I_CARD, group: 'Tarjetas' },
      { id: 'amex', name: 'American Express', icon: I_CARD, group: 'Tarjetas' },
      { id: 'diners', name: 'Diners Club', icon: I_CARD, group: 'Tarjetas' },
      { id: 'discover', name: 'Discover', icon: I_CARD, group: 'Tarjetas' },
      { id: 'maestro', name: 'Maestro', icon: I_CARD, group: 'Tarjetas' },
      { id: 'jcb', name: 'JCB', icon: I_CARD, group: 'Tarjetas' },
      { id: 'btc', name: 'Bitcoin (BTC)', icon: I_CRYPTO, group: 'Cripto' },
      { id: 'eth', name: 'Ethereum (ETH)', icon: I_CRYPTO, group: 'Cripto' },
      { id: 'usdt', name: 'Tether (USDT)', icon: I_CRYPTO, group: 'Cripto' },
      { id: 'binance', name: 'Binance Pay', icon: I_CRYPTO, group: 'Cripto' },
      { id: 'ltc', name: 'Litecoin (LTC)', icon: I_CRYPTO, group: 'Cripto' },
      { id: 'sol', name: 'Solana (SOL)', icon: I_CRYPTO, group: 'Cripto' },
      { id: 'usdc', name: 'USD Coin (USDC)', icon: I_CRYPTO, group: 'Cripto' },
      { id: 'bizum', name: 'Bizum', icon: I_LOCAL, group: 'Locales' },
      { id: 'pix', name: 'Pix', icon: I_LOCAL, group: 'Locales' },
      { id: 'oxxo', name: 'OXXO', icon: I_LOCAL, group: 'Locales' },
      { id: 'oxxo711', name: '7-Eleven', icon: I_LOCAL, group: 'Locales' },
      { id: 'pse', name: 'PSE', icon: I_LOCAL, group: 'Locales' },
      { id: 'nequi', name: 'Nequi', icon: I_LOCAL, group: 'Locales' },
      { id: 'daviplata', name: 'Daviplata', icon: I_LOCAL, group: 'Locales' },
      { id: 'mach', name: 'Mach', icon: I_LOCAL, group: 'Locales' },
      { id: 'redcompra', name: 'Redcompra', icon: I_LOCAL, group: 'Locales' },
      { id: 'webpay', name: 'Webpay', icon: I_LOCAL, group: 'Locales' },
      { id: 'sinpe', name: 'Sinpe Móvil', icon: I_LOCAL, group: 'Locales' },
      { id: 'bnpl', name: 'Compra Ahora, Paga Después', icon: I_CLOCK, group: 'Financiamiento' },
      { id: 'klarna', name: 'Klarna', icon: I_CLOCK, group: 'Financiamiento' },
      { id: 'afterpay', name: 'Afterpay', icon: I_CLOCK, group: 'Financiamiento' },
      { id: 'affirm', name: 'Affirm', icon: I_CLOCK, group: 'Financiamiento' },
      { id: 'cuotas', name: 'Cuotas sin interés', icon: I_CLOCK, group: 'Financiamiento' },
      { id: 'credito-casa', name: 'Crédito de la casa', icon: I_STORE, group: 'Financiamiento' },
      { id: 'stripe-link', name: 'Enlace de Pago (Stripe)', icon: I_LINK, group: 'Otros' },
      { id: 'tarjeta-regalo', name: 'Tarjeta de Regalo', icon: I_GIFT, group: 'Otros' },
      { id: 'monedero', name: 'Monedero Interno', icon: I_WALLET, group: 'Otros' },
      { id: 'cheque', name: 'Cheque Certificado', icon: I_CASH, group: 'Otros' },
      { id: 'vale', name: 'Vale de Despensa', icon: I_GIFT, group: 'Otros' }
    ];
    const enabled = ALL_METHODS.filter(m => pm[m.id] && pm[m.id].enabled);
    return enabled.length > 0 ? enabled : ALL_METHODS.slice(0, 5);
  }

  function renderPaymentMethods() {
    const grid = $('#payment-methods-grid'), nextBtn = $('#checkout-to-step2');
    if (!grid) return;
    const methods = getEnabledPaymentMethods();
    grid.innerHTML = methods.map(m => `
      <button class="payment-method-btn" data-method-id="${m.id}" title="${m.name}">
        <span class="pm-icon">${m.icon}</span>
        <span class="pm-name">${m.name}</span>
      </button>`).join('');
    grid.querySelectorAll('.payment-method-btn').forEach(btn => btn.addEventListener('click', () => {
      grid.querySelectorAll('.payment-method-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedPaymentMethod = btn.dataset.methodId;
      if (nextBtn) nextBtn.disabled = false;
    }));
  }

  function renderPaymentInfo() {
    const card = $('#payment-info-card'); if (!card) return;
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const pm = (settings.paymentMethods || {})[selectedPaymentMethod] || {};
    const methodName = getEnabledPaymentMethods().find(m => m.id === selectedPaymentMethod);
    card.innerHTML = `
      <div class="payment-info-header">
        <span class="pm-icon-lg">${methodName ? methodName.icon : '💳'}</span>
        <div>
          <div class="pm-method-name">${methodName ? methodName.name : selectedPaymentMethod}</div>
          <div class="pm-method-group">${methodName ? methodName.group : ''}</div>
        </div>
      </div>
      <div class="payment-info-details">${pm.details || '⚠️ El vendedor no ha configurado instrucciones para este método. Contacta al vendedor para obtener los datos necesarios.'}</div>`;
  }

  function submitOrder() {
    const name = $('#buyer-name').value.trim();
    const email = $('#buyer-email').value.trim();
    const phone = $('#buyer-phone').value.trim();
    const ref = $('#buyer-ref').value.trim();
    const address = $('#buyer-address').value.trim();
    const notes = ($('#buyer-notes') || {}).value || '';

    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const inv = settings.invoiceSettings || {};
    const taxRate = parseFloat(inv.taxRate || 0) / 100;
    const subtotal = checkoutItems.reduce((s, i) => s + i.price * i.qty, 0);
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const orderId = 'ORD-' + Date.now();
    currentOrderId = orderId;

    const order = {
      id: orderId, date: new Date().toISOString(), status: 'pendiente',
      buyer: { name, email, phone, address, notes },
      items: checkoutItems.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty, color: i.color, size: i.size, model: i.model, image: i.image || '' })),
      subtotal, tax, total, paymentMethod: selectedPaymentMethod, paymentReference: ref
    };

    let orders = [];
    try { orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch (e) { }
    orders.unshift(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));

    // Remove bought items from cart
    const boughtIds = checkoutItems.map(i => i.cartId);
    cart = cart.filter(i => !boughtIds.includes(i.cartId));
    saveCart(); updateCartCount(); renderCartPanel();

    showCheckoutStep(3);
    const successEl = $('#success-order-id');
    if (successEl) successEl.textContent = `Pedido ${orderId}`;
  }

  function openInvoice(orderId) {
    let orders = [];
    try { orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch (e) { }
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
    const inv = settings.invoiceSettings || {};
    const storeName = settings.storeName || 'BAZR';

    const body = $('#invoice-body');
    if (!body) return;
    body.innerHTML = `
      <div class="invoice-header">
        <div class="invoice-logo-area">
          ${settings.logoMain ? `<img src="${settings.logoMain}" alt="${storeName}" class="inv-logo">` : `<div class="inv-store-name">${storeName}</div>`}
          <div class="inv-store-info">
            ${inv.address ? `<div>${inv.address}</div>` : ''}
            ${inv.phone ? `<div>${inv.phone}</div>` : ''}
            ${inv.email ? `<div>${inv.email}</div>` : ''}
          </div>
        </div>
        <div class="invoice-meta">
          <div class="inv-title">NOTA DE TRANSACCIÓN</div>
          <table class="inv-meta-table">
            <tr><td>Nº:</td><td><strong>${order.id}</strong></td></tr>
            <tr><td>Fecha:</td><td>${new Date(order.date).toLocaleDateString('es-ES')}</td></tr>
            <tr><td>Estado:</td><td><span class="inv-status inv-status--${order.status}">${order.status.toUpperCase()}</span></td></tr>
          </table>
        </div>
      </div>
      <div class="invoice-parties">
        <div class="inv-from"><strong>De:</strong><br>${storeName}</div>
        <div class="inv-to"><strong>Para:</strong><br>${order.buyer.name}<br>${order.buyer.email}<br>${order.buyer.phone}<br>${order.buyer.address}</div>
      </div>
      <table class="inv-items-table">
        <thead><tr><th>Producto</th><th>Detalles</th><th>Cant.</th><th>Precio</th><th>Total</th></tr></thead>
        <tbody>
          ${order.items.map(item => `<tr><td>${item.name}</td><td class="inv-details">${[item.color, item.size, item.model].filter(Boolean).join(' · ')}</td><td>${item.qty}</td><td>$${item.price.toFixed(2)}</td><td>$${(item.price * item.qty).toFixed(2)}</td></tr>`).join('')}
        </tbody>
        <tfoot>
          <tr><td colspan="4">Subtotal</td><td>$${order.subtotal.toFixed(2)}</td></tr>
          ${order.tax > 0 ? `<tr><td colspan="4">Impuestos</td><td>$${order.tax.toFixed(2)}</td></tr>` : ''}
          <tr class="inv-total-row"><td colspan="4"><strong>TOTAL</strong></td><td><strong>$${order.total.toFixed(2)}</strong></td></tr>
        </tfoot>
      </table>
      <div class="invoice-payment-info">
        <strong>Método de pago:</strong> ${order.paymentMethod}<br>
        <strong>Referencia:</strong> ${order.paymentReference}<br>
        <strong>Estado:</strong> Pendiente de confirmación
      </div>
      ${inv.footerText ? `<div class="invoice-footer-note">${inv.footerText}</div>` : ''}`;

    const overlay = $('#invoice-overlay');
    overlay.classList.remove('hidden');
    requestAnimationFrame(() => overlay.classList.add('show'));
    document.body.style.overflow = 'hidden';
  }

  // --- Currency Rates ---
  async function fetchCurrencyRates() {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/USD');
      if (!res.ok) throw new Error();
      const data = await res.json();
      const rates = data.rates || {};
      const eurEl = $('#eur-val'), vesEl = $('#ves-val'), updEl = $('#currency-updated');
      if (eurEl) eurEl.textContent = '€' + (rates.EUR || 0).toFixed(4);
      if (vesEl) vesEl.textContent = 'Bs.' + (rates.VES || 0).toFixed(2);
      if (updEl) updEl.textContent = 'Actualizado: ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      const eurEl = $('#eur-val'), vesEl = $('#ves-val');
      if (eurEl) eurEl.textContent = 'N/D';
      if (vesEl) vesEl.textContent = 'N/D';
    }
  }

  // --- Toast ---
  function showToast(msg) {
    const toast = $('#toast'), msgEl = $('#toast-msg'); if (!toast || !msgEl) return;
    msgEl.textContent = msg;
    toast.classList.remove('hidden');
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.classList.add('hidden'), 300); }, 3000);
  }

  // --- Scroll Reveal ---
  function setupScrollReveal() {
    const obs = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); }), { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal:not(.visible)').forEach(el => obs.observe(el));
  }

  // --- Apply Store Settings ---
  const THEME_VARS = {
    'vibrant-blue': { '--bg': '#001529', '--bg-card': '#002140', '--bg-surface': '#00284d', '--accent': '#1890ff', '--accent-dark': '#0050b3', '--accent-light': '#40a9ff', '--accent-glow': 'rgba(24,144,255,0.15)', '--text': '#ffffff', '--text-secondary': '#a6adb4', '--text-muted': '#727c87', '--border': 'rgba(255,255,255,0.08)', '--logo-filter': 'invert(48%) sepia(85%) saturate(2476%) hue-rotate(190deg) brightness(105%) contrast(105%)', '--logo-filter-hover': 'invert(65%) sepia(90%) saturate(1500%) hue-rotate(185deg) brightness(110%) contrast(110%)' },
    'oscuro-dorado': { '--bg': '#0a0a0a', '--bg-card': '#141414', '--bg-surface': '#111111', '--accent': '#c9a96e', '--accent-dark': '#a88840', '--accent-light': '#dfc69e', '--accent-glow': 'rgba(201,169,110,0.15)', '--text': '#f0ece6', '--text-secondary': '#8a8580', '--text-muted': '#5a5550', '--border': 'rgba(255,255,255,0.06)', '--logo-filter': 'invert(72%) sepia(18%) saturate(836%) hue-rotate(1deg) brightness(91%) contrast(87%)', '--logo-filter-hover': 'invert(72%) sepia(18%) saturate(1200%) hue-rotate(1deg) brightness(105%) contrast(100%)' },
    'minimal-blanco': { '--bg': '#f8f8f6', '--bg-card': '#ffffff', '--bg-surface': '#f0f0ee', '--accent': '#2d2d2d', '--accent-dark': '#1a1a1a', '--accent-light': '#555555', '--accent-glow': 'rgba(45,45,45,0.10)', '--text': '#1a1a1a', '--text-secondary': '#6b6b6b', '--text-muted': '#a0a0a0', '--border': 'rgba(0,0,0,0.08)', '--logo-filter': 'invert(15%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(90%) contrast(90%)', '--logo-filter-hover': 'invert(0%) sepia(0%) saturate(0%) hue-rotate(0deg) brightness(20%) contrast(100%)' },
    'indigo-premium': { '--bg': '#0d0f1a', '--bg-card': '#161929', '--bg-surface': '#121523', '--accent': '#6c63ff', '--accent-dark': '#4b43cc', '--accent-light': '#9d97ff', '--accent-glow': 'rgba(108,99,255,0.15)', '--text': '#e8e6ff', '--text-secondary': '#8b85c1', '--text-muted': '#5a5490', '--border': 'rgba(108,99,255,0.15)', '--logo-filter': 'invert(45%) sepia(45%) saturate(5000%) hue-rotate(225deg) brightness(105%) contrast(105%)', '--logo-filter-hover': 'invert(60%) sepia(50%) saturate(4000%) hue-rotate(220deg) brightness(110%) contrast(110%)' },
    'esmeralda': { '--bg': '#051a0f', '--bg-card': '#0a2e1a', '--bg-surface': '#0c2618', '--accent': '#2ecf7e', '--accent-dark': '#1ea05f', '--accent-light': '#6de8a9', '--accent-glow': 'rgba(46,207,126,0.12)', '--text': '#e6f5ee', '--text-secondary': '#6eaa8a', '--text-muted': '#3d6b52', '--border': 'rgba(46,207,126,0.12)', '--logo-filter': 'invert(60%) sepia(70%) saturate(1000%) hue-rotate(110deg) brightness(100%) contrast(95%)', '--logo-filter-hover': 'invert(65%) sepia(80%) saturate(1200%) hue-rotate(105deg) brightness(110%) contrast(100%)' },
    'rojo-atardecer': { '--bg': '#0f0a08', '--bg-card': '#1e100c', '--bg-surface': '#1a0e0b', '--accent': '#e8512a', '--accent-dark': '#c03a18', '--accent-light': '#f07f5e', '--accent-glow': 'rgba(232,81,42,0.12)', '--text': '#f5e6e0', '--text-secondary': '#a07060', '--text-muted': '#6b4538', '--border': 'rgba(232,81,42,0.12)', '--logo-filter': 'invert(40%) sepia(90%) saturate(2000%) hue-rotate(345deg) brightness(100%) contrast(105%)', '--logo-filter-hover': 'invert(50%) sepia(85%) saturate(2500%) hue-rotate(350deg) brightness(115%) contrast(110%)' },
    'oceanic-teal': { '--bg': '#002b36', '--bg-card': '#073642', '--bg-surface': '#003a47', '--accent': '#268bd2', '--accent-dark': '#1e689e', '--accent-light': '#4ea5e0', '--accent-glow': 'rgba(38,139,210,0.15)', '--text': '#fdf6e3', '--text-secondary': '#839496', '--text-muted': '#657b83', '--border': 'rgba(38,139,210,0.15)', '--logo-filter': 'invert(45%) sepia(80%) saturate(400%) hue-rotate(170deg) brightness(95%) contrast(105%)', '--logo-filter-hover': 'invert(55%) sepia(85%) saturate(500%) hue-rotate(175deg) brightness(105%) contrast(110%)' },
    'midnight-violet': { '--bg': '#120129', '--bg-card': '#24024f', '--bg-surface': '#2d0363', '--accent': '#9b59b6', '--accent-dark': '#7d4594', '--accent-light': '#b985d1', '--accent-glow': 'rgba(155,89,182,0.2)', '--text': '#f3e5f5', '--text-secondary': '#9575cd', '--text-muted': '#7e57c2', '--border': 'rgba(155,89,182,0.2)', '--logo-filter': 'invert(45%) sepia(35%) saturate(1200%) hue-rotate(240deg) brightness(105%) contrast(95%)', '--logo-filter-hover': 'invert(55%) sepia(45%) saturate(1500%) hue-rotate(235deg) brightness(110%) contrast(105%)' }
  };
  const PALETTE_ACCENT = {
    'dorado': { '--accent': '#c9a96e', '--accent-dark': '#a88840', '--accent-light': '#dfc69e', '--accent-glow': 'rgba(201,169,110,0.15)' },
    'plata': { '--accent': '#b0b8c9', '--accent-dark': '#7a8799', '--accent-light': '#d6dde8', '--accent-glow': 'rgba(176,184,201,0.15)' },
    'cobre': { '--accent': '#c87941', '--accent-dark': '#9e5c2d', '--accent-light': '#e0a272', '--accent-glow': 'rgba(200,121,65,0.15)' },
    'malva': { '--accent': '#a97bbd', '--accent-dark': '#7c4e9a', '--accent-light': '#c9a3d9', '--accent-glow': 'rgba(169,123,189,0.15)' },
    'jade': { '--accent': '#5aad8a', '--accent-dark': '#3a8066', '--accent-light': '#8dcfb5', '--accent-glow': 'rgba(90,173,138,0.12)' },
    'coral': { '--accent': '#e8724a', '--accent-dark': '#c04e2a', '--accent-light': '#f0a084', '--accent-glow': 'rgba(232,114,74,0.12)' }
  };
  const FONT_MAP = {
    'outfit': "'Outfit', sans-serif", 'playfair': "'Playfair Display', serif", 'inter': "'Inter', sans-serif",
    'raleway': "'Raleway', sans-serif", 'josefin': "'Josefin Sans', sans-serif", 'cormorant': "'Cormorant Garamond', serif"
  };

  function applyStoreSettings() {
    let settings; try { settings = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return; }
    const root = document.documentElement;
    const activeTheme = settings.theme || 'vibrant-blue';
    if (THEME_VARS[activeTheme]) Object.entries(THEME_VARS[activeTheme]).forEach(([k, v]) => root.style.setProperty(k, v));
    if (settings.palette && PALETTE_ACCENT[settings.palette]) Object.entries(PALETTE_ACCENT[settings.palette]).forEach(([k, v]) => root.style.setProperty(k, v));
    if (settings.font && FONT_MAP[settings.font]) { root.style.setProperty('--font-body', FONT_MAP[settings.font]); document.body.style.fontFamily = FONT_MAP[settings.font]; }
    if (settings.logoMain) $$('.logo-img--nav, .logo-img--loader, .logo-img--footer').forEach(img => { img.src = settings.logoMain; img.style.filter = 'none'; });
    if (settings.logoIcon) $$('.logo-img--card').forEach(img => { img.src = settings.logoIcon; img.style.filter = 'none'; });
    if (settings.storeName) document.title = settings.storeName + ' — Tienda';
    const catLabel = settings.catalogLabel || 'Categoría';
    [['#nav-catalog-label', catLabel], ['#mobile-catalog-label', catLabel], ['#catalog-title', catLabel + ' Completo'], ['#hero-cta-primary', 'Explorar ' + catLabel]].forEach(([sel, val]) => { const el = $(sel); if (el) el.textContent = val; });
    if (settings.texts) {
      const FIELD_MAP = [
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
      FIELD_MAP.forEach(([sk, eid]) => { const v = settings.texts[sk]; if (!v) return; const el = document.getElementById(eid); if (el) el.textContent = v; });
      [['txt-wa-link','contact-whatsapp-link'],['txt-ig-link','contact-instagram-link'],['txt-email-link','contact-email-link'],['txt-tt-link','contact-tiktok-link'],['txt-fb-link','contact-facebook-link']].forEach(([sk, eid]) => { const v = settings.texts[sk]; if (!v) return; const el = document.getElementById(eid); if (el) el.href = v; });
    }
  }

})();

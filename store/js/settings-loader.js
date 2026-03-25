/**
 * MVP Store — Settings Loader (store/js/settings-loader.js)
 * ==========================================================
 * Fetches config.json via MvpAPI and applies theme, colors,
 * and texts to the DOM via [data-txt] attributes.
 * Runs before store.js and ui.js.
 */

'use strict';

const SettingsLoader = (() => {

    const STORE_ID = new URLSearchParams(location.search).get('store') || 'bazr';
    let _config    = null;
    let _API       = null;

    /** Returns the loaded config (or null if not yet loaded). */
    function getConfig() { return _config; }
    function getAPI()    { return _API; }
    function getStoreId(){ return STORE_ID; }

    /**
     * Main init — call this first before everything else.
     * Returns { config, api } when done.
     */
    async function init() {
        _API    = MvpAPI.forStore(STORE_ID);
        _config = await _API.getConfig();
        applyAll(_config);
        return { config: _config, api: _API };
    }

    // ── Apply everything ────────────────────────────────────────
    function applyAll(cfg) {
        if (!cfg) return;
        applyTexts(cfg.texts);
        applyTheme(cfg);
        applyLinks(cfg);
        applyPageMeta(cfg);
    }

    /** Fill every [data-txt] element from cfg.texts */
    function applyTexts(texts) {
        if (!texts) return;
        document.querySelectorAll('[data-txt]').forEach(el => {
            const key = el.getAttribute('data-txt');
            const val = key === 'storeName'
                ? (_config?.storeName || '')
                : (texts[key] || '');
            if (!val) return;
            // For link elements update href too
            if (el.tagName === 'A' && key.endsWith('-link')) {
                el.href = val;
            } else {
                el.textContent = val;
            }
        });

        // Also set <title>
        const titleEl = document.querySelector('title');
        if (titleEl && _config?.storeName) {
            titleEl.textContent = _config.storeName + ' — Tienda';
        }
    }

    /** Apply CSS custom-property overrides from config.colors */
    function applyTheme(cfg) {
        const root = document.documentElement;

        // Theme preset classes
        if (cfg.theme) {
            document.body.classList.remove(...document.body.classList);
            document.body.classList.add(`theme-${cfg.theme}`);
        }

        // Custom color overrides
        if (cfg.colors) {
            const c = cfg.colors;
            if (c.primary)     root.style.setProperty('--clr-primary',       c.primary);
            if (c.primaryDark) root.style.setProperty('--clr-primary-dark',   c.primaryDark);
            if (c.accent)      root.style.setProperty('--clr-accent',         c.accent);
            if (c.bg)          root.style.setProperty('--bg',                 c.bg);
            if (c.text)        root.style.setProperty('--text',               c.text);
            // Recompute glow variants
            if (c.primary)     root.style.setProperty('--clr-primary-glow', hexToRgba(c.primary, 0.15));
        }

        // Font override
        if (cfg.font) {
            root.style.setProperty('--font-primary', `'${capitalize(cfg.font)}', sans-serif`);
        }

        // Logo image (if present)
        if (cfg.logoMain) {
            const loaderLogo = document.getElementById('loader-logo-text');
            if (loaderLogo) {
                loaderLogo.innerHTML = `<img src="${cfg.logoMain}" alt="${cfg.storeName}" style="max-height:80px;max-width:220px">`;
            }
            const navLogo = document.getElementById('nav-logo-text');
            if (navLogo) {
                navLogo.innerHTML = `<img src="${cfg.logoMain}" alt="${cfg.storeName}" style="max-height:40px">`;
            }
        }
    }

    /** Apply contact href links */
    function applyLinks(cfg) {
        const texts = cfg.texts || {};
        const map = {
            'contact-wa-link':    texts['txt-wa-link']    ? `https://wa.me/${texts['txt-wa-link'].replace(/\D/g,'')}` : '#',
            'contact-ig-link':    texts['txt-ig-link']    ? `https://instagram.com/${texts['txt-ig-link'].replace('@','')}` : '#',
            'contact-email-link': texts['txt-email-link'] ? `mailto:${texts['txt-email-link']}` : '#',
            'contact-tt-link':    texts['txt-tt-link']    ? `https://tiktok.com/@${texts['txt-tt-link'].replace('@','')}` : '#',
        };
        Object.entries(map).forEach(([id, href]) => {
            const el = document.getElementById(id);
            if (el) el.href = href;
        });

        // Footer links
        const footerWa = document.getElementById('footer-wa');
        const footerIg = document.getElementById('footer-ig');
        const footerTt = document.getElementById('footer-tt');
        if (footerWa && texts['txt-wa-link']) footerWa.href  = `https://wa.me/${texts['txt-wa-link'].replace(/\D/g,'')}`;
        if (footerIg && texts['txt-ig-link']) footerIg.href  = `https://instagram.com/${texts['txt-ig-link'].replace('@','')}`;
        if (footerTt && texts['txt-tt-link']) footerTt.href  = `https://tiktok.com/@${texts['txt-tt-link'].replace('@','')}`;

        // Footer copyright
        const footerCopy = document.getElementById('footer-copy');
        if (footerCopy && cfg.storeName) {
            footerCopy.textContent = `© ${new Date().getFullYear()} ${cfg.storeName}. Todos los derechos reservados.`;
        }
    }

    function applyPageMeta(cfg) {
        const desc = document.querySelector('meta[name="description"]');
        if (desc && cfg.storeName) {
            desc.content = `${cfg.storeName} — Tienda online. Encuentra los mejores productos.`;
        }
    }

    // ── Helpers ─────────────────────────────────────────────────
    function hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r},${g},${b},${alpha})`;
    }

    function capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    return { init, getConfig, getAPI, getStoreId, applyTexts };
})();

window.SettingsLoader = SettingsLoader;

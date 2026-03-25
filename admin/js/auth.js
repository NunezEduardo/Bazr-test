/**
 * MVP Admin — Auth Module (admin/js/auth.js)
 * ===========================================
 * Handles login form, session token, and license check.
 * Exposes: AdminAuth.init(), AdminAuth.getToken(), AdminAuth.getStoreId(), AdminAuth.logout()
 */
'use strict';

const AdminAuth = (() => {

    const STORAGE_KEY = 'mvp-admin-session';
    let _token   = null;
    let _storeId = null;
    let _api     = null;

    function getToken()   { return _token;   }
    function getStoreId() { return _storeId; }
    function getAPI()     { return _api;     }

    /**
     * Init — reads ?store=xxx from URL, checks saved session,
     * shows login screen if needed.
     * Returns a Promise that resolves when user is authenticated.
     */
    function init() {
        _storeId = new URLSearchParams(location.search).get('store') || 'bazr';
        _api     = MvpAPI.forStore(_storeId);

        // Restore session from localStorage
        const saved = _loadSession();
        if (saved) {
            _token       = saved.token;
            _storeId     = saved.storeId;
            _api         = MvpAPI.forStore(_storeId);
        }

        return new Promise((resolve) => {
            if (_token) {
                _verifyAndProceed(resolve);
            } else {
                _showLogin(resolve);
            }
        });
    }

    async function _verifyAndProceed(resolve) {
        // Quick license check — if fails show login
        try {
            const lic = await MvpAPI.getLicense(_storeId);
            if (!lic || !lic.active) {
                _showLogin(resolve, 'Licencia inactiva para esta tienda.');
                return;
            }
            _hideLogin();
            resolve({ token: _token, storeId: _storeId, api: _api });
        } catch {
            // Network down: allow offline if token exists
            _hideLogin();
            resolve({ token: _token, storeId: _storeId, api: _api });
        }
    }

    function _showLogin(resolve, errorMsg) {
        const screen = document.getElementById('login-screen');
        const chat   = document.getElementById('chat-screen');
        if (screen) screen.classList.remove('hidden');
        if (chat)   chat.classList.add('hidden');

        // Pre-fill store from URL
        const storeInput = document.getElementById('login-store');
        if (storeInput) storeInput.value = _storeId;

        if (errorMsg) _setLoginError(errorMsg);

        const form = document.getElementById('login-form');
        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await _handleLogin(resolve);
        }, { once: true });
    }

    async function _handleLogin(resolve) {
        const btn      = document.getElementById('login-btn');
        const storeVal = document.getElementById('login-store')?.value.trim().toLowerCase() || _storeId;
        const passVal  = document.getElementById('login-pass')?.value || '';

        if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }
        _setLoginError('');

        try {
            const res = await MvpAPI.login(storeVal, passVal);
            if (!res?.token) throw new Error('Credenciales incorrectas');

            _token   = res.token;
            _storeId = storeVal;
            _api     = MvpAPI.forStore(_storeId);

            // Update API token
            MvpAPI.setToken(_token);
            _saveSession({ token: _token, storeId: _storeId });

            _hideLogin();
            resolve({ token: _token, storeId: _storeId, api: _api });
        } catch (err) {
            _setLoginError(err.message || 'Error de autenticación');
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Ingresar'; }
        }
    }

    function _hideLogin() {
        document.getElementById('login-screen')?.classList.add('hidden');
        document.getElementById('chat-screen')?.classList.remove('hidden');
    }

    function _setLoginError(msg) {
        const el = document.getElementById('login-error');
        if (!el) return;
        el.textContent = msg;
        el.style.display = msg ? 'block' : 'none';
    }

    function logout() {
        _token   = null;
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
    }

    // ── Session persistence ──────────────────────────────────────
    function _saveSession(data) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    }
    function _loadSession() {
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null'); } catch { return null; }
    }

    return { init, getToken, getStoreId, getAPI, logout };
})();

window.AdminAuth = AdminAuth;

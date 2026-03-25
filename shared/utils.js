/**
 * MVP — Utilidades Compartidas (shared/utils.js)
 * ================================================
 * toast(), toWebP(), formatCurrency(), formatDate(), generateId(), debounce()
 */

const MvpUtils = (() => {
    'use strict';

    // ══════════════════════════════════════════════════════════════════════════
    // TOAST NOTIFICATIONS
    // ══════════════════════════════════════════════════════════════════════════

    let _toastContainer = null;

    function _getContainer() {
        if (!_toastContainer) {
            _toastContainer = document.createElement('div');
            _toastContainer.id = 'mvp-toast-container';
            _toastContainer.style.cssText = `
                position: fixed; bottom: 24px; right: 24px;
                display: flex; flex-direction: column; gap: 10px;
                z-index: 99999; pointer-events: none;
            `;
            document.body.appendChild(_toastContainer);
        }
        return _toastContainer;
    }

    /**
     * Muestra un toast notification.
     * @param {string} message  — Texto del toast
     * @param {'success'|'error'|'info'|'warning'} type
     * @param {number} duration — ms (default 3500)
     */
    function toast(message, type = 'info', duration = 3500) {
        const icons = {
            success: '✅',
            error:   '❌',
            warning: '⚠️',
            info:    'ℹ️',
        };
        const colors = {
            success: '#22c55e',
            error:   '#ef4444',
            warning: '#f59e0b',
            info:    '#3b82f6',
        };

        const el = document.createElement('div');
        el.style.cssText = `
            display: flex; align-items: center; gap: 10px;
            background: #1e1e2e; color: #f8f8f8;
            border-left: 4px solid ${colors[type] || colors.info};
            border-radius: 10px; padding: 12px 18px;
            font-family: 'Outfit', sans-serif; font-size: 14px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.35);
            pointer-events: all; cursor: pointer;
            max-width: 340px; word-break: break-word;
            opacity: 0; transform: translateX(20px);
            transition: opacity 0.25s ease, transform 0.25s ease;
        `;
        el.innerHTML = `<span style="font-size:18px">${icons[type] || icons.info}</span><span>${message}</span>`;
        el.title = 'Haz clic para cerrar';
        el.addEventListener('click', () => _removeToast(el));

        _getContainer().appendChild(el);

        requestAnimationFrame(() => {
            el.style.opacity  = '1';
            el.style.transform = 'translateX(0)';
        });

        setTimeout(() => _removeToast(el), duration);
    }

    function _removeToast(el) {
        el.style.opacity   = '0';
        el.style.transform = 'translateX(20px)';
        setTimeout(() => el.remove(), 280);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // IMAGE → WEBP CONVERSION
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Convierte un File de imagen a un Blob WebP usando <canvas>.
     * @param {File}   file     — Archivo de imagen original
     * @param {number} maxWidth — Ancho máximo en px (default 1200)
     * @param {number} quality  — 0.0–1.0 (default 0.82)
     * @returns {Promise<Blob>}
     */
    function toWebP(file, maxWidth = 1200, quality = 0.82) {
        return new Promise((resolve, reject) => {
            if (!file || !file.type.startsWith('image/')) {
                return reject(new Error('El archivo no es una imagen válida'));
            }

            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width  = maxWidth;
                }

                canvas.width  = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(
                    (blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('No se pudo convertir la imagen a WebP'));
                    },
                    'image/webp',
                    quality
                );
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('No se pudo cargar la imagen'));
            };

            img.src = url;
        });
    }

    /**
     * Abre un file picker, convierte la imagen seleccionada a WebP
     * y devuelve { file, blob, dataUrl, sizeBefore, sizeAfter }.
     * @param {object} options — { maxWidth, quality, accept }
     * @returns {Promise<{file, blob, dataUrl, sizeBefore, sizeAfter}|null>}
     */
    function pickAndConvertImage(options = {}) {
        return new Promise((resolve) => {
            const input = document.createElement('input');
            input.type   = 'file';
            input.accept = options.accept || 'image/*';

            input.onchange = async () => {
                const file = input.files[0];
                if (!file) return resolve(null);

                try {
                    const blob    = await toWebP(file, options.maxWidth, options.quality);
                    const dataUrl = await _blobToDataUrl(blob);
                    resolve({
                        file,
                        blob,
                        dataUrl,
                        sizeBefore: file.size,
                        sizeAfter:  blob.size,
                    });
                } catch (err) {
                    toast(err.message, 'error');
                    resolve(null);
                }
            };

            input.click();
        });
    }

    function _blobToDataUrl(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload  = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // ══════════════════════════════════════════════════════════════════════════
    // FORMATEADORES
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * Formatea un número como moneda.
     * @param {number} amount
     * @param {string} currency — 'USD', 'VES', etc. (default 'USD')
     * @param {string} locale   — 'es-VE', 'en-US', etc. (default 'es-VE')
     */
    function formatCurrency(amount, currency = 'USD', locale = 'es-VE') {
        try {
            return new Intl.NumberFormat(locale, {
                style: 'currency',
                currency,
                minimumFractionDigits: 2,
            }).format(amount);
        } catch {
            return `${currency} ${Number(amount).toFixed(2)}`;
        }
    }

    /**
     * Formatea una fecha ISO a string legible.
     * @param {string} isoString
     * @param {string} locale
     */
    function formatDate(isoString, locale = 'es-VE') {
        try {
            return new Intl.DateTimeFormat(locale, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
            }).format(new Date(isoString));
        } catch {
            return isoString;
        }
    }

    /**
     * Genera un ID único corto.
     * @param {string} prefix — 'prod', 'ord', etc.
     */
    function generateId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }

    /**
     * Debounce: retrasa la ejecución de fn hasta que pasen ms ms sin llamarla.
     */
    function debounce(fn, ms = 300) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), ms);
        };
    }

    /**
     * Trunca un string a un máximo de caracteres.
     */
    function truncate(str, max = 80) {
        if (!str) return '';
        return str.length > max ? str.slice(0, max - 1) + '…' : str;
    }

    /**
     * Limpia texto HTML básico para mostrarlo de forma segura.
     */
    function escapeHtml(str) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return String(str || '').replace(/[&<>"']/g, c => map[c]);
    }

    /**
     * Convierte bytes a string legible (KB, MB).
     */
    function formatBytes(bytes) {
        if (bytes < 1024)       return `${bytes} B`;
        if (bytes < 1048576)    return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1048576).toFixed(2)} MB`;
    }

    /**
     * Parsea parámetros de un comando tipo:
     *   "agregar nombre="Camisa" precio=29.99 coleccion="Ropa""
     * Devuelve: { nombre: 'Camisa', precio: '29.99', coleccion: 'Ropa' }
     */
    function parseCommandArgs(argsString) {
        const result = {};
        // Match key="value with spaces" or key=value
        const regex = /(\w[\w-]*)=(?:"([^"]*)"|(\S+))/g;
        let match;
        while ((match = regex.exec(argsString)) !== null) {
            result[match[1]] = match[2] !== undefined ? match[2] : match[3];
        }
        return result;
    }

    // ── API pública ───────────────────────────────────────────────────────────
    return {
        toast,
        toWebP,
        pickAndConvertImage,
        formatCurrency,
        formatDate,
        generateId,
        debounce,
        truncate,
        escapeHtml,
        formatBytes,
        parseCommandArgs,
    };
})();

// Exponer globalmente
window.MvpUtils = MvpUtils;

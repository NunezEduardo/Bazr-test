/**
 * MVP Admin — Image → WebP (admin/js/image-webp.js)
 * ===================================================
 * Opens an <input type="file">, converts the selected image to WebP
 * via <canvas>, and uploads it to the REST API.
 * Exposes: ImageWebp.pick(productId?, maxSizePx?) → Promise<url>
 */
'use strict';

const ImageWebp = (() => {

    const DEFAULT_MAX  = 1200; // px (longest side)
    const QUALITY      = 0.85;

    /**
     * Opens file picker, converts to WebP, uploads.
     * @param {string} storeId
     * @param {string} token
     * @param {string} [productId]
     * @param {number} [maxSizePx]
     * @returns {Promise<string>} URL of uploaded image
     */
    function pick(storeId, token, productId, maxSizePx = DEFAULT_MAX) {
        return new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type   = 'file';
            input.accept = 'image/*';
            input.style.display = 'none';
            document.body.appendChild(input);

            input.addEventListener('change', async () => {
                const file = input.files?.[0];
                document.body.removeChild(input);

                if (!file) { reject(new Error('No se seleccionó imagen.')); return; }

                try {
                    const blob = await _toWebP(file, maxSizePx);
                    const url  = await _upload(storeId, token, blob, productId);
                    resolve(url);
                } catch (err) {
                    reject(err);
                }
            });

            input.click();
        });
    }

    /** Convert File → WebP Blob via canvas */
    function _toWebP(file, maxSizePx) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const objUrl = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(objUrl);
                let { width, height } = img;

                // Scale down if too large
                if (Math.max(width, height) > maxSizePx) {
                    const ratio = maxSizePx / Math.max(width, height);
                    width  = Math.round(width  * ratio);
                    height = Math.round(height * ratio);
                }

                const canvas = document.createElement('canvas');
                canvas.width  = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                canvas.toBlob(blob => {
                    if (!blob) { reject(new Error('Error al convertir imagen.')); return; }
                    resolve(blob);
                }, 'image/webp', QUALITY);
            };
            img.onerror = () => reject(new Error('No se pudo cargar la imagen.'));
            img.src = objUrl;
        });
    }

    /** Upload blob to /api/:storeId/images */
    async function _upload(storeId, token, blob, productId) {
        const fd = new FormData();
        fd.append('image', blob, (productId || 'img') + '.webp');
        if (productId) fd.append('productId', productId);

        const res = await fetch(`/api/${storeId}/images`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + token },
            body: fd,
        });

        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        const data = await res.json();
        return data.url;
    }

    return { pick };
})();

window.ImageWebp = ImageWebp;

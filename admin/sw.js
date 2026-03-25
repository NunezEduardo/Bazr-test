/**
 * MVP Admin — Service Worker (admin/sw.js)
 * ==========================================
 * Caches admin shell + shared assets for offline use.
 */
'use strict';

const CACHE_NAME = 'mvp-admin-v1';
const SHELL = [
    '/admin/',
    '/admin/index.html',
    '/admin/styles.css',
    '/admin/js/auth.js',
    '/admin/js/chat.js',
    '/admin/js/commands.js',
    '/admin/js/help.js',
    '/admin/js/image-webp.js',
    '/shared/styles.css',
    '/shared/api.js',
    '/shared/utils.js',
];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL))
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    // Only cache GET, skip API calls (always go to network)
    if (e.request.method !== 'GET' || e.request.url.includes('/api/')) return;

    e.respondWith(
        caches.match(e.request).then(cached => {
            // Cache-first for shell, network-first for data
            if (cached) return cached;
            return fetch(e.request).then(res => {
                // Cache successful responses for shell assets
                if (res.ok && SHELL.some(p => e.request.url.endsWith(p))) {
                    const clone = res.clone();
                    caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
                }
                return res;
            }).catch(() => cached);
        })
    );
});

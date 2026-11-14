/* =========================================
   QR Free · Service worker (app instalable y uso sin conexión)
   Archivo fuente: src/sw.js — build.py genera /sw.js con la versión.
   - Páginas: primero la red; sin conexión, la copia guardada.
   - CSS/JS/fuentes/librerías: copia guardada al instante y se actualiza en segundo plano.
   - No guarda anuncios, ni los modelos de IA (esos se guardan aparte).
   ========================================= */
const VERSION = "__VERSION__";
const STATIC = `qrfree-static-${VERSION}`;
const PAGES = `qrfree-pages-${VERSION}`;
const PRECACHE = __PRECACHE__;
const PRECACHE_ASSETS = __ASSETS__;
const CDN_HOSTS = ["cdnjs.cloudflare.com", "cdn.jsdelivr.net", "unpkg.com", "cdn.sheetjs.com", "fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (event) => {
    const fill = (name, urls) => caches.open(name).then(cache => Promise.all(urls.map(url =>
        cache.add(new Request(url, { cache: "reload" })).catch(() => { /* un archivo que falla no impide instalar */ }))));
    event.waitUntil(Promise.all([fill(PAGES, PRECACHE), fill(STATIC, PRECACHE_ASSETS)]).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(k => k.startsWith("qrfree-") && k !== STATIC && k !== PAGES).map(k => caches.delete(k))))
            .then(() => self.clients.claim())
    );
});

function isModelFile(url) {
    return /huggingface\.co|hf\.co|cdn-lfs/.test(url.hostname) || /\.(onnx|wasm|bin)$/.test(url.pathname) && url.hostname !== self.location.hostname;
}

// La página abierta antes de instalar la app también queda guardada, con sus archivos
self.addEventListener("message", (event) => {
    const d = event.data || {};
    if (d.type !== "cache-page") return;
    const ok = (u) => { try { const x = new URL(u); return x.origin === self.location.origin || CDN_HOSTS.includes(x.hostname); } catch (e) { return false; } };
    event.waitUntil(Promise.all([
        caches.open(PAGES).then(c => c.add(d.page).catch(() => {})),
        caches.open(STATIC).then(c => Promise.all((d.assets || []).filter(ok).filter(u => !/\.(json|xml|txt)(\?|$)/.test(u)).map(u => c.match(u).then(hit => hit || c.add(u).catch(() => {}))))),
    ]));
});

self.addEventListener("fetch", (event) => {
    const req = event.request;
    if (req.method !== "GET") return;
    const url = new URL(req.url);
    if (isModelFile(url)) return; // transformers.js usa su propia caché
    const sameOrigin = url.origin === self.location.origin;
    if (!sameOrigin && !CDN_HOSTS.includes(url.hostname)) return; // anuncios, analítica, etc.

    if (req.mode === "navigate") {
        event.respondWith(networkFirst(req));
        return;
    }
    if (sameOrigin && /\.(json|xml|txt)$/.test(url.pathname)) return;
    event.respondWith(staleWhileRevalidate(req));
});

async function networkFirst(req) {
    const cache = await caches.open(PAGES);
    try {
        const res = await fetch(req);
        if (res.ok && res.type === "basic") cache.put(req, res.clone());
        return res;
    } catch (err) {
        const url = new URL(req.url);
        const cached = await cache.match(req, { ignoreSearch: true })
            || await cache.match(url.pathname.replace(/\.html$/, ""), { ignoreSearch: true })
            || await cache.match(url.pathname + ".html", { ignoreSearch: true })
            || await cache.match("/herramientas");
        return cached || new Response("<h1>Sin conexión</h1><p>Esta página aún no está guardada en su equipo.</p>", { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
}

async function staleWhileRevalidate(req) {
    const cache = await caches.open(STATIC);
    const cached = await cache.match(req);
    const update = fetch(req).then(res => {
        if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
        return res;
    }).catch(() => cached);
    return cached || update;
}

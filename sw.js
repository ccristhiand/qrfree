/* Generado por tools/build.py desde src/sw.js. No editar. */
/* =========================================
   QR Free · Service worker (app instalable y uso sin conexión)
   Archivo fuente: src/sw.js — build.py genera /sw.js con la versión.
   - Páginas: primero la red; sin conexión, la copia guardada.
   - CSS/JS/fuentes/librerías: copia guardada al instante y se actualiza en segundo plano.
   - No guarda anuncios, ni los modelos de IA (esos se guardan aparte).
   ========================================= */
const VERSION = "32ebbe7cf1";
const STATIC = `qrfree-static-${VERSION}`;
const PAGES = `qrfree-pages-${VERSION}`;
const PRECACHE = ["/", "/herramientas", "/styles.css?v=6b107e3f", "/main.js?v=a1345b1b", "/js/kit.js?v=4dd9d04a", "/js/indice.js?v=da62fcfc", "/js/buscador.js?v=15823eab", "/quitar-fondo", "/unir-pdf", "/escanear-documento", "/firmar-pdf", "/comprimir-pdf", "/transcribir-audio", "/cotizacion", "/calculadora-cts", "/heic-a-jpg"];
const PRECACHE_ASSETS = ["https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js", "/iconos_db.js", "/js/ia-tools.js?v=f6e3fa47", "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js", "/js/escaner.js?v=cfff238c", "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js", "/js/pdf-tools.js?v=7b5c8a16", "/js/firmar-pdf.js?v=adc0f772", "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js", "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js", "/js/image-tools.js?v=0522ca29", "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js", "/js/cotizacion.js?v=44478e79", "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", "/js/calc-peru.js?v=a71baa61"];
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

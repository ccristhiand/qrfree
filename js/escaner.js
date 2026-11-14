/* =========================================
   QR Free · Escáner de documentos con la cámara
   Detecta la hoja, corrige la perspectiva, mejora el contraste y crea un PDF.
   Sin librerías pesadas: todo con <canvas>. Requiere: kit.js, pdf-lib (PDF), JSZip (JPG)
   ========================================= */

/* ---- Detección automática de la hoja ---- */
function otsu(gray) {
    const hist = new Array(256).fill(0);
    for (let i = 0; i < gray.length; i++) hist[gray[i]]++;
    const total = gray.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let sumB = 0, wB = 0, best = 0, thr = 127;
    for (let t = 0; t < 256; t++) {
        wB += hist[t]; if (!wB) continue;
        const wF = total - wB; if (!wF) break;
        sumB += t * hist[t];
        const mB = sumB / wB, mF = (sum - sumB) / wF;
        const between = wB * wF * (mB - mF) * (mB - mF);
        if (between > best) { best = between; thr = t; }
    }
    return thr;
}
/** Devuelve las 4 esquinas [tl, tr, br, bl] en coordenadas del canvas, o null. */
function detectDocument(canvas) {
    const S = 256;
    const k = Math.min(1, S / Math.max(canvas.width, canvas.height));
    const w = Math.max(8, Math.round(canvas.width * k)), h = Math.max(8, Math.round(canvas.height * k));
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.filter = "blur(1px)";
    ctx.drawImage(canvas, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data;
    const gray = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) gray[i] = (d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114) | 0;
    const thr = otsu(gray);
    // Componente conexa clara más grande (la hoja suele ser más clara que la mesa)
    const label = new Int32Array(w * h).fill(-1);
    const stack = new Int32Array(w * h);
    let bestId = -1, bestSize = 0, id = 0;
    for (let start = 0; start < w * h; start++) {
        if (label[start] !== -1 || gray[start] <= thr) continue;
        let sp = 0, size = 0;
        stack[sp++] = start; label[start] = id;
        while (sp) {
            const p = stack[--sp]; size++;
            const x = p % w, y = (p / w) | 0;
            if (x > 0 && label[p - 1] === -1 && gray[p - 1] > thr) { label[p - 1] = id; stack[sp++] = p - 1; }
            if (x < w - 1 && label[p + 1] === -1 && gray[p + 1] > thr) { label[p + 1] = id; stack[sp++] = p + 1; }
            if (y > 0 && label[p - w] === -1 && gray[p - w] > thr) { label[p - w] = id; stack[sp++] = p - w; }
            if (y < h - 1 && label[p + w] === -1 && gray[p + w] > thr) { label[p + w] = id; stack[sp++] = p + w; }
        }
        if (size > bestSize) { bestSize = size; bestId = id; }
        id++;
    }
    const area = bestSize / (w * h);
    if (bestId < 0 || area < 0.12 || area > 0.97) return null;
    let tl, tr, br, bl, sMin = Infinity, sMax = -Infinity, dMin = Infinity, dMax = -Infinity;
    for (let p = 0; p < w * h; p++) {
        if (label[p] !== bestId) continue;
        const x = p % w, y = (p / w) | 0;
        const s = x + y, df = x - y;
        if (s < sMin) { sMin = s; tl = [x, y]; }
        if (s > sMax) { sMax = s; br = [x, y]; }
        if (df > dMax) { dMax = df; tr = [x, y]; }
        if (df < dMin) { dMin = df; bl = [x, y]; }
    }
    const back = (pt) => [(pt[0] + 0.5) / k, (pt[1] + 0.5) / k];
    return [tl, tr, br, bl].map(back);
}

/* ---- Corrección de perspectiva ---- */
function solveLinear(A, b) { // eliminación gaussiana con pivoteo
    const n = b.length;
    for (let i = 0; i < n; i++) {
        let max = i;
        for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[max][i])) max = r;
        [A[i], A[max]] = [A[max], A[i]]; [b[i], b[max]] = [b[max], b[i]];
        for (let r = i + 1; r < n; r++) {
            const f = A[r][i] / A[i][i];
            for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
            b[r] -= f * b[i];
        }
    }
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
        let s = b[i];
        for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c];
        x[i] = s / A[i][i];
    }
    return x;
}
/** Homografía que lleva los puntos from[i] a to[i] */
function homography(from, to) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
        const [x, y] = from[i], [u, v] = to[i];
        A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
        A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    const h = solveLinear(A, b);
    return [...h, 1];
}
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function warpDocument(src, quad, maxSide = 2400) {
    const [tl, tr, br, bl] = quad;
    let W = Math.max(dist(tl, tr), dist(bl, br)), H = Math.max(dist(tl, bl), dist(tr, br));
    const k = Math.min(1, maxSide / Math.max(W, H));
    W = Math.max(1, Math.round(W * k)); H = Math.max(1, Math.round(H * k));
    const m = homography([[0, 0], [W, 0], [W, H], [0, H]], quad);
    const sctx = src.getContext("2d", { willReadFrequently: true });
    const sw = src.width, sh = src.height;
    const sd = sctx.getImageData(0, 0, sw, sh).data;
    const out = document.createElement("canvas");
    out.width = W; out.height = H;
    const octx = out.getContext("2d");
    const img = octx.createImageData(W, H);
    const od = img.data;
    for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
            const den = m[6] * x + m[7] * y + m[8];
            let u = (m[0] * x + m[1] * y + m[2]) / den;
            let v = (m[3] * x + m[4] * y + m[5]) / den;
            u = Math.min(sw - 1.001, Math.max(0, u)); v = Math.min(sh - 1.001, Math.max(0, v));
            const x0 = u | 0, y0 = v | 0, fx = u - x0, fy = v - y0;
            const i00 = (y0 * sw + x0) * 4, i10 = i00 + 4, i01 = i00 + sw * 4, i11 = i01 + 4;
            const o = (y * W + x) * 4;
            for (let c = 0; c < 3; c++) {
                od[o + c] = (sd[i00 + c] * (1 - fx) + sd[i10 + c] * fx) * (1 - fy) + (sd[i01 + c] * (1 - fx) + sd[i11 + c] * fx) * fy;
            }
            od[o + 3] = 255;
        }
    }
    octx.putImageData(img, 0, 0);
    return out;
}

/* ---- Filtros ---- */
function blurredBackground(canvas) {
    const w = canvas.width, h = canvas.height;
    const sw = Math.max(4, Math.round(w / 32)), sh = Math.max(4, Math.round(h / 32));
    const small = document.createElement("canvas");
    small.width = sw; small.height = sh;
    const sctx = small.getContext("2d");
    sctx.imageSmoothingQuality = "high";
    sctx.drawImage(canvas, 0, 0, sw, sh);
    // "Máximo" local aproximado: aclara el fondo para no tomar el texto como sombra
    const sd = sctx.getImageData(0, 0, sw, sh);
    const copy = new Uint8ClampedArray(sd.data);
    for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        for (let c = 0; c < 3; c++) {
            let mx = 0;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                const xx = Math.min(sw - 1, Math.max(0, x + dx)), yy = Math.min(sh - 1, Math.max(0, y + dy));
                mx = Math.max(mx, copy[(yy * sw + xx) * 4 + c]);
            }
            sd.data[(y * sw + x) * 4 + c] = mx;
        }
    }
    sctx.putImageData(sd, 0, 0);
    const big = document.createElement("canvas");
    big.width = w; big.height = h;
    const bctx = big.getContext("2d");
    bctx.imageSmoothingQuality = "high";
    bctx.filter = "blur(2px)";
    bctx.drawImage(small, 0, 0, w, h);
    return bctx.getImageData(0, 0, w, h).data;
}
function applyScanFilter(canvas, filter) {
    const w = canvas.width, h = canvas.height;
    const out = document.createElement("canvas");
    out.width = w; out.height = h;
    const ctx = out.getContext("2d");
    ctx.drawImage(canvas, 0, 0);
    if (filter === "original") return out;
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    if (filter === "bw") {
        // Umbral adaptativo (Bradley): letras nítidas aunque la luz sea despareja
        const gray = new Float64Array(w * h);
        for (let i = 0; i < w * h; i++) gray[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
        const integ = new Float64Array((w + 1) * (h + 1));
        for (let y = 1; y <= h; y++) {
            let row = 0;
            for (let x = 1; x <= w; x++) { row += gray[(y - 1) * w + x - 1]; integ[y * (w + 1) + x] = integ[(y - 1) * (w + 1) + x] + row; }
        }
        const s = Math.max(8, Math.round(Math.max(w, h) / 16)), half = s >> 1, t = 0.15;
        for (let y = 0; y < h; y++) {
            const y1 = Math.max(0, y - half), y2 = Math.min(h, y + half + 1);
            for (let x = 0; x < w; x++) {
                const x1 = Math.max(0, x - half), x2 = Math.min(w, x + half + 1);
                const count = (x2 - x1) * (y2 - y1);
                const sum = integ[y2 * (w + 1) + x2] - integ[y1 * (w + 1) + x2] - integ[y2 * (w + 1) + x1] + integ[y1 * (w + 1) + x1];
                const v = gray[y * w + x] * count < sum * (1 - t) ? 0 : 255;
                const o = (y * w + x) * 4;
                d[o] = d[o + 1] = d[o + 2] = v;
            }
        }
    } else {
        // "Mejorado": quita sombras dividiendo por la iluminación del fondo
        const bg = blurredBackground(canvas);
        for (let i = 0; i < d.length; i += 4) {
            for (let c = 0; c < 3; c++) {
                let v = d[i + c] / Math.max(1, bg[i + c]) * 255;
                v = 255 * Math.pow(Math.min(1, v / 255), 1.6); // más contraste en el texto
                d[i + c] = v;
            }
            if (filter === "gray") { const g = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114; d[i] = d[i + 1] = d[i + 2] = g; }
        }
    }
    ctx.putImageData(img, 0, 0);
    return out;
}
function rotateCanvas(canvas, dir) {
    const out = document.createElement("canvas");
    out.width = canvas.height; out.height = canvas.width;
    const ctx = out.getContext("2d");
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate(dir * Math.PI / 2);
    ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2);
    return out;
}

/* ---- Interfaz ---- */
function initScanner() {
    const queue = [];       // fotos por recortar
    const pages = [];       // páginas listas { raw }
    let current = null;     // { canvas, quad, name }
    const stage = $("#scan-stage"), srcCanvas = $("#scan-src"), svg = $("#scan-overlay"), poly = $("#scan-poly");
    const handles = $$(".scan-handle", svg);
    const pagesEl = $("#scan-pages"), status = $("#tool-status");
    const filter = () => radioValue("scan-filter") || "auto";
    const MAX_SRC = 3000;

    const refreshStatus = () => {
        $("#btn-pdf").disabled = !pages.length;
        $("#btn-jpg").disabled = !pages.length;
        if (current) setStatusBox(status, "info", "Ajuste las esquinas a los bordes de la hoja y pulse <strong>Agregar página</strong>.");
        else if (pages.length) setStatusBox(status, "ok", `${pages.length} página(s) escaneada(s). Agregue más o descargue el PDF.`);
        else setStatusBox(status, "info", "Tome una foto del documento o suba imágenes.");
    };

    async function loadFile(file) {
        const bmp = await loadBitmap(file);
        const k = Math.min(1, MAX_SRC / Math.max(bmp.width, bmp.height));
        const c = document.createElement("canvas");
        c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
        c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
        if (bmp.close) bmp.close();
        return c;
    }
    const enqueue = async (files) => {
        for (const f of files) {
            if (isHeic(f)) { toast(`«${f.name}» es HEIC: conviértalo primero en /heic-a-jpg`, "error"); continue; }
            try { queue.push({ canvas: await loadFile(f), name: f.name }); } catch (e) { toast(`No se pudo abrir «${f.name}».`, "error"); }
        }
        if (!current) next();
    };
    initMultiDropzone($("#tool-drop"), $("#tool-input"), enqueue, isImage);
    $("#scan-camera").addEventListener("change", (e) => { enqueue(Array.from(e.target.files)); e.target.value = ""; });
    $("#btn-camera").addEventListener("click", () => $("#scan-camera").click());

    function next() {
        current = queue.shift() || null;
        show("scan-editor", !!current);
        show("scan-pick", !current);
        if (current) {
            autoDetect(true);
            $("#scan-queue").textContent = queue.length ? `+${queue.length} foto(s) en espera` : "";
            stage.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }
        refreshStatus();
    }
    function fullQuad() {
        const { width: w, height: h } = current.canvas;
        const m = Math.round(Math.min(w, h) * 0.04);
        return [[m, m], [w - m, m], [w - m, h - m], [m, h - m]];
    }
    function autoDetect(silent) {
        const q = detectDocument(current.canvas);
        current.quad = q || fullQuad();
        if (!silent) toast(q ? "Bordes detectados" : "No se detectó la hoja: ajuste las esquinas a mano", q ? "success" : "info");
        drawEditor();
    }
    function drawEditor() {
        const c = current.canvas;
        srcCanvas.width = c.width; srcCanvas.height = c.height;
        srcCanvas.getContext("2d").drawImage(c, 0, 0);
        svg.setAttribute("viewBox", `0 0 ${c.width} ${c.height}`);
        drawQuad();
    }
    function drawQuad() {
        const q = current.quad;
        poly.setAttribute("points", q.map(p => p.join(",")).join(" "));
        const scale = srcCanvas.getBoundingClientRect().width / current.canvas.width || 1;
        handles.forEach((hd, i) => {
            hd.setAttribute("cx", q[i][0]); hd.setAttribute("cy", q[i][1]);
            hd.setAttribute("r", 14 / scale);
            hd.setAttribute("stroke-width", 3 / scale);
        });
        poly.setAttribute("stroke-width", 3 / scale);
    }
    window.addEventListener("resize", () => current && drawQuad());

    // Arrastrar esquinas (mouse y dedo) y moverlas con el teclado
    let drag = -1;
    const toImage = (e) => {
        const r = srcCanvas.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width * current.canvas.width;
        const y = (e.clientY - r.top) / r.height * current.canvas.height;
        return [Math.min(current.canvas.width, Math.max(0, x)), Math.min(current.canvas.height, Math.max(0, y))];
    };
    handles.forEach((hd, i) => {
        hd.addEventListener("pointerdown", (e) => { e.preventDefault(); drag = i; hd.setPointerCapture(e.pointerId); hd.classList.add("is-drag"); });
        hd.addEventListener("pointermove", (e) => { if (drag !== i) return; current.quad[i] = toImage(e); drawQuad(); });
        const end = () => { drag = -1; hd.classList.remove("is-drag"); };
        hd.addEventListener("pointerup", end);
        hd.addEventListener("pointercancel", end);
        hd.addEventListener("keydown", (e) => {
            const step = (e.shiftKey ? 40 : 8) * current.canvas.width / 1000;
            const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
            if (!d) return;
            e.preventDefault();
            const p = current.quad[i];
            current.quad[i] = [Math.min(current.canvas.width, Math.max(0, p[0] + d[0])), Math.min(current.canvas.height, Math.max(0, p[1] + d[1]))];
            drawQuad();
        });
    });

    $("#scan-auto").addEventListener("click", () => autoDetect(false));
    $("#scan-full").addEventListener("click", () => { current.quad = fullQuad(); drawQuad(); });
    $("#scan-rot-l").addEventListener("click", () => { current.canvas = rotateCanvas(current.canvas, -1); autoDetect(true); });
    $("#scan-rot-r").addEventListener("click", () => { current.canvas = rotateCanvas(current.canvas, 1); autoDetect(true); });
    $("#scan-discard").addEventListener("click", () => next());
    $("#scan-add").addEventListener("click", () => {
        const btn = $("#scan-add");
        setBusy(btn, true, "Enderezando…");
        setTimeout(() => { // deja pintar el estado antes del cálculo
            try {
                const raw = warpDocument(current.canvas, current.quad);
                pages.push({ raw, name: current.name });
                renderPages();
                toast(`Página ${pages.length} agregada`, "success");
            } catch (e) { console.error(e); toast("No se pudo procesar la foto.", "error"); }
            setBusy(btn, false);
            next();
        }, 30);
    });

    function thumbOf(p) {
        const k = 240 / Math.max(p.raw.width, p.raw.height);
        const small = document.createElement("canvas");
        small.width = Math.max(1, Math.round(p.raw.width * k)); small.height = Math.max(1, Math.round(p.raw.height * k));
        small.getContext("2d").drawImage(p.raw, 0, 0, small.width, small.height);
        return applyScanFilter(small, filter());
    }
    function renderPages() {
        pagesEl.innerHTML = "";
        pages.forEach((p, i) => {
            const li = document.createElement("li");
            li.className = "scan-page";
            li.appendChild(thumbOf(p));
            li.insertAdjacentHTML("beforeend", `<span class="page-num">${i + 1}</span>
                <span class="scan-page-actions">
                    <button type="button" class="icon-btn" data-act="up" aria-label="Mover antes"${i === 0 ? " disabled" : ""}><i class="fa-solid fa-arrow-left" aria-hidden="true"></i></button>
                    <button type="button" class="icon-btn" data-act="rot" aria-label="Girar"><i class="fa-solid fa-rotate-right" aria-hidden="true"></i></button>
                    <button type="button" class="icon-btn icon-btn-danger" data-act="del" aria-label="Eliminar página"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
                </span>`);
            $$("button", li).forEach(b => b.addEventListener("click", () => {
                const a = b.dataset.act;
                if (a === "del") pages.splice(i, 1);
                if (a === "up") [pages[i - 1], pages[i]] = [pages[i], pages[i - 1]];
                if (a === "rot") p.raw = rotateCanvas(p.raw, 1);
                renderPages(); refreshStatus();
            }));
            pagesEl.appendChild(li);
        });
        show("scan-pages-card", pages.length > 0);
        refreshStatus();
    }
    $$('input[name="scan-filter"]').forEach(r => r.addEventListener("change", renderPages));

    const fileBase = () => sanitizeFilename($("#scan-name").value) || `escaneo_${isoDate(new Date())}`;
    $("#btn-pdf").addEventListener("click", async () => {
        const btn = $("#btn-pdf");
        setBusy(btn, true, "Creando PDF…");
        try {
            const out = await PDFLib.PDFDocument.create();
            const size = $("#scan-size").value;
            for (let i = 0; i < pages.length; i++) {
                setProgress("tool-progress", i, pages.length, `Página ${i + 1} de ${pages.length}`);
                await new Promise(r => setTimeout(r, 0));
                const c = applyScanFilter(pages[i].raw, filter());
                const img = await out.embedJpg(await (await canvasToBlob(c, "image/jpeg", filter() === "bw" ? 0.7 : 0.82)).arrayBuffer());
                let pw, ph;
                if (size === "fit") { pw = c.width * 72 / 200; ph = c.height * 72 / 200; }
                else { [pw, ph] = PAGE_SIZES_SCAN[size]; if (c.width > c.height) [pw, ph] = [ph, pw]; }
                const page = out.addPage([pw, ph]);
                const s = Math.min(pw / img.width, ph / img.height);
                page.drawImage(img, { x: (pw - img.width * s) / 2, y: (ph - img.height * s) / 2, width: img.width * s, height: img.height * s });
            }
            const bytes = await out.save();
            setProgress("tool-progress", 0, 0);
            triggerDownload(new Blob([bytes], { type: "application/pdf" }), `${fileBase()}.pdf`);
            setStatusBox(status, "ok", `¡Listo! PDF de ${pages.length} página(s) · ${fmtBytes(bytes.length)}.`);
            afterDownload();
        } catch (e) {
            console.error(e);
            setProgress("tool-progress", 0, 0);
            setStatusBox(status, "error", "No se pudo crear el PDF. Recargue la página e inténtelo de nuevo.");
        }
        setBusy(btn, false);
    });
    $("#btn-jpg").addEventListener("click", async () => {
        const btn = $("#btn-jpg");
        setBusy(btn, true, "Preparando…");
        const files = [];
        for (let i = 0; i < pages.length; i++) {
            const c = applyScanFilter(pages[i].raw, filter());
            files.push({ name: `${fileBase()}_${i + 1}.jpg`, blob: await canvasToBlob(c, "image/jpeg", 0.9) });
        }
        await downloadMany(files, `${fileBase()}.zip`);
        setBusy(btn, false);
    });
    refreshStatus();
}
const PAGE_SIZES_SCAN = { a4: [595.28, 841.89], letter: [612, 792] };

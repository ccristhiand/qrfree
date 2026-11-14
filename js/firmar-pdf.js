/* =========================================
   QR Free · Firmar PDF
   Dibuje, escriba o suba su firma y colóquela en el documento.
   Requiere: kit.js, pdf-tools.js (pdf.js + pdf-lib)
   ========================================= */
const SIG_KEY = "qrfree-firmas";
const SIG_FONTS = { "Great Vibes": "Elegante", "Dancing Script": "Manuscrita", "Caveat": "Natural" };

/** Recorta el espacio vacío alrededor del trazo */
function trimCanvas(c, pad = 12) {
    const ctx = c.getContext("2d");
    const { width: w, height: h } = c;
    const d = ctx.getImageData(0, 0, w, h).data;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        if (d[(y * w + x) * 4 + 3] > 10) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
    }
    if (x1 < 0) return null;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(w - 1, x1 + pad); y1 = Math.min(h - 1, y1 + pad);
    const out = document.createElement("canvas");
    out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
    out.getContext("2d").drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
    return out;
}
function textToCanvas(text, { font = "Inter, Arial, sans-serif", size = 72, color = "#111827", weight = "500" } = {}) {
    const c = document.createElement("canvas");
    const ctx = c.getContext("2d");
    ctx.font = `${weight} ${size}px ${font}`;
    const w = Math.ceil(ctx.measureText(text).width) + size;
    c.width = Math.max(10, w); c.height = Math.round(size * 1.8);
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color;
    ctx.textBaseline = "middle";
    ctx.fillText(text, size / 2, c.height / 2);
    return trimCanvas(c, 6) || c;
}
/** PDF: punto visto en pantalla (origen arriba a la izquierda) -> coordenadas del PDF */
function viewToPdf(vx, vy, angle, box) {
    const { x, y, width: W, height: H } = box;
    let ux, uy;
    if (angle === 90) { ux = vy; uy = vx; }
    else if (angle === 180) { ux = W - vx; uy = vy; }
    else if (angle === 270) { ux = W - vy; uy = H - vx; }
    else { ux = vx; uy = H - vy; }
    return [ux + x, uy + y];
}

function initSignPdf() {
    let bytes = null, file = null, pdfDoc = null;
    let signature = null;           // dataURL PNG de la firma activa
    let placing = null;             // { dataUrl, ratio, kind } esperando un toque en la página
    const items = [];
    const pagesEl = $("#sign-pages"), status = $("#tool-status"), runBtn = $("#btn-run");
    const color = () => radioValue("sig-color") || "#111827";

    // Fuentes manuscritas (Google Fonts), solo en esta página
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=Caveat:wght@600&family=Dancing+Script:wght@600&family=Great+Vibes&display=swap";
    document.head.appendChild(link);

    const refresh = () => {
        runBtn.disabled = !bytes || !items.length;
        $$("[data-place]").forEach(b => b.disabled = !bytes);
        if (!bytes) setStatusBox(status, "info", "Suba el PDF que desea firmar.");
        else if (placing) setStatusBox(status, "warn", "<strong>Toque en el documento</strong> donde quiere colocarlo.");
        else if (!items.length) setStatusBox(status, "info", signature ? "Pulse <strong>Colocar firma</strong> y toque el lugar en el documento." : "Cree su firma en el paso 2.");
        else setStatusBox(status, "ok", `${items.length} elemento(s) en el documento. Arrástrelos para moverlos; use la esquina para cambiar el tamaño.`);
    };

    /* ---- 1. PDF ---- */
    singlePdfLoader({
        onLoad: async (f, b) => {
            await openPdfLib(b); // valida (protegido, dañado)
            file = f; bytes = b;
            pdfDoc = await openPdfjs(b);
            $("#tool-chip-meta").textContent = `${fmtBytes(f.size)} · ${pdfDoc.numPages} páginas`;
            await renderPages();
            show("sign-doc-card", true);
            refresh();
        },
        onReset: () => {
            bytes = file = null; items.length = 0; placing = null;
            if (pdfDoc) { pdfDoc.destroy(); pdfDoc = null; }
            pagesEl.innerHTML = ""; show("sign-doc-card", false);
            refresh();
        },
    });

    async function renderPages() {
        pagesEl.innerHTML = "";
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const cssW = Math.min(900, pagesEl.clientWidth || 800);
        for (let i = 1; i <= pdfDoc.numPages; i++) {
            const page = await pdfDoc.getPage(i);
            const base = page.getViewport({ scale: 1 });
            const vp = page.getViewport({ scale: cssW / base.width * dpr });
            const wrap = document.createElement("div");
            wrap.className = "sign-page";
            wrap.dataset.page = i - 1;
            wrap.style.aspectRatio = `${base.width} / ${base.height}`;
            const c = document.createElement("canvas");
            c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
            wrap.appendChild(c);
            wrap.insertAdjacentHTML("beforeend", `<span class="sign-page-num">Página ${i} de ${pdfDoc.numPages}</span>`);
            pagesEl.appendChild(wrap);
            wrap.addEventListener("click", (e) => {
                if (!placing || e.target.closest(".sign-item")) return;
                const r = wrap.getBoundingClientRect();
                addItem(i - 1, (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, placing);
                placing = null;
                pagesEl.classList.remove("is-placing");
                refresh();
            });
            await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
            page.cleanup();
        }
        items.forEach(mountItem);
    }

    function addItem(pageIdx, cx, cy, src) {
        const wrap = $(`.sign-page[data-page="${pageIdx}"]`, pagesEl);
        const r = wrap.getBoundingClientRect();
        const fw = src.kind === "sig" ? 0.28 : Math.min(0.6, 0.025 * src.ratio * r.height / r.width);
        const fh = fw * r.width / src.ratio / r.height;
        const it = { page: pageIdx, fw, fh, fx: Math.min(1 - fw, Math.max(0, cx - fw / 2)), fy: Math.min(1 - fh, Math.max(0, cy - fh / 2)), dataUrl: src.dataUrl, ratio: src.ratio, kind: src.kind };
        items.push(it);
        mountItem(it);
    }
    function mountItem(it) {
        const wrap = $(`.sign-page[data-page="${it.page}"]`, pagesEl);
        if (!wrap) return;
        const el = document.createElement("div");
        el.className = "sign-item";
        el.tabIndex = 0;
        el.setAttribute("role", "group");
        el.setAttribute("aria-label", it.kind === "sig" ? "Firma: arrastre para mover; flechas para ajustar" : "Texto: arrastre para mover");
        el.innerHTML = `<img alt="" draggable="false"><button type="button" class="sign-del" aria-label="Quitar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button><span class="sign-resize" aria-hidden="true"></span>`;
        $("img", el).src = it.dataUrl;
        it.el = el;
        const place = () => Object.assign(el.style, { left: it.fx * 100 + "%", top: it.fy * 100 + "%", width: it.fw * 100 + "%", height: it.fh * 100 + "%" });
        place();
        wrap.appendChild(el);
        $(".sign-del", el).addEventListener("click", (e) => { e.stopPropagation(); items.splice(items.indexOf(it), 1); el.remove(); refresh(); });
        let mode = null, start = null;
        el.addEventListener("pointerdown", (e) => {
            if (e.target.closest(".sign-del")) return;
            e.preventDefault();
            mode = e.target.closest(".sign-resize") ? "resize" : "move";
            const r = wrap.getBoundingClientRect();
            start = { x: e.clientX, y: e.clientY, fx: it.fx, fy: it.fy, fw: it.fw, fh: it.fh, rw: r.width, rh: r.height };
            el.setPointerCapture(e.pointerId);
            el.classList.add("is-active");
        });
        el.addEventListener("pointermove", (e) => {
            if (!mode) return;
            const dx = (e.clientX - start.x) / start.rw, dy = (e.clientY - start.y) / start.rh;
            if (mode === "move") {
                it.fx = Math.min(1 - it.fw, Math.max(0, start.fx + dx));
                it.fy = Math.min(1 - it.fh, Math.max(0, start.fy + dy));
            } else {
                const fw = Math.min(1 - it.fx, Math.max(0.04, start.fw + dx));
                const fh = fw * start.rw / it.ratio / start.rh;
                if (it.fy + fh <= 1) { it.fw = fw; it.fh = fh; }
            }
            place();
        });
        const end = () => { mode = null; el.classList.remove("is-active"); };
        el.addEventListener("pointerup", end);
        el.addEventListener("pointercancel", end);
        el.addEventListener("keydown", (e) => {
            const s = e.shiftKey ? 0.02 : 0.005;
            const d = { ArrowLeft: [-s, 0], ArrowRight: [s, 0], ArrowUp: [0, -s], ArrowDown: [0, s] }[e.key];
            if (e.key === "Delete" || e.key === "Backspace") { $(".sign-del", el).click(); return; }
            if (!d) return;
            e.preventDefault();
            it.fx = Math.min(1 - it.fw, Math.max(0, it.fx + d[0]));
            it.fy = Math.min(1 - it.fh, Math.max(0, it.fy + d[1]));
            place();
        });
    }

    /* ---- 2. Firma: dibujar ---- */
    const pad = $("#sig-pad");
    const pctx = pad.getContext("2d");
    let drawing = false, last = null, hasInk = false;
    const sizePad = () => {
        const r = pad.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        if (!r.width) return;
        pad.width = Math.round(r.width * dpr); pad.height = Math.round(r.height * dpr);
        pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        pctx.lineCap = "round"; pctx.lineJoin = "round";
        hasInk = false;
    };
    const padPoint = (e) => { const r = pad.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, t: performance.now() }; };
    pad.addEventListener("pointerdown", (e) => { e.preventDefault(); if (!pad.width) sizePad(); drawing = true; last = padPoint(e); pad.setPointerCapture(e.pointerId); });
    pad.addEventListener("pointermove", (e) => {
        if (!drawing) return;
        const p = padPoint(e);
        const v = Math.hypot(p.x - last.x, p.y - last.y) / Math.max(1, p.t - last.t);
        pctx.strokeStyle = color();
        pctx.lineWidth = Math.max(1.6, Math.min(4.2, 4.2 - v * 1.6)); // trazo más fino cuanto más rápido, como con lapicero
        pctx.beginPath();
        pctx.moveTo(last.x, last.y);
        pctx.quadraticCurveTo(last.x, last.y, (last.x + p.x) / 2, (last.y + p.y) / 2);
        pctx.lineTo(p.x, p.y);
        pctx.stroke();
        last = p; hasInk = true;
    });
    const stop = () => { drawing = false; };
    pad.addEventListener("pointerup", stop);
    pad.addEventListener("pointercancel", stop);
    $("#sig-clear").addEventListener("click", sizePad);
    new ResizeObserver(() => { if (!hasInk) sizePad(); }).observe(pad);

    /* ---- Escribir ---- */
    const typePrev = $("#sig-type-preview");
    const drawTyped = async () => {
        const text = $("#sig-text").value.trim() || "Su nombre";
        const font = radioValue("sig-font") || "Great Vibes";
        try { await document.fonts.load(`64px "${font}"`); } catch (e) { /* usa respaldo */ }
        const c = textToCanvas(text, { font: `"${font}", cursive`, size: 96, color: color(), weight: font === "Great Vibes" ? "400" : "600" });
        typePrev.width = c.width; typePrev.height = c.height;
        typePrev.getContext("2d").drawImage(c, 0, 0);
        return c;
    };
    $("#sig-text").addEventListener("input", drawTyped);
    $$('input[name="sig-font"]').forEach(r => r.addEventListener("change", drawTyped));

    /* ---- Subir imagen (quita el fondo blanco) ---- */
    let uploaded = null;
    initDropzone($("#sig-drop"), $("#sig-input"), async (f) => {
        try {
            const bmp = await loadBitmap(f);
            const k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height));
            const c = document.createElement("canvas");
            c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
            const ctx = c.getContext("2d");
            ctx.drawImage(bmp, 0, 0, c.width, c.height);
            const img = ctx.getImageData(0, 0, c.width, c.height);
            for (let i = 0; i < img.data.length; i += 4) {
                const l = img.data[i] * 0.299 + img.data[i + 1] * 0.587 + img.data[i + 2] * 0.114;
                img.data[i + 3] = l > 215 ? 0 : l > 160 ? Math.round((215 - l) / 55 * 255) : 255;
            }
            ctx.putImageData(img, 0, 0);
            uploaded = trimCanvas(c) || c;
            const prev = $("#sig-up-preview");
            prev.width = uploaded.width; prev.height = uploaded.height;
            prev.getContext("2d").drawImage(uploaded, 0, 0);
            show(prev, true);
        } catch (e) { toast("No se pudo leer la imagen.", "error"); }
    });

    /* ---- Usar / guardar firma ---- */
    const saved = () => localGet(SIG_KEY, []);
    const renderSaved = () => {
        const list = saved();
        const box = $("#sig-saved");
        box.innerHTML = list.map((d, i) => `<button type="button" class="sig-saved-btn" data-i="${i}" aria-label="Usar firma guardada ${i + 1}"><img src="${d}" alt=""></button>`).join("");
        show("sig-saved-wrap", list.length > 0);
        $$("button", box).forEach(b => b.addEventListener("click", () => setSignature(list[+b.dataset.i], false)));
    };
    const setSignature = (dataUrl, store = true) => {
        signature = dataUrl;
        $("#sig-current").src = dataUrl;
        show("sig-current-wrap", true);
        if (store && $("#sig-remember").checked) {
            const list = saved().filter(d => d !== dataUrl);
            list.unshift(dataUrl);
            localSet(SIG_KEY, list.slice(0, 3));
            renderSaved();
        }
        refresh();
        toast("Firma lista. Ahora pulse «Colocar firma».", "success");
    };
    $("#sig-use").addEventListener("click", async () => {
        const tab = $('[role="tab"][aria-selected="true"]', $("#sig-tabs")).id;
        let c = null;
        if (tab === "tab-draw") { c = hasInk ? trimCanvas(pad) : null; if (!c) { toast("Dibuje su firma en el recuadro.", "error"); return; } }
        else if (tab === "tab-type") { if (!$("#sig-text").value.trim()) { toast("Escriba su nombre.", "error"); $("#sig-text").focus(); return; } c = await drawTyped(); }
        else { c = uploaded; if (!c) { toast("Suba una foto de su firma.", "error"); return; } }
        setSignature(c.toDataURL("image/png"));
    });
    $("#sig-forget").addEventListener("click", () => { localSet(SIG_KEY, []); renderSaved(); toast("Firmas guardadas eliminadas de este equipo.", "info"); });

    /* ---- 3. Colocar ---- */
    const startPlacing = (src) => {
        if (!bytes) return;
        placing = src;
        pagesEl.classList.add("is-placing");
        refresh();
        $("#sign-doc-card").scrollIntoView({ block: "start", behavior: "smooth" });
    };
    $("#add-sig").addEventListener("click", () => {
        if (!signature) { toast("Primero cree su firma en el paso 2.", "error"); $("#sig-tabs").scrollIntoView({ block: "center", behavior: "smooth" }); return; }
        const img = new Image();
        img.onload = () => startPlacing({ dataUrl: signature, ratio: img.width / img.height, kind: "sig" });
        img.src = signature;
    });
    const placeText = (text) => {
        if (!text) return;
        const c = textToCanvas(text, { size: 64, color: color(), weight: "500" });
        startPlacing({ dataUrl: c.toDataURL("image/png"), ratio: c.width / c.height, kind: "text" });
    };
    $("#add-text").addEventListener("click", () => {
        const v = $("#text-value").value.trim();
        if (!v) { toast("Escriba el texto primero (nombre, DNI, cargo…).", "error"); $("#text-value").focus(); return; }
        placeText(v);
    });
    $("#add-date").addEventListener("click", () => placeText(new Date().toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && placing) { placing = null; pagesEl.classList.remove("is-placing"); refresh(); } });

    /* ---- Descargar ---- */
    runBtn.addEventListener("click", async () => {
        setBusy(runBtn, true, "Firmando…");
        try {
            const doc = await openPdfLib(bytes);
            const pages = doc.getPages();
            const cache = new Map();
            for (const it of items) {
                const page = pages[it.page];
                if (!cache.has(it.dataUrl)) cache.set(it.dataUrl, await doc.embedPng(it.dataUrl));
                const img = cache.get(it.dataUrl);
                const angle = ((page.getRotation().angle % 360) + 360) % 360;
                const box = page.getCropBox();
                const Vw = angle % 180 ? box.height : box.width, Vh = angle % 180 ? box.width : box.height;
                const [x, y] = viewToPdf(it.fx * Vw, (it.fy + it.fh) * Vh, angle, box);
                page.drawImage(img, { x, y, width: it.fw * Vw, height: it.fh * Vh, rotate: PDFLib.degrees(angle) });
            }
            const out = await doc.save();
            triggerDownload(new Blob([out], { type: "application/pdf" }), `${sanitizeFilename(baseName(file.name)) || "documento"}_firmado.pdf`);
            setStatusBox(status, "ok", "¡Listo! Su PDF firmado se está descargando.");
            afterDownload();
        } catch (err) {
            console.error(err);
            setStatusBox(status, "error", pdfError(err, file ? file.name : "el PDF"));
        }
        setBusy(runBtn, false);
    });

    renderSaved();
    drawTyped();
    refresh();
}

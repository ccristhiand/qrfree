/* =========================================
   QR Free · Herramientas PDF (100 % en el navegador)
   Unir, dividir, comprimir, imagen a PDF y PDF a JPG.
   Requiere: pdf-lib (PDFLib), pdf.js (pdfjsLib) según la herramienta, JSZip, kit.js
   ========================================= */
const PDFJS_WORKER = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

function getPdfjs() {
    if (!window.pdfjsLib) throw new Error("No se pudo cargar el lector de PDF. Revise su conexión y recargue la página.");
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return pdfjsLib;
}
async function openPdfjs(bytes) {
    // pdf.js transfiere el buffer al worker: se le pasa una copia
    return getPdfjs().getDocument({ data: bytes.slice(0) }).promise;
}
async function openPdfLib(bytes) {
    // Sin ignoreEncryption: un PDF cifrado saldría con páginas en blanco, mejor avisar
    return PDFLib.PDFDocument.load(bytes, { updateMetadata: false });
}
function pdfError(err, name) {
    console.error(err);
    const msg = String(err && err.message || err);
    if (/encrypt|password/i.test(msg)) return `«${name}» está protegido (contraseña o restricciones). Ábralo, use «Imprimir → Guardar como PDF» para quitar la protección e inténtelo otra vez.`;
    return `No se pudo leer «${name}». Puede estar dañado o no ser un PDF.`;
}
function pdfBlob(bytes) { return new Blob([bytes], { type: "application/pdf" }); }

/** Convierte "1-3, 5, 8-" en índices (base 0) válidos. */
function parsePageRanges(text, total) {
    const out = [];
    const seen = new Set();
    String(text || "").split(/[,;\s]+/).filter(Boolean).forEach(part => {
        const m = part.match(/^(\d*)\s*-\s*(\d*)$/);
        let a, b;
        if (m) { a = m[1] ? +m[1] : 1; b = m[2] ? +m[2] : total; }
        else if (/^\d+$/.test(part)) { a = b = +part; }
        else return;
        if (a > b) [a, b] = [b, a];
        for (let p = Math.max(1, a); p <= Math.min(total, b); p++) {
            if (!seen.has(p)) { seen.add(p); out.push(p - 1); }
        }
    });
    return out;
}
/** Índices (base 0) -> "1-3, 5" */
function formatPageRanges(indices) {
    const s = [...indices].sort((a, b) => a - b).map(i => i + 1);
    const parts = [];
    for (let i = 0; i < s.length; i++) {
        let j = i;
        while (j + 1 < s.length && s[j + 1] === s[j] + 1) j++;
        parts.push(i === j ? `${s[i]}` : `${s[i]}-${s[j]}`);
        i = j;
    }
    return parts.join(", ");
}

/** Dibuja miniaturas de las páginas en un contenedor (selección opcional). */
async function renderThumbs(pdf, container, { selectable = false, onToggle, selected } = {}) {
    container.innerHTML = "";
    show(container, true);
    const total = pdf.numPages;
    for (let i = 1; i <= total; i++) {
        const btn = document.createElement(selectable ? "button" : "div");
        btn.className = "page-thumb";
        if (selectable) {
            btn.type = "button";
            btn.setAttribute("aria-pressed", String(selected ? selected.has(i - 1) : false));
            btn.setAttribute("aria-label", `Página ${i}`);
            btn.addEventListener("click", () => onToggle(i - 1, btn));
        }
        btn.innerHTML = `<span class="page-canvas"></span><span class="page-num">${i}</span>`;
        container.appendChild(btn);
    }
    // Render progresivo para no congelar la página
    const holders = $$(".page-canvas", container);
    for (let i = 1; i <= total; i++) {
        if (!container.isConnected) return;
        try {
            const page = await pdf.getPage(i);
            const vp1 = page.getViewport({ scale: 1 });
            const vp = page.getViewport({ scale: 150 / Math.max(vp1.width, vp1.height) });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
            await page.render({ canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
            holders[i - 1].appendChild(canvas);
            page.cleanup();
        } catch (e) { /* miniatura opcional */ }
    }
}

/* ---- Estado común de una herramienta de un solo PDF ---- */
function singlePdfLoader({ onLoad, onReset }) {
    const zone = $("#tool-drop"), input = $("#tool-input"), chip = $("#tool-chip");
    initMultiDropzone(zone, input, async (files) => {
        const file = files[0];
        try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            $("#tool-chip-name").textContent = file.name;
            $("#tool-chip-meta").textContent = fmtBytes(file.size);
            show(chip, true); show(zone, false);
            await onLoad(file, bytes);
        } catch (err) {
            toast(pdfError(err, file.name), "error");
            reset();
        }
    }, isPdf);
    const reset = () => { show(chip, false); show(zone, true); onReset(); };
    $("#tool-chip-remove").addEventListener("click", reset);
    return reset;
}

/* =========================================
   1. UNIR PDF
   ========================================= */
function initMergePdf() {
    const items = [];
    const list = $("#file-list"), btn = $("#btn-run"), status = $("#tool-status");
    const refresh = () => {
        const pages = items.reduce((s, it) => s + (it.pages || 0), 0);
        btn.disabled = items.length < 2;
        if (!items.length) setStatusBox(status, "info", "Agregue al menos dos archivos PDF.");
        else if (items.length < 2) setStatusBox(status, "warn", "Agregue otro PDF para unirlos.");
        else setStatusBox(status, "ok", `${items.length} archivos · ${pages} páginas en total. Ordénelos con las flechas.`);
        renderFileList(list, items, { onChange: refresh, icon: "fa-file-pdf" });
    };
    initMultiDropzone($("#tool-drop"), $("#tool-input"), async (files) => {
        for (const file of files) {
            try {
                const bytes = new Uint8Array(await file.arrayBuffer());
                const doc = await openPdfLib(bytes);
                items.push({ name: file.name, size: file.size, bytes, pages: doc.getPageCount(), meta: `${doc.getPageCount()} pág.` });
            } catch (err) { toast(pdfError(err, file.name), "error"); }
        }
        refresh();
    }, isPdf);
    btn.addEventListener("click", async () => {
        setBusy(btn, true, "Uniendo…");
        try {
            const out = await PDFLib.PDFDocument.create();
            for (const it of items) {
                const src = await openPdfLib(it.bytes);
                const pages = await out.copyPages(src, src.getPageIndices());
                pages.forEach(p => out.addPage(p));
            }
            const bytes = await out.save();
            triggerDownload(pdfBlob(bytes), `${sanitizeFilename(baseName(items[0].name)) || "documento"}_unido.pdf`);
            setStatusBox(status, "ok", `¡Listo! PDF unido de ${out.getPageCount()} páginas (${fmtBytes(bytes.length)}).`);
            afterDownload();
        } catch (err) {
            setStatusBox(status, "error", "No se pudieron unir los archivos. " + escapeHtml(err.message || ""));
        }
        setBusy(btn, false);
    });
    refresh();
}

/* =========================================
   2. DIVIDIR / EXTRAER PÁGINAS
   ========================================= */
function initSplitPdf() {
    let file = null, bytes = null, total = 0, pdfjsDoc = null;
    const selected = new Set();
    const btn = $("#btn-run"), status = $("#tool-status"), ranges = $("#split-ranges"), thumbs = $("#page-thumbs");
    const mode = () => radioValue("split-mode");
    const syncThumbs = () => $$(".page-thumb", thumbs).forEach((t, i) => t.setAttribute("aria-pressed", String(selected.has(i))));
    const refresh = () => {
        const m = mode();
        show("split-ranges-field", m === "extract");
        show("split-every-field", m === "every");
        btn.disabled = !bytes;
        if (!bytes) { setStatusBox(status, "info", "Suba un PDF para empezar."); return; }
        if (m === "extract") {
            const idx = parsePageRanges(ranges.value, total);
            btn.disabled = !idx.length;
            setStatusBox(status, idx.length ? "ok" : "warn", idx.length
                ? `Se creará un PDF con ${idx.length} de ${total} páginas.`
                : "Escriba las páginas o tóquelas en las miniaturas.");
        } else if (m === "all") {
            setStatusBox(status, "ok", `Se crearán ${total} archivos PDF (uno por página) en un ZIP.`);
        } else {
            const n = Math.max(1, parseInt($("#split-every").value, 10) || 1);
            setStatusBox(status, "ok", `Se crearán ${Math.ceil(total / n)} archivos PDF de hasta ${n} páginas.`);
        }
    };
    const reset = singlePdfLoader({
        onLoad: async (f, b) => {
            file = f; bytes = b;
            const doc = await openPdfLib(b);
            total = doc.getPageCount();
            $("#tool-chip-meta").textContent = `${fmtBytes(f.size)} · ${total} páginas`;
            selected.clear();
            ranges.value = "";
            show("split-options", true);
            refresh();
            try {
                pdfjsDoc = await openPdfjs(b);
                await renderThumbs(pdfjsDoc, thumbs, {
                    selectable: true, selected,
                    onToggle: (i, el) => {
                        if (mode() !== "extract") { $('input[name="split-mode"][value="extract"]').checked = true; }
                        selected.has(i) ? selected.delete(i) : selected.add(i);
                        el.setAttribute("aria-pressed", String(selected.has(i)));
                        ranges.value = formatPageRanges(selected);
                        refresh();
                    },
                });
            } catch (e) { show(thumbs, false); }
        },
        onReset: () => {
            file = bytes = null; total = 0; selected.clear();
            if (pdfjsDoc) { pdfjsDoc.destroy(); pdfjsDoc = null; }
            thumbs.innerHTML = ""; show(thumbs, false); show("split-options", false);
            refresh();
        },
    });
    ranges.addEventListener("input", () => {
        selected.clear();
        parsePageRanges(ranges.value, total).forEach(i => selected.add(i));
        syncThumbs();
        refresh();
    });
    $$('input[name="split-mode"]').forEach(r => r.addEventListener("change", refresh));
    $("#split-every").addEventListener("input", refresh);
    btn.addEventListener("click", async () => {
        setBusy(btn, true, "Procesando…");
        const name = sanitizeFilename(baseName(file.name)) || "documento";
        try {
            const src = await openPdfLib(bytes);
            const build = async (indices) => {
                const out = await PDFLib.PDFDocument.create();
                (await out.copyPages(src, indices)).forEach(p => out.addPage(p));
                return pdfBlob(await out.save());
            };
            const m = mode();
            if (m === "extract") {
                const idx = parsePageRanges(ranges.value, total);
                triggerDownload(await build(idx), `${name}_paginas_${formatPageRanges(idx).replace(/[ ,]+/g, "_")}.pdf`);
                afterDownload();
            } else {
                const n = m === "all" ? 1 : Math.max(1, parseInt($("#split-every").value, 10) || 1);
                const files = [];
                for (let start = 0; start < total; start += n) {
                    const idx = [];
                    for (let i = start; i < Math.min(total, start + n); i++) idx.push(i);
                    const label = idx.length === 1 ? `pag_${idx[0] + 1}` : `pag_${idx[0] + 1}-${idx[idx.length - 1] + 1}`;
                    files.push({ name: `${name}_${label}.pdf`, blob: await build(idx) });
                }
                await downloadMany(files, `${name}_dividido.zip`);
            }
            toast("¡Listo! Su descarga ya empezó.", "success");
        } catch (err) {
            setStatusBox(status, "error", "No se pudo dividir el PDF. " + escapeHtml(err.message || ""));
        }
        setBusy(btn, false);
    });
    refresh();
}

/* =========================================
   3. COMPRIMIR PDF (convierte cada página en imagen optimizada)
   ========================================= */
const COMPRESS_LEVELS = {
    low: { dpi: 150, q: 0.8, label: "Calidad alta" },
    mid: { dpi: 110, q: 0.62, label: "Recomendada" },
    high: { dpi: 80, q: 0.45, label: "Máxima compresión" },
};
function initCompressPdf() {
    let file = null, bytes = null, result = null;
    const btn = $("#btn-run"), status = $("#tool-status"), dl = $("#btn-download");
    const refresh = () => {
        btn.disabled = !bytes;
        show(dl, !!result);
        if (!bytes) setStatusBox(status, "info", "Suba un PDF para empezar.");
    };
    singlePdfLoader({
        onLoad: async (f, b) => {
            file = f; bytes = b; result = null;
            setStatusBox(status, "info", "Elija el nivel y pulse <strong>Comprimir</strong>.");
            refresh();
        },
        onReset: () => { file = bytes = result = null; setProgress("tool-progress", 0, 0); refresh(); },
    });
    $$('input[name="level"]').forEach(r => r.addEventListener("change", () => { result = null; refresh(); if (bytes) setStatusBox(status, "info", "Pulse <strong>Comprimir</strong> para aplicar el nuevo nivel."); }));
    btn.addEventListener("click", async () => {
        const lvl = COMPRESS_LEVELS[radioValue("level")] || COMPRESS_LEVELS.mid;
        setBusy(btn, true, "Comprimiendo…");
        result = null; refresh();
        try {
            const pdf = await openPdfjs(bytes);
            const out = await PDFLib.PDFDocument.create();
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            for (let i = 1; i <= pdf.numPages; i++) {
                setProgress("tool-progress", i - 1, pdf.numPages, `Página ${i} de ${pdf.numPages}`);
                const page = await pdf.getPage(i);
                const base = page.getViewport({ scale: 1 });
                // Limitar a ~4 megapíxeles por página (celulares con poca memoria)
                let scale = lvl.dpi / 72;
                const maxPx = 4e6;
                if (base.width * base.height * scale * scale > maxPx) scale = Math.sqrt(maxPx / (base.width * base.height));
                const vp = page.getViewport({ scale });
                canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
                ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
                await page.render({ canvasContext: ctx, viewport: vp }).promise;
                const jpg = await (await canvasToBlob(canvas, "image/jpeg", lvl.q)).arrayBuffer();
                const img = await out.embedJpg(jpg);
                const p = out.addPage([base.width, base.height]);
                p.drawImage(img, { x: 0, y: 0, width: base.width, height: base.height });
                page.cleanup();
            }
            setProgress("tool-progress", pdf.numPages, pdf.numPages, "Guardando…");
            const saved = await out.save();
            pdf.destroy();
            const before = file.size, after = saved.length;
            if (after >= before) {
                result = null;
                setStatusBox(status, "warn", `Su PDF ya está optimizado: comprimido pesaría ${fmtBytes(after)} (original ${fmtBytes(before)}). Pruebe con <strong>Máxima compresión</strong>.`);
            } else {
                result = { blob: pdfBlob(saved), name: `${sanitizeFilename(baseName(file.name)) || "documento"}_comprimido.pdf` };
                const pct = Math.round((1 - after / before) * 100);
                setStatusBox(status, "ok", `<strong>−${pct} %</strong> · de ${fmtBytes(before)} a ${fmtBytes(after)}.`);
                triggerDownload(result.blob, result.name);
                afterDownload();
            }
            setProgress("tool-progress", 0, 0);
        } catch (err) {
            setProgress("tool-progress", 0, 0);
            setStatusBox(status, "error", pdfError(err, file.name));
        }
        setBusy(btn, false);
        refresh();
    });
    dl.addEventListener("click", () => { if (result) triggerDownload(result.blob, result.name); });
    refresh();
}

/* =========================================
   4. IMAGEN (JPG/PNG) A PDF
   ========================================= */
const PAGE_SIZES = { a4: [595.28, 841.89], letter: [612, 792], legal: [612, 1008] };
function initImagesToPdf() {
    const items = [];
    const list = $("#file-list"), btn = $("#btn-run"), status = $("#tool-status");
    const refresh = () => {
        btn.disabled = !items.length;
        setStatusBox(status, items.length ? "ok" : "info", items.length
            ? `${items.length} imagen(es) · una por página. Ordénelas con las flechas.`
            : "Agregue fotos o imágenes JPG, PNG o WebP.");
        renderFileList(list, items, { onChange: refresh, icon: "fa-image" });
    };
    initMultiDropzone($("#tool-drop"), $("#tool-input"), (files) => {
        files.forEach(f => {
            if (isHeic(f)) { toast(`«${f.name}» es HEIC: conviértalo primero en /heic-a-jpg`, "error"); return; }
            items.push({ name: f.name, size: f.size, file: f, thumb: URL.createObjectURL(f) });
        });
        refresh();
    }, isImage);
    btn.addEventListener("click", async () => {
        setBusy(btn, true, "Creando PDF…");
        try {
            const size = $("#img-pagesize").value;
            const orient = $("#img-orient").value;
            const margin = parseFloat($("#img-margin").value) || 0;
            const out = await PDFLib.PDFDocument.create();
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            for (let i = 0; i < items.length; i++) {
                setProgress("tool-progress", i, items.length, `Imagen ${i + 1} de ${items.length}`);
                const bmp = await loadBitmap(items[i].file);
                // Reducir imágenes gigantes (> 3000 px) para un PDF liviano
                const k = Math.min(1, 3000 / Math.max(bmp.width, bmp.height));
                canvas.width = Math.round(bmp.width * k); canvas.height = Math.round(bmp.height * k);
                ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
                if (bmp.close) bmp.close();
                const img = await out.embedJpg(await (await canvasToBlob(canvas, "image/jpeg", 0.88)).arrayBuffer());
                let pw, ph;
                if (size === "fit") { pw = img.width * 0.75 + margin * 2; ph = img.height * 0.75 + margin * 2; }
                else {
                    [pw, ph] = PAGE_SIZES[size];
                    const landscape = orient === "landscape" || (orient === "auto" && img.width > img.height);
                    if (landscape) [pw, ph] = [ph, pw];
                }
                const page = out.addPage([pw, ph]);
                const s = Math.min((pw - margin * 2) / img.width, (ph - margin * 2) / img.height);
                const w = img.width * s, h = img.height * s;
                page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
            }
            const bytes = await out.save();
            setProgress("tool-progress", 0, 0);
            triggerDownload(pdfBlob(bytes), `${sanitizeFilename(baseName(items[0].name)) || "imagenes"}.pdf`);
            setStatusBox(status, "ok", `¡Listo! PDF de ${items.length} página(s) · ${fmtBytes(bytes.length)}.`);
            afterDownload();
        } catch (err) {
            setProgress("tool-progress", 0, 0);
            setStatusBox(status, "error", "No se pudo crear el PDF. Revise que las imágenes no estén dañadas.");
            console.error(err);
        }
        setBusy(btn, false);
    });
    refresh();
}

/* =========================================
   5. PDF A JPG / PNG
   ========================================= */
function initPdfToImages() {
    let file = null, bytes = null, total = 0;
    const btn = $("#btn-run"), status = $("#tool-status");
    const refresh = () => { btn.disabled = !bytes; if (!bytes) setStatusBox(status, "info", "Suba un PDF para empezar."); };
    singlePdfLoader({
        onLoad: async (f, b) => {
            file = f; bytes = b;
            const pdf = await openPdfjs(b);
            total = pdf.numPages;
            $("#tool-chip-meta").textContent = `${fmtBytes(f.size)} · ${total} páginas`;
            setStatusBox(status, "ok", total > 1 ? `Se descargarán ${total} imágenes en un ZIP.` : "Se descargará 1 imagen.");
            refresh();
            renderThumbs(pdf, $("#page-thumbs"));
        },
        onReset: () => { file = bytes = null; total = 0; $("#page-thumbs").innerHTML = ""; show("page-thumbs", false); refresh(); },
    });
    btn.addEventListener("click", async () => {
        setBusy(btn, true, "Convirtiendo…");
        const fmt = radioValue("img-format") === "png" ? "png" : "jpg";
        const dpi = parseInt($("#img-dpi").value, 10) || 150;
        const name = sanitizeFilename(baseName(file.name)) || "documento";
        try {
            const pdf = await openPdfjs(bytes);
            const files = [];
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");
            for (let i = 1; i <= pdf.numPages; i++) {
                setProgress("tool-progress", i - 1, pdf.numPages, `Página ${i} de ${pdf.numPages}`);
                const page = await pdf.getPage(i);
                const base = page.getViewport({ scale: 1 });
                let scale = dpi / 72;
                const maxPx = 16e6;
                if (base.width * base.height * scale * scale > maxPx) scale = Math.sqrt(maxPx / (base.width * base.height));
                const vp = page.getViewport({ scale });
                canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
                ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
                await page.render({ canvasContext: ctx, viewport: vp }).promise;
                const blob = await canvasToBlob(canvas, fmt === "png" ? "image/png" : "image/jpeg", 0.9);
                const pad = String(pdf.numPages).length;
                files.push({ name: `${name}_pagina_${String(i).padStart(pad, "0")}.${fmt}`, blob });
                page.cleanup();
            }
            pdf.destroy();
            setProgress("tool-progress", total, total, "Preparando descarga…");
            await downloadMany(files, `${name}_${fmt}.zip`);
            setProgress("tool-progress", 0, 0);
            setStatusBox(status, "ok", `¡Listo! ${files.length} imagen(es) ${fmt.toUpperCase()}.`);
        } catch (err) {
            setProgress("tool-progress", 0, 0);
            setStatusBox(status, "error", pdfError(err, file.name));
        }
        setBusy(btn, false);
    });
    refresh();
}

/* =========================================
   QR Free · Herramientas de imágenes (100 % en el navegador)
   Comprimir, redimensionar, convertir (JPG/PNG/WebP) y HEIC a JPG.
   Requiere: kit.js, JSZip; heic2any solo en /heic-a-jpg
   ========================================= */
const SOCIAL_PRESETS = [
    { label: "Instagram cuadrado", w: 1080, h: 1080 },
    { label: "Instagram vertical", w: 1080, h: 1350 },
    { label: "Historia / Reel / TikTok", w: 1080, h: 1920 },
    { label: "Facebook publicación", w: 1200, h: 630 },
    { label: "Portada de Facebook", w: 1640, h: 624 },
    { label: "Miniatura de YouTube", w: 1280, h: 720 },
    { label: "Foto de perfil", w: 500, h: 500 },
    { label: "Foto carné (3,5 × 4,5)", w: 413, h: 531 },
];
const MIME = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };

function imageExt(file) {
    if (/png$/i.test(file.type) || /\.png$/i.test(file.name)) return "png";
    if (/webp$/i.test(file.type) || /\.webp$/i.test(file.name)) return "webp";
    return "jpg";
}

function initImageTool(mode) {
    const items = [];
    const results = [];
    const list = $("#file-list"), btn = $("#btn-run"), status = $("#tool-status"), out = $("#img-results"), zipBtn = $("#btn-zip");
    const form = $("#img-options");
    const quality = $("#img-quality"), qOut = $("#img-quality-out");
    const resizeMode = () => radioValue("resize-mode") || "none";

    // Presets de redes sociales
    const presetBox = $("#img-presets");
    if (presetBox) {
        SOCIAL_PRESETS.forEach(p => {
            const b = document.createElement("button");
            b.type = "button"; b.className = "chip";
            b.setAttribute("aria-checked", "false");
            b.setAttribute("role", "radio");
            b.innerHTML = `<span></span> <small>${p.w}×${p.h}</small>`;
            $("span", b).textContent = p.label;
            b.addEventListener("click", () => {
                $$(".chip", presetBox).forEach(c => c.setAttribute("aria-checked", String(c === b)));
                $('input[name="resize-mode"][value="size"]').checked = true;
                $("#img-w").value = p.w; $("#img-h").value = p.h;
                $("#img-keep").checked = false;
                $("#img-fit").value = "cover";
                syncOptions();
            });
            presetBox.appendChild(b);
        });
    }

    const syncOptions = () => {
        const rm = resizeMode();
        show("resize-percent", rm === "percent");
        show("resize-size", rm === "size");
        const fmt = $("#img-format").value;
        const lossy = fmt !== "png";
        show("quality-field", lossy);
        if (qOut) qOut.textContent = `${quality.value} %`;
        const keep = $("#img-keep");
        show("fit-field", rm === "size" && !!keep && !keep.checked);
        if (results.length) { results.length = 0; out.innerHTML = ""; show(zipBtn, false); setStatusBox(status, "info", "Cambió las opciones: pulse el botón para procesar de nuevo."); }
    };
    if (form) { form.addEventListener("input", syncOptions); form.addEventListener("change", syncOptions); }

    const refresh = () => {
        btn.disabled = !items.length;
        if (!items.length) setStatusBox(status, "info", mode === "heic" ? "Agregue sus fotos HEIC del iPhone." : "Agregue una o varias imágenes.");
        else setStatusBox(status, "ok", `${items.length} imagen(es) lista(s).`);
        renderFileList(list, items, { sortable: false, onChange: () => { results.length = 0; out.innerHTML = ""; show(zipBtn, false); refresh(); }, icon: "fa-image" });
    };

    const accept = mode === "heic" ? (f) => isHeic(f) || isImage(f) : isImage;
    initMultiDropzone($("#tool-drop"), $("#tool-input"), (files) => {
        files.forEach(f => {
            if (isHeic(f) && mode !== "heic") { toast(`«${f.name}» es HEIC: use el convertidor de HEIC a JPG.`, "error"); return; }
            items.push({ name: f.name, size: f.size, file: f, thumb: isHeic(f) ? null : URL.createObjectURL(f) });
        });
        results.length = 0; out.innerHTML = ""; show(zipBtn, false);
        refresh();
    }, accept);

    async function decode(file) {
        if (isHeic(file)) {
            if (!window.heic2any) throw new Error("No se pudo cargar el convertidor HEIC. Recargue la página.");
            let blob = await heic2any({ blob: file, toType: "image/png" });
            if (Array.isArray(blob)) blob = blob[0];
            return loadBitmap(blob);
        }
        return loadBitmap(file);
    }

    function targetSize(w, h) {
        const rm = resizeMode();
        if (rm === "percent") {
            const k = Math.max(1, Math.min(400, parseFloat($("#img-percent").value) || 100)) / 100;
            return { cw: Math.round(w * k), ch: Math.round(h * k), draw: [0, 0, w, h, 0, 0, Math.round(w * k), Math.round(h * k)] };
        }
        if (rm === "size") {
            let tw = parseInt($("#img-w").value, 10) || 0;
            let th = parseInt($("#img-h").value, 10) || 0;
            const keep = $("#img-keep").checked;
            if (keep || !tw || !th) {
                if (tw && th) { const k = Math.min(tw / w, th / h); tw = Math.round(w * k); th = Math.round(h * k); }
                else if (tw) th = Math.round(h * tw / w);
                else if (th) tw = Math.round(w * th / h);
                else { tw = w; th = h; }
                return { cw: tw, ch: th, draw: [0, 0, w, h, 0, 0, tw, th] };
            }
            const fit = $("#img-fit").value;
            if (fit === "cover") { // recortar al centro para llenar
                const k = Math.max(tw / w, th / h);
                const sw = tw / k, sh = th / k;
                return { cw: tw, ch: th, draw: [(w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, tw, th] };
            }
            if (fit === "contain") { // completa con fondo
                const k = Math.min(tw / w, th / h);
                const dw = Math.round(w * k), dh = Math.round(h * k);
                return { cw: tw, ch: th, pad: true, draw: [0, 0, w, h, Math.round((tw - dw) / 2), Math.round((th - dh) / 2), dw, dh] };
            }
            return { cw: tw, ch: th, draw: [0, 0, w, h, 0, 0, tw, th] }; // estirar
        }
        // Sin cambiar medidas, pero con un tope opcional de ancho
        const max = parseInt(($("#img-maxw") || {}).value, 10) || 0;
        if (max && w > max) { const th = Math.round(h * max / w); return { cw: max, ch: th, draw: [0, 0, w, h, 0, 0, max, th] }; }
        return { cw: w, ch: h, draw: [0, 0, w, h, 0, 0, w, h] };
    }

    btn.addEventListener("click", async () => {
        setBusy(btn, true, "Procesando…");
        results.length = 0; out.innerHTML = ""; show(zipBtn, false);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        let saved = 0, before = 0, fails = 0;
        for (let i = 0; i < items.length; i++) {
            const it = items[i];
            setProgress("tool-progress", i, items.length, `Imagen ${i + 1} de ${items.length}`);
            try {
                const bmp = await decode(it.file);
                const srcExt = isHeic(it.file) ? "jpg" : imageExt(it.file);
                const fmtSel = $("#img-format").value;
                const ext = fmtSel === "same" ? srcExt : fmtSel;
                const q = (parseInt(quality.value, 10) || 80) / 100;
                const { cw, ch, draw, pad } = targetSize(bmp.width, bmp.height);
                canvas.width = cw; canvas.height = ch;
                ctx.clearRect(0, 0, cw, ch);
                if (ext === "jpg" || pad) { ctx.fillStyle = ($("#img-bg") || {}).value || "#ffffff"; ctx.fillRect(0, 0, cw, ch); }
                ctx.imageSmoothingQuality = "high";
                ctx.drawImage(bmp, ...draw);
                if (bmp.close) bmp.close();
                let blob = await canvasToBlob(canvas, MIME[ext], q);
                let note = "";
                // Al solo comprimir, si no mejora se conserva el original
                if (mode === "compress" && resizeMode() === "none" && ext === srcExt && blob.size >= it.file.size) {
                    blob = it.file; note = "ya estaba optimizada";
                }
                const name = `${sanitizeFilename(baseName(it.name)) || "imagen"}${mode === "compress" ? "_comprimida" : mode === "resize" ? `_${cw}x${ch}` : ""}.${ext}`;
                results.push({ name, blob });
                before += it.file.size; saved += blob.size;
                addResult(it, { name, blob, w: cw, h: ch, note });
            } catch (err) {
                fails++;
                console.error(err);
                addResult(it, { error: err.message || "No se pudo procesar" });
            }
        }
        setProgress("tool-progress", 0, 0);
        setBusy(btn, false);
        if (results.length) {
            const pct = before ? Math.round((1 - saved / before) * 100) : 0;
            setStatusBox(status, fails ? "warn" : "ok",
                `${results.length} lista(s)${fails ? `, ${fails} con error` : ""}. Total: ${fmtBytes(before)} → ${fmtBytes(saved)}${pct > 0 ? ` <strong>(−${pct} %)</strong>` : ""}.`);
            show(zipBtn, results.length > 1);
            if (results.length === 1) { triggerDownload(results[0].blob, results[0].name); afterDownload(); }
        } else {
            setStatusBox(status, "error", "No se pudo procesar ninguna imagen.");
        }
    });
    zipBtn.addEventListener("click", () => downloadMany(results, mode === "heic" ? "fotos_jpg.zip" : "imagenes_qrfree.zip"));

    function addResult(it, r) {
        const li = document.createElement("li");
        li.className = "file-row";
        if (r.error) {
            li.innerHTML = `<span class="file-icon is-bad"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i></span><div class="file-info"><strong></strong><span class="report-error"></span></div>`;
            $("strong", li).textContent = it.name;
            $(".file-info span", li).textContent = r.error;
        } else {
            const url = URL.createObjectURL(r.blob);
            const diff = it.file.size ? Math.round((1 - r.blob.size / it.file.size) * 100) : 0;
            li.innerHTML = `<img src="${url}" alt="" width="44" height="44">
                <div class="file-info"><strong></strong><span></span></div>
                <div class="file-actions"><a class="btn btn-secondary btn-sm" href="${url}"><i class="fa-solid fa-download" aria-hidden="true"></i> Bajar</a></div>`;
            $("strong", li).textContent = r.name;
            $(".file-info span", li).textContent = `${r.w}×${r.h} px · ${fmtBytes(it.file.size)} → ${fmtBytes(r.blob.size)}${diff > 0 ? ` (−${diff} %)` : ""}${r.note ? " · " + r.note : ""}`;
            $("a", li).setAttribute("download", r.name);
        }
        out.appendChild(li);
        show(out, true);
    }

    syncOptions();
    refresh();
}

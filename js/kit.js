/* =========================================
   QR Free · Kit compartido de herramientas
   (PDF, imágenes, calculadoras, utilidades)
   Requiere /main.js (usa $, $$, toast, show, triggerDownload, afterDownload)
   ========================================= */

/* ---- Números y dinero ---- */
const MONEY_FMT = new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function fmtMoney(n, symbol = "S/") { return `${symbol} ${MONEY_FMT.format(round2(n))}`; }
function round2(n) { return Math.round((Number(n) + Number.EPSILON) * 100) / 100; }
function parseNum(v) {
    if (typeof v === "number") return v;
    const s = String(v || "").trim().replace(/\s/g, "").replace(/,(?=\d{3}(\D|$))/g, "").replace(",", ".");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : 0;
}
function fmtBytes(b) {
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(0)} KB`;
    return `${(b / 1048576).toFixed(b < 10485760 ? 2 : 1)} MB`;
}
function baseName(name) { return String(name || "archivo").replace(/\.[^.]+$/, ""); }

/* ---- Número a letras (para cotizaciones y facturas) ---- */
function numberToWordsEs(num) {
    const U = ["", "UNO", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE", "DIEZ", "ONCE", "DOCE", "TRECE",
        "CATORCE", "QUINCE", "DIECISÉIS", "DIECISIETE", "DIECIOCHO", "DIECINUEVE", "VEINTE", "VEINTIUNO", "VEINTIDÓS",
        "VEINTITRÉS", "VEINTICUATRO", "VEINTICINCO", "VEINTISÉIS", "VEINTISIETE", "VEINTIOCHO", "VEINTINUEVE"];
    const D = ["", "", "", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const C = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHOCIENTOS", "NOVECIENTOS"];
    const upTo999 = (n) => {
        if (n === 0) return "";
        if (n === 100) return "CIEN";
        const c = Math.floor(n / 100), r = n % 100;
        let s = C[c];
        if (r) {
            const t = r < 30 ? U[r] : D[Math.floor(r / 10)] + (r % 10 ? " Y " + U[r % 10] : "");
            s = (s ? s + " " : "") + t;
        }
        return s;
    };
    const words = (n) => {
        if (n === 0) return "CERO";
        const mill = Math.floor(n / 1e6), thou = Math.floor((n % 1e6) / 1000), rest = n % 1000;
        const out = [];
        if (mill) out.push(mill === 1 ? "UN MILLÓN" : words(mill).replace(/UNO$/, "UN") + " MILLONES");
        if (thou) out.push(thou === 1 ? "MIL" : upTo999(thou).replace(/UNO$/, "UN").replace(/VEINTIUNO$/, "VEINTIÚN") + " MIL");
        if (rest) out.push(upTo999(rest));
        return out.join(" ");
    };
    const n = round2(Math.abs(num));
    const ent = Math.floor(n);
    const cents = Math.round((n - ent) * 100);
    return `${words(ent)} CON ${String(cents).padStart(2, "0")}/100`;
}

/* ---- Fechas ---- */
function parseDate(v) { // "2026-05-01" -> Date local sin desfase de zona horaria
    if (!v) return null;
    const [y, m, d] = v.split("-").map(Number);
    return y ? new Date(y, m - 1, d) : null;
}
function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function addMonths(d, n) {
    const r = new Date(d.getFullYear(), d.getMonth() + n, 1);
    r.setDate(Math.min(d.getDate(), new Date(r.getFullYear(), r.getMonth() + 1, 0).getDate()));
    return r;
}
function daysBetween(a, b) { return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000); }
const DATE_FMT = new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "long", year: "numeric" });
function fmtDate(d) { return DATE_FMT.format(d); }
/** Meses completos y días restantes entre a y b, ambos inclusive (cómputo laboral de 30 días). */
function monthsAndDays(a, b) {
    if (!a || !b || b < a) return { months: 0, days: 0 };
    const end = addDays(b, 1);
    let months = 0;
    while (addMonths(a, months + 1) <= end) months++;
    const days = Math.min(29, daysBetween(addMonths(a, months), end));
    return { months, days };
}

/* ---- Archivos ---- */
/** Zona para varios archivos. accept: función (file) => boolean */
function initMultiDropzone(zone, input, onFiles, accept = () => true) {
    if (!zone || !input) return;
    const handle = (list) => {
        const files = Array.from(list || []);
        const ok = files.filter(accept);
        if (files.length && !ok.length) toast("Ese tipo de archivo no es compatible con esta herramienta.", "error");
        else if (ok.length < files.length) toast(`Se omitieron ${files.length - ok.length} archivo(s) no compatibles.`, "info");
        if (ok.length) onFiles(ok);
    };
    zone.addEventListener("click", () => input.click());
    zone.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); } });
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("dragover"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", (e) => { e.preventDefault(); zone.classList.remove("dragover"); handle(e.dataTransfer.files); });
    input.addEventListener("change", () => { handle(input.files); input.value = ""; });
}
const isPdf = (f) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);
const isHeic = (f) => /image\/hei[cf]/.test(f.type) || /\.(heic|heif)$/i.test(f.name);
const isImage = (f) => /^image\//.test(f.type) || /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i.test(f.name);

/**
 * Lista de archivos con orden y eliminación.
 * items: [{ name, size, thumb?, meta? }]
 */
function renderFileList(listEl, items, { sortable = true, onChange, icon = "fa-file" } = {}) {
    listEl.innerHTML = "";
    items.forEach((it, i) => {
        const li = document.createElement("li");
        li.className = "file-row";
        const thumb = it.thumb
            ? `<img src="${it.thumb}" alt="" width="44" height="44" loading="lazy">`
            : `<span class="file-icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span>`;
        li.innerHTML = `${thumb}
            <div class="file-info"><strong></strong><span></span></div>
            <div class="file-actions">
                ${sortable ? `<button type="button" class="icon-btn" data-act="up" aria-label="Subir"${i === 0 ? " disabled" : ""}><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button>
                <button type="button" class="icon-btn" data-act="down" aria-label="Bajar"${i === items.length - 1 ? " disabled" : ""}><i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button>` : ""}
                <button type="button" class="icon-btn icon-btn-danger" data-act="del" aria-label="Quitar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
            </div>`;
        $("strong", li).textContent = it.name;
        $(".file-info span", li).textContent = [fmtBytes(it.size), it.meta].filter(Boolean).join(" · ");
        $$("button", li).forEach(b => b.addEventListener("click", () => {
            const act = b.dataset.act;
            if (act === "del") { const [gone] = items.splice(i, 1); if (gone.thumb && gone.thumb.startsWith("blob:")) URL.revokeObjectURL(gone.thumb); }
            if (act === "up") [items[i - 1], items[i]] = [items[i], items[i - 1]];
            if (act === "down") [items[i + 1], items[i]] = [items[i], items[i + 1]];
            renderFileList(listEl, items, { sortable, onChange, icon });
            if (onChange) onChange();
            const again = $$(`.file-row`, listEl)[act === "up" ? i - 1 : act === "down" ? i + 1 : Math.min(i, items.length - 1)];
            if (again) { const btn = $(`[data-act="${act}"]`, again) || $("button", again); if (btn && !btn.disabled) btn.focus(); }
        }));
        listEl.appendChild(li);
    });
    show(listEl, items.length > 0);
}

/** Descarga un archivo o, si son varios, un ZIP (requiere JSZip). */
async function downloadMany(files, zipName) {
    if (!files.length) return;
    if (files.length === 1) { triggerDownload(files[0].blob, files[0].name); afterDownload(); return; }
    const zip = new JSZip();
    const used = new Set();
    files.forEach(f => {
        let name = f.name, n = 2;
        while (used.has(name)) name = f.name.replace(/(\.[^.]+)?$/, `_${n++}$1`);
        used.add(name);
        zip.file(name, f.blob);
    });
    const blob = await zip.generateAsync({ type: "blob" });
    triggerDownload(blob, zipName);
    afterDownload();
}

function canvasToBlob(canvas, type = "image/jpeg", quality = 0.9) {
    return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("No se pudo generar la imagen")), type, quality));
}

/** Carga una imagen respetando la orientación EXIF de las fotos del celular. */
async function loadBitmap(blob) {
    if (window.createImageBitmap) {
        try { return await createImageBitmap(blob, { imageOrientation: "from-image" }); } catch (e) { /* se intenta con <img> */ }
    }
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => { resolve(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Imagen no válida")); };
        img.src = url;
    });
}

/* ---- Interfaz ---- */
function setBusy(btn, busy, label) {
    if (!btn) return;
    if (busy) {
        btn.dataset.label = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> ${label || "Procesando…"}`;
    } else {
        btn.disabled = false;
        if (btn.dataset.label) btn.innerHTML = btn.dataset.label;
    }
}
function setStatusBox(el, type, html) {
    if (typeof el === "string") el = document.getElementById(el);
    if (!el) return;
    const icon = { ok: "fa-circle-check", warn: "fa-triangle-exclamation", error: "fa-circle-exclamation", info: "fa-circle-info" }[type] || "fa-circle-info";
    el.className = `status${type === "info" ? "" : " is-" + type}`;
    el.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span>${html}</span>`;
    show(el, true);
}
function setProgress(root, done, total, label) {
    if (typeof root === "string") root = document.getElementById(root);
    if (!root) return;
    show(root, total > 0);
    const pct = total ? Math.round((done / total) * 100) : 0;
    $(".progress-fill", root).style.width = pct + "%";
    $(".progress-track", root).setAttribute("aria-valuenow", pct);
    $(".progress-text", root).textContent = label || `${done} de ${total}`;
}
async function copyText(text, okMsg = "Copiado al portapapeles") {
    try {
        await navigator.clipboard.writeText(text);
    } catch (e) {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch (err) { toast("No se pudo copiar. Selecciónelo y copie manualmente.", "error"); ta.remove(); return; }
        ta.remove();
    }
    toast(okMsg, "success");
}
/** Valores de un formulario como objeto (checkbox => boolean). */
function formValues(form) {
    const out = {};
    $$("input, select, textarea", form).forEach(el => {
        if (!el.name) return;
        if (el.type === "checkbox") out[el.name] = el.checked;
        else if (el.type === "radio") { if (el.checked) out[el.name] = el.value; }
        else out[el.name] = el.value;
    });
    return out;
}
function plural(n, one, many) { return `${n} ${n === 1 ? one : many}`; }
function bigTotal(label, value, sub) {
    return `<div class="result-total"><span>${label}</span><strong>${value}</strong>${sub ? `<small>${sub}</small>` : ""}</div>`;
}
/** Tabla de resultados: rows = [[etiqueta, valor, clase?]] */
function resultRows(rows) {
    return rows.map(([k, v, cls]) => `<div class="result-row${cls ? " " + cls : ""}"><span>${k}</span><strong>${v}</strong></div>`).join("");
}
/** Ejecuta fn al cambiar cualquier campo del formulario (y una vez al inicio). */
function liveForm(form, fn) {
    if (!form) return;
    form.addEventListener("submit", (e) => { e.preventDefault(); fn(); });
    form.addEventListener("input", fn);
    form.addEventListener("change", fn);
    fn();
}

/* ---- Preferencias locales (opcionales: el sitio funciona sin ellas) ---- */
function localGet(key, fallback = null) { try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } }
function localSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); return true; } catch (e) { return false; } }

/* ---- Azar criptográfico (sorteos y contraseñas) ---- */
function randInt(max) { // 0 <= n < max, sin sesgo
    if (max <= 0) return 0;
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] >= limit);
    return buf[0] % max;
}
function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
}

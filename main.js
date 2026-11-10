/* =========================================
   QR Free · Lógica compartida
   Generador QR (/, /qr-*), Masivo (/bulk), Código de barras (/barcode)
   ========================================= */

const DEFAULT_QR_DATA = "https://qrfre.com";
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/* =========================================
   0. UTILIDADES
   ========================================= */
function escapeWifi(str) {
    return String(str || "").replace(/([\\;,:"])/g, "\\$1");
}

function escapeVCard(str) {
    return String(str || "")
        .replace(/\\/g, "\\\\")
        .replace(/\r?\n/g, "\\n")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,");
}

function cleanPhone(str) {
    const s = String(str || "").trim();
    const digits = s.replace(/[^\d]/g, "");
    return s.startsWith("+") && digits ? "+" + digits : digits;
}

function normalizeUrl(str) {
    const s = String(str || "").trim();
    if (!s) return "";
    return /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : "https://" + s;
}

function sanitizeFilename(str) {
    return String(str || "")
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .trim()
        .replace(/[^a-z0-9\-_]+/gi, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 120);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function show(el, visible) {
    if (typeof el === "string") el = document.getElementById(el);
    // toggleAttribute funciona también en SVG (que no tiene la propiedad .hidden)
    if (el) el.toggleAttribute("hidden", !visible);
}

function radioValue(name) {
    const el = $(`input[name="${name}"]:checked`);
    return el ? el.value : null;
}

function svgToBlob(svgEl) {
    const xml = new XMLSerializer().serializeToString(svgEl);
    return new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
}

function triggerDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(file);
    });
}

/* ---- Contraste (WCAG) ---- */
function hexToRgb(hex) {
    const h = hex.replace("#", "");
    const n = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance(hex) {
    const [r, g, b] = hexToRgb(hex).map(v => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(a, b) {
    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (l1 + 0.05) / (l2 + 0.05);
}

/* ---- Avisos (toasts) ---- */
function toast(message, type = "info") {
    let box = $(".toasts");
    if (!box) {
        box = document.createElement("div");
        box.className = "toasts";
        box.setAttribute("role", "status");
        box.setAttribute("aria-live", "polite");
        document.body.appendChild(box);
    }
    const icon = { success: "fa-circle-check", error: "fa-circle-exclamation", info: "fa-circle-info" }[type];
    const el = document.createElement("div");
    el.className = `toast is-${type}`;
    el.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span></span>`;
    el.querySelector("span").textContent = message;
    box.appendChild(el);
    setTimeout(() => el.remove(), 3500);
}

/* =========================================
   1. COMPONENTES GLOBALES
   ========================================= */
const ICON_MENU = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICON_CLOSE = '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

function initNav() {
    const btn = $(".nav-toggle");
    const nav = $("#site-nav");
    if (!btn || !nav) return;
    const set = (open) => {
        nav.classList.toggle("is-open", open);
        btn.setAttribute("aria-expanded", String(open));
        btn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
        btn.innerHTML = open ? ICON_CLOSE : ICON_MENU;
    };
    btn.addEventListener("click", (e) => {
        e.stopPropagation(); // el ícono se reemplaza: evitar que el clic cuente como "fuera"
        set(!nav.classList.contains("is-open"));
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("is-open")) { set(false); btn.focus(); } });
    document.addEventListener("click", (e) => { if (!e.target.closest(".site-header")) set(false); });
}

// Pestañas accesibles: [role=tablist] > [role=tab][aria-controls]
function initTabs(root = document) {
    $$('[role="tablist"]', root).forEach(list => {
        const tabs = $$('[role="tab"]', list);
        const select = (tab, focus) => {
            tabs.forEach(t => {
                const on = t === tab;
                t.setAttribute("aria-selected", String(on));
                t.tabIndex = on ? 0 : -1;
                show(t.getAttribute("aria-controls"), on);
            });
            if (focus) tab.focus();
        };
        tabs.forEach((tab, i) => {
            tab.addEventListener("click", () => select(tab));
            tab.addEventListener("keydown", (e) => {
                const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
                if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
            });
        });
    });
}

// Zonas de archivo: clic, teclado y arrastrar/soltar
function initDropzone(zone, input, onFile) {
    if (!zone || !input) return;
    zone.addEventListener("click", () => input.click());
    zone.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
    });
    zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("dragover"); });
    zone.addEventListener("dragleave", () => zone.classList.remove("dragover"));
    zone.addEventListener("drop", (e) => {
        e.preventDefault();
        zone.classList.remove("dragover");
        if (e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
    });
    input.addEventListener("change", () => { if (input.files[0]) onFile(input.files[0]); });
}

// Muestra el valor HEX junto a cada selector de color
function bindColorOutputs(root = document) {
    $$(".color-input input[type=color]", root).forEach(inp => {
        const out = inp.parentElement.querySelector("output");
        const sync = () => { if (out) out.textContent = inp.value.toUpperCase(); };
        inp.addEventListener("input", sync);
        sync();
    });
}

/* =========================================
   2. PANEL DE DISEÑO (compartido: individual y masivo)
   ========================================= */
const PRESETS = [
    { name: "Clásico", dots: "square", corners: "square", color: "#0f172a", cornerColor: "#0f172a", bg: "#ffffff" },
    { name: "Redondo", dots: "rounded", corners: "extra-rounded", color: "#1d4ed8", cornerColor: "#1e3a8a", bg: "#ffffff" },
    { name: "Puntos", dots: "dots", corners: "dot", color: "#0f172a", cornerColor: "#2563eb", bg: "#ffffff" },
    { name: "Elegante", dots: "classy-rounded", corners: "extra-rounded", color: "#6d28d9", cornerColor: "#4c1d95", bg: "#ffffff" },
    { name: "Natural", dots: "extra-rounded", corners: "extra-rounded", color: "#15803d", cornerColor: "#14532d", bg: "#f0fdf4" },
    { name: "Cálido", dots: "rounded", corners: "dot", color: "#c2410c", cornerColor: "#7c2d12", bg: "#fff7ed" }
];

function coloredIconDataUrl(name, color) {
    if (!window.IconDB || !window.IconDB[name]) return "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="${color}"><path d="${window.IconDB[name]}"/></svg>`;
    return "data:image/svg+xml;base64," + btoa(svg);
}

class DesignPanel {
    constructor(prefix, onChange) {
        this.p = prefix;
        this.onChange = onChange || (() => {});
        this.logo = null;      // Data URL del logo subido
        this.icon = null;      // Nombre de ícono de IconDB
        this.renderPresets();
        this.renderIcons();
        ["dots", "corners", "color", "corner-color", "bg", "logo-size"].forEach(id => {
            const el = this.el(id);
            if (el) el.addEventListener(el.tagName === "SELECT" ? "change" : "input", () => {
                if (id !== "logo-size") this.markPreset(null);
                this.onChange();
            });
        });
        initDropzone(this.el("logo-drop"), this.el("logo-input"), (f) => this.setLogoFile(f));
        const rm = this.el("logo-remove");
        if (rm) rm.addEventListener("click", () => this.clearLogo(true));
        this.markPreset(0);
    }

    el(id) { return document.getElementById(`${this.p}-${id}`); }
    val(id) { const e = this.el(id); return e ? e.value : ""; }

    renderPresets() {
        const box = this.el("presets");
        if (!box) return;
        PRESETS.forEach((pr, i) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "preset";
            b.setAttribute("aria-pressed", "false");
            const cells = Array.from({ length: 9 }, (_, k) =>
                `<i style="color:${[0, 2, 6].includes(k) ? pr.cornerColor : pr.color};border-radius:${pr.dots === "square" ? "1px" : "50%"};opacity:${[4, 5, 7].includes(k) ? 1 : [1, 3, 8].includes(k) ? .55 : 1}"></i>`).join("");
            b.innerHTML = `<span class="preset-swatch" style="background:${pr.bg}">${cells}</span>${pr.name}`;
            b.addEventListener("click", () => this.applyPreset(i));
            box.appendChild(b);
        });
    }

    applyPreset(i) {
        const pr = PRESETS[i];
        this.el("dots").value = pr.dots;
        this.el("corners").value = pr.corners;
        this.el("color").value = pr.color;
        this.el("corner-color").value = pr.cornerColor;
        this.el("bg").value = pr.bg;
        ["color", "corner-color", "bg"].forEach(id => this.el(id).dispatchEvent(new Event("input")));
        this.markPreset(i);
        this.onChange();
    }

    markPreset(i) {
        const box = this.el("presets");
        if (box) $$(".preset", box).forEach((b, k) => b.setAttribute("aria-pressed", String(k === i)));
    }

    renderIcons() {
        const box = this.el("icons");
        if (!box || !window.IconDB) return;
        const make = (name, title, inner) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "icon-preset";
            b.title = title;
            b.setAttribute("aria-label", title);
            b.setAttribute("aria-pressed", String(name === null));
            b.innerHTML = inner;
            b.addEventListener("click", () => this.selectIcon(name, b));
            box.appendChild(b);
        };
        make(null, "Sin ícono", '<i class="fa-solid fa-ban" aria-hidden="true"></i>');
        Object.entries(window.IconDB).forEach(([name, path]) => {
            make(name, name.charAt(0).toUpperCase() + name.slice(1), `<svg viewBox="0 0 512 512" aria-hidden="true"><path d="${path}"/></svg>`);
        });
    }

    selectIcon(name, btn) {
        $$(".icon-preset", this.el("icons")).forEach(b => b.setAttribute("aria-pressed", String(b === btn)));
        this.icon = name;
        if (name) this.clearLogo(false);
        this.onChange();
    }

    async setLogoFile(file) {
        if (!file.type.startsWith("image/")) { toast("El logo debe ser una imagen (PNG, JPG o SVG).", "error"); return; }
        if (file.size > 5 * 1024 * 1024) { toast("La imagen pesa más de 5 MB. Use una más liviana.", "error"); return; }
        this.logo = await readFileAsDataURL(file);
        this.icon = null;
        const icons = this.el("icons");
        if (icons) $$(".icon-preset", icons).forEach((b, k) => b.setAttribute("aria-pressed", String(k === 0)));
        this.el("logo-img").src = this.logo;
        this.el("logo-name").textContent = file.name;
        show(this.el("logo-drop"), false);
        show(this.el("logo-chip"), true);
        this.onChange();
    }

    clearLogo(notify) {
        this.logo = null;
        const inp = this.el("logo-input");
        if (inp) inp.value = "";
        show(this.el("logo-drop"), true);
        show(this.el("logo-chip"), false);
        if (notify) this.onChange();
    }

    image() {
        if (this.logo) return this.logo;
        if (this.icon) return coloredIconDataUrl(this.icon, this.val("color"));
        return "";
    }

    // Opciones para qr-code-styling
    options(scale = 1) {
        const corners = this.val("corners");
        const image = this.image();
        return {
            qrOptions: { errorCorrectionLevel: image ? "H" : "Q" },
            dotsOptions: { color: this.val("color"), type: this.val("dots") },
            cornersSquareOptions: { type: corners, color: this.val("corner-color") },
            cornersDotOptions: { type: corners === "square" ? "square" : "dot", color: this.val("corner-color") },
            backgroundOptions: { color: this.val("bg") },
            image,
            imageOptions: {
                crossOrigin: "anonymous", hideBackgroundDots: true,
                imageSize: parseFloat(this.val("logo-size")) || 0.35,
                margin: Math.round(4 * scale)
            }
        };
    }

    // Advertencias de legibilidad
    warnings() {
        const w = [];
        const bg = this.val("bg");
        const dots = this.val("color"), corner = this.val("corner-color");
        if (luminance(dots) > luminance(bg) || luminance(corner) > luminance(bg)) {
            w.push("Colores invertidos (claro sobre oscuro): varios lectores no lo detectan. Use puntos oscuros sobre fondo claro.");
        } else if (Math.min(contrastRatio(dots, bg), contrastRatio(corner, bg)) < 3) {
            w.push("Poco contraste entre los puntos y el fondo: puede costar escanearlo. Oscurezca los puntos o aclare el fondo.");
        }
        if (this.image() && parseFloat(this.val("logo-size")) > 0.4) {
            w.push("Logo grande: pruebe el QR con su celular antes de imprimir.");
        }
        return w;
    }
}

/* =========================================
   3. GENERADOR INDIVIDUAL
   ========================================= */
let qrCode;
let currentType = "url";
let singlePanel;
const PREVIEW_SIZE = 280;
const quietZone = (size) => Math.round(size * 0.06);

const formTemplates = {
    url: `<div class="field"><label for="inp-url">Enlace (URL)</label><input type="url" id="inp-url" placeholder="miempresa.com" inputmode="url" autocomplete="url" oninput="updateSingleQR()"><p class="hint">Puede escribirlo sin «https://», lo agregamos por usted.</p></div>`,
    whatsapp: `<div class="field"><label for="inp-wa-phone">Número de WhatsApp</label><input type="tel" id="inp-wa-phone" placeholder="51 999 888 777" inputmode="tel" oninput="updateSingleQR()"><p class="hint">Con código de país. Perú: 51 + su celular.</p></div><div class="field"><label for="inp-wa-msg">Mensaje inicial <span class="hint">(opcional)</span></label><input type="text" id="inp-wa-msg" placeholder="Hola, quiero información..." oninput="updateSingleQR()"></div>`,
    wifi: `<div class="field"><label for="inp-ssid">Nombre de la red (SSID)</label><input type="text" id="inp-ssid" autocomplete="off" oninput="updateSingleQR()"><p class="hint">Escríbalo exactamente igual, con mayúsculas y espacios.</p></div><div class="grid-2"><div class="field"><label for="inp-pass">Contraseña</label><input type="text" id="inp-pass" autocomplete="off" oninput="updateSingleQR()"></div><div class="field"><label for="inp-enc">Seguridad</label><select id="inp-enc" onchange="updateSingleQR()"><option value="WPA">WPA/WPA2/WPA3</option><option value="WEP">WEP</option><option value="nopass">Sin contraseña</option></select></div></div>`,
    vcard: `<div class="grid-2"><div class="field"><label for="inp-first">Nombre</label><input type="text" id="inp-first" autocomplete="given-name" oninput="updateSingleQR()"></div><div class="field"><label for="inp-last">Apellido</label><input type="text" id="inp-last" autocomplete="family-name" oninput="updateSingleQR()"></div></div><div class="grid-2"><div class="field"><label for="inp-tel">Celular</label><input type="tel" id="inp-tel" autocomplete="tel" oninput="updateSingleQR()"></div><div class="field"><label for="inp-email">Email</label><input type="email" id="inp-email" autocomplete="email" oninput="updateSingleQR()"></div></div><div class="field"><label for="inp-org">Empresa <span class="hint">(opcional)</span></label><input type="text" id="inp-org" autocomplete="organization" oninput="updateSingleQR()"></div>`,
    email: `<div class="field"><label for="inp-mail-to">Correo de destino</label><input type="email" id="inp-mail-to" placeholder="correo@ejemplo.com" oninput="updateSingleQR()"></div><div class="field"><label for="inp-mail-sub">Asunto <span class="hint">(opcional)</span></label><input type="text" id="inp-mail-sub" oninput="updateSingleQR()"></div><div class="field"><label for="inp-mail-body">Mensaje <span class="hint">(opcional)</span></label><textarea id="inp-mail-body" rows="2" oninput="updateSingleQR()"></textarea></div>`,
    phone: `<div class="field"><label for="inp-phone">Número de teléfono</label><input type="tel" id="inp-phone" placeholder="+51 900 000 000" inputmode="tel" oninput="updateSingleQR()"></div>`,
    sms: `<div class="field"><label for="inp-sms-phone">Número de destino</label><input type="tel" id="inp-sms-phone" placeholder="+51..." inputmode="tel" oninput="updateSingleQR()"></div><div class="field"><label for="inp-sms-msg">Mensaje</label><textarea id="inp-sms-msg" rows="2" oninput="updateSingleQR()"></textarea></div>`,
    text: `<div class="field"><label for="inp-text">Texto</label><textarea id="inp-text" rows="3" oninput="updateSingleQR()"></textarea><p class="hint">Mientras más texto, más denso el QR. Recomendado: menos de 300 caracteres.</p></div>`,
    geo: `<div class="grid-2"><div class="field"><label for="inp-geo-lat">Latitud</label><input type="text" id="inp-geo-lat" inputmode="decimal" placeholder="-12.0464" oninput="updateSingleQR()"></div><div class="field"><label for="inp-geo-lon">Longitud</label><input type="text" id="inp-geo-lon" inputmode="decimal" placeholder="-77.0428" oninput="updateSingleQR()"></div></div><p class="hint">En Google Maps: mantenga presionado un punto y copie las coordenadas.</p>`
};

function buildSingleData() {
    const val = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : "";
    };
    switch (currentType) {
        case "url": return normalizeUrl(val("inp-url"));
        case "text": return val("inp-text");
        case "whatsapp": {
            const phone = cleanPhone(val("inp-wa-phone")).replace("+", "");
            if (!phone) return "";
            const msg = val("inp-wa-msg");
            return `https://wa.me/${phone}` + (msg ? `?text=${encodeURIComponent(msg)}` : "");
        }
        case "wifi": {
            const ssid = val("inp-ssid");
            if (!ssid) return "";
            const enc = val("inp-enc") || "WPA";
            const pass = enc === "nopass" ? "" : `P:${escapeWifi(val("inp-pass"))};`;
            return `WIFI:T:${enc};S:${escapeWifi(ssid)};${pass};`;
        }
        case "email": {
            const to = val("inp-mail-to");
            if (!to) return "";
            const params = [];
            if (val("inp-mail-sub")) params.push("subject=" + encodeURIComponent(val("inp-mail-sub")));
            if (val("inp-mail-body")) params.push("body=" + encodeURIComponent(val("inp-mail-body")));
            return `mailto:${to}` + (params.length ? "?" + params.join("&") : "");
        }
        case "phone": {
            const phone = cleanPhone(val("inp-phone"));
            return phone ? `tel:${phone}` : "";
        }
        case "sms": {
            const phone = cleanPhone(val("inp-sms-phone"));
            return phone ? `SMSTO:${phone}:${val("inp-sms-msg")}` : "";
        }
        case "geo": {
            const lat = parseFloat(val("inp-geo-lat").replace(",", "."));
            const lon = parseFloat(val("inp-geo-lon").replace(",", "."));
            if (isNaN(lat) || isNaN(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return "";
            return `geo:${lat},${lon}`;
        }
        case "vcard": {
            const first = val("inp-first"), last = val("inp-last");
            if (!first && !last && !val("inp-tel") && !val("inp-email")) return "";
            const lines = ["BEGIN:VCARD", "VERSION:3.0",
                `N:${escapeVCard(last)};${escapeVCard(first)};;;`,
                `FN:${escapeVCard([first, last].filter(Boolean).join(" "))}`];
            if (val("inp-org")) lines.push(`ORG:${escapeVCard(val("inp-org"))}`);
            if (val("inp-tel")) lines.push(`TEL;TYPE=CELL:${cleanPhone(val("inp-tel"))}`);
            if (val("inp-email")) lines.push(`EMAIL:${escapeVCard(val("inp-email"))}`);
            lines.push("END:VCARD");
            return lines.join("\n");
        }
    }
    return "";
}

// Validaciones suaves con mensaje para el usuario
function singleIssue() {
    const v = (id) => { const e = document.getElementById(id); return e ? e.value.trim() : ""; };
    if (currentType === "email" && v("inp-mail-to") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("inp-mail-to"))) return "El correo no parece válido.";
    if (currentType === "url" && v("inp-url") && !/\.|localhost|:/.test(v("inp-url"))) return "El enlace no parece válido (falta el dominio, por ejemplo .com).";
    if (currentType === "whatsapp" && v("inp-wa-phone") && cleanPhone(v("inp-wa-phone")).replace("+", "").length < 10) return "Agregue el código de país al número (Perú: 51).";
    if (currentType === "geo" && (v("inp-geo-lat") || v("inp-geo-lon")) && !buildSingleData()) return "Coordenadas no válidas.";
    return null;
}

function setStatus(el, type, text) {
    if (!el) return;
    const icon = { ok: "fa-circle-check", warn: "fa-triangle-exclamation", error: "fa-circle-exclamation", info: "fa-circle-info" }[type];
    el.className = "status" + (type === "info" ? "" : ` is-${type}`);
    el.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i><span></span>`;
    el.querySelector("span").textContent = text;
}

function initSingleQR(defaultType) {
    singlePanel = new DesignPanel("qr", updateSingleQR);
    qrCode = new QRCodeStyling({
        width: PREVIEW_SIZE, height: PREVIEW_SIZE, type: "canvas", data: DEFAULT_QR_DATA,
        margin: quietZone(PREVIEW_SIZE), ...singlePanel.options()
    });
    qrCode.append($("#canvas"));

    $$(".chip[data-type]").forEach(chip => chip.addEventListener("click", () => setType(chip.dataset.type, true)));
    $$('input[name="qr-format"], input[name="qr-size"]').forEach(r => r.addEventListener("change", updateDownloadUi));
    $("#btn-download").addEventListener("click", downloadQR);
    const barBtn = $("#btn-download-bar");
    if (barBtn) barBtn.addEventListener("click", downloadQR);
    initMobileBar();
    updateDownloadUi();
    setType(formTemplates[defaultType] ? defaultType : "url", false);
}

function setType(type, focus) {
    currentType = formTemplates[type] ? type : "url";
    $$(".chip[data-type]").forEach(c => c.setAttribute("aria-checked", String(c.dataset.type === currentType)));
    $("#dynamic-inputs").innerHTML = formTemplates[currentType];
    if (focus) {
        const first = $("#dynamic-inputs input, #dynamic-inputs textarea");
        if (first) first.focus({ preventScroll: true });
    }
    updateSingleQR();
}

function updateSingleQR() {
    if (!qrCode) return;
    const data = buildSingleData();
    qrCode.update({ data: data || DEFAULT_QR_DATA, ...singlePanel.options() });

    const stage = $("#qr-stage");
    const issue = singleIssue();
    const ready = Boolean(data) && !issue;
    stage.dataset.state = data ? "ready" : "empty";
    $("#btn-download").disabled = !ready;
    const barBtn = $("#btn-download-bar");
    if (barBtn) barBtn.disabled = !ready;

    const status = $("#qr-status");
    const warnings = singlePanel.warnings();
    if (!data) setStatus(status, "info", "Escriba el contenido en el paso 1 para crear su QR.");
    else if (issue) setStatus(status, "error", issue);
    else if (warnings.length) setStatus(status, "warn", warnings[0]);
    else setStatus(status, "ok", "Listo para descargar. Pruébelo con la cámara de su celular.");
}

function updateDownloadUi() {
    const fmt = radioValue("qr-format");
    show("size-field", fmt !== "svg");
    const label = $("#btn-download span");
    if (label) label.textContent = `Descargar ${fmt === "jpeg" ? "JPG" : fmt.toUpperCase()}`;
}

async function downloadQR() {
    const data = buildSingleData();
    if (!data || singleIssue()) {
        toast(singleIssue() || "Primero escriba el contenido del QR.", "error");
        return;
    }
    const fmt = radioValue("qr-format");
    const size = fmt === "svg" ? 1024 : parseInt(radioValue("qr-size"), 10);
    const scale = size / PREVIEW_SIZE;
    const hi = new QRCodeStyling({
        width: size, height: size, type: fmt === "svg" ? "svg" : "canvas", data,
        margin: quietZone(size), ...singlePanel.options(scale)
    });
    await hi.download({ name: "qr-free", extension: fmt });
    toast("Descarga iniciada.", "success");
    afterDownload();
}

// Barra inferior en móvil: aparece cuando la vista previa no está en pantalla
function initMobileBar() {
    const bar = $("#mobile-bar");
    const card = $("#qr-preview-card");
    if (!bar || !card || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([entry]) => {
        const visible = !entry.isIntersecting;
        bar.classList.toggle("is-visible", visible);
        bar.setAttribute("aria-hidden", String(!visible));
        $$("a, button", bar).forEach(el => el.tabIndex = visible ? 0 : -1);
    }, { threshold: 0.15 });
    io.observe(card);
}

/* =========================================
   4. MASIVO
   ========================================= */
let workbookData = [];
let bulkPreviewQR;
let bulkPanel;
let isProcessing = false;
let bulkFileName = "";

function bulkMode() { return radioValue("bulk-mode") || "qr"; }

function initBulkPage() {
    bulkPanel = new DesignPanel("bulk", updateBulkPreview);
    bulkPreviewQR = new QRCodeStyling({
        width: 200, height: 200, type: "canvas", data: DEFAULT_QR_DATA,
        margin: quietZone(200), ...bulkPanel.options()
    });
    bulkPreviewQR.append($("#bulk-canvas-preview"));

    initDropzone($("#drop-zone"), $("#excel-input"), handleFile);
    $("#btn-change-file").addEventListener("click", resetBulkFile);
    $("#btn-template").addEventListener("click", downloadExcelTemplate);
    $("#btn-process").addEventListener("click", processBulkData);
    $$('input[name="bulk-mode"]').forEach(r => r.addEventListener("change", onBulkModeChange));
    ["col-data", "col-name"].forEach(id => $("#" + id).addEventListener("change", () => { renderDataPreview(); updateBulkPreview(); }));
    ["bulk-bar-format", "bulk-bar-color"].forEach(id => $("#" + id).addEventListener("input", updateBulkPreview));
    $$('input[name="bulk-bar-text"]').forEach(r => r.addEventListener("change", updateBulkPreview));
    onBulkModeChange();
}

function onBulkModeChange() {
    const m = bulkMode();
    show("mode-qr", m === "qr");
    show("mode-barcode", m === "barcode");
    show("bulk-canvas-preview", m === "qr");
    show("bulk-bar-preview", m === "barcode");
    updateBulkPreview();
}

function columnLetter(i) {
    let s = "";
    for (i = i + 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
    return s;
}

function handleFile(file) {
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) { toast("Use un archivo .xlsx, .xls o .csv.", "error"); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const wb = XLSX.read(new Uint8Array(e.target.result), { type: "array" });
            workbookData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: "" });
        } catch (err) {
            workbookData = [];
        }
        if (workbookData.length > 1) {
            bulkFileName = file.name;
            setupBulkUI();
            toast(`${workbookData.length - 1} filas cargadas.`, "success");
        } else {
            toast("El archivo está vacío o no tiene filas de datos.", "error");
        }
    };
    reader.readAsArrayBuffer(file);
}

function setupBulkUI() {
    show("drop-zone", false);
    show("bulk-controls", true);
    $("#bulk-help").open = false;

    const colCount = workbookData.reduce((m, r) => Math.max(m, (r || []).length), 0);
    const headers = workbookData[0] || [];
    const selData = $("#col-data"), selName = $("#col-name");
    selData.innerHTML = "";
    selName.innerHTML = "";
    selName.add(new Option("Numerar automáticamente", ""));
    for (let i = 0; i < colCount; i++) {
        const h = String(headers[i] ?? "").trim();
        const label = `${columnLetter(i)} · ${h || "(sin encabezado)"}`;
        selData.add(new Option(label, i));
        selName.add(new Option(label, i));
    }
    if (colCount > 1) selName.value = "1";

    $("#file-name").textContent = bulkFileName;
    $("#record-count").textContent = `${workbookData.length - 1} filas de datos · ${colCount} columna(s)`;
    const btn = $("#btn-process");
    btn.disabled = false;
    btn.querySelector("span").textContent = `Generar ${workbookData.length - 1} códigos`;
    show("bulk-report", false);
    renderDataPreview();
    updateBulkPreview();
}

function resetBulkFile() {
    if (isProcessing) return;
    workbookData = [];
    $("#excel-input").value = "";
    show("bulk-controls", false);
    show("drop-zone", true);
    show("bulk-report", false);
    const btn = $("#btn-process");
    btn.disabled = true;
    btn.querySelector("span").textContent = "Primero suba un archivo";
    updateBulkPreview();
}

function bulkRowName(row, i, nameCol) {
    const raw = nameCol === null ? "" : String(row[nameCol] ?? "");
    return sanitizeFilename(raw) || `codigo_${String(i).padStart(4, "0")}`;
}

function bulkColumns() {
    const nameRaw = $("#col-name").value;
    return { dataCol: parseInt($("#col-data").value, 10), nameCol: nameRaw === "" ? null : parseInt(nameRaw, 10) };
}

function renderDataPreview() {
    if (workbookData.length < 2) return;
    const { dataCol, nameCol } = bulkColumns();
    const rows = workbookData.slice(1, 6).map((row, k) => {
        const content = String((row || [])[dataCol] ?? "").trim();
        return `<tr><td>${k + 2}</td><td class="${content ? "" : "is-bad"}">${content ? escapeHtml(content) : "(vacía, se omitirá)"}</td><td>${escapeHtml(bulkRowName(row || [], k + 1, nameCol))}</td></tr>`;
    }).join("");
    $("#data-preview-body").innerHTML = rows;
}

function firstBulkValue() {
    if (workbookData.length < 2) return "";
    const { dataCol } = bulkColumns();
    for (let i = 1; i < workbookData.length; i++) {
        const v = String((workbookData[i] || [])[dataCol] ?? "").trim();
        if (v) return v;
    }
    return "";
}

function barOptions(scale = 2) {
    return {
        format: $("#bulk-bar-format").value,
        lineColor: $("#bulk-bar-color").value,
        displayValue: radioValue("bulk-bar-text") === "true",
        width: scale, height: 50 * scale, fontSize: 10 * scale, margin: 5 * scale, background: "#ffffff"
    };
}

function updateBulkPreview() {
    if (!bulkPanel) return;
    const sample = firstBulkValue();
    const caption = $("#bulk-preview-caption");
    if (bulkMode() === "qr") {
        bulkPreviewQR.update({ data: sample || DEFAULT_QR_DATA, ...bulkPanel.options(200 / PREVIEW_SIZE) });
        caption.textContent = sample ? `Fila 2: ${sample}` : "Vista previa con un ejemplo";
    } else {
        const fmt = $("#bulk-bar-format").value;
        const exampleByFormat = { EAN13: "7751234567892", UPC: "036000291452", ITF14: "17751234567899", CODE39: "ABC-123", CODE128: "CODE-128" };
        const value = sample || exampleByFormat[fmt];
        const svg = $("#bulk-bar-preview");
        try {
            JsBarcode(svg, value, barOptions(2));
            caption.textContent = sample ? `Fila 2: ${sample}` : "Vista previa con un ejemplo";
        } catch (e) {
            svg.innerHTML = "";
            caption.textContent = `«${value}» no es válido para ${fmt}`;
        }
        validateBarRows();
    }
}

// Cuenta cuántas filas son válidas para el formato de código de barras elegido
const validateBarRows = debounce(() => {
    const box = $("#bar-validity");
    if (workbookData.length < 2 || bulkMode() !== "barcode") { show(box, false); return; }
    const { dataCol } = bulkColumns();
    const fmt = $("#bulk-bar-format").value;
    const probe = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    let ok = 0, total = 0;
    for (let i = 1; i < workbookData.length; i++) {
        const v = String((workbookData[i] || [])[dataCol] ?? "").trim();
        if (!v) continue;
        total++;
        try { JsBarcode(probe, v, { format: fmt, displayValue: false }); ok++; } catch (e) { /* inválido */ }
    }
    show(box, true);
    if (ok === total) setStatus(box, "ok", `Las ${total} filas son válidas para ${fmt}.`);
    else setStatus(box, ok ? "warn" : "error", `${ok} de ${total} filas son válidas para ${fmt}. Las demás se listarán en ERRORES.txt.`);
}, 250);

function uniqueName(base, used) {
    let name = base, n = 2;
    while (used.has(name.toLowerCase())) name = `${base}_${n++}`;
    used.add(name.toLowerCase());
    return name;
}

async function processBulkData() {
    if (isProcessing) return;
    if (workbookData.length < 2) { toast("Primero suba un archivo con datos.", "error"); return; }

    isProcessing = true;
    const btn = $("#btn-process");
    const btnLabel = btn.querySelector("span");
    const prevLabel = btnLabel.textContent;
    btn.disabled = true;
    btnLabel.textContent = "Generando...";

    const mode = bulkMode();
    const { dataCol, nameCol } = bulkColumns();
    const exportFormat = radioValue("bulk-format");
    const exportSize = parseInt($("#bulk-export-size").value, 10);
    const ext = exportFormat === "jpeg" ? "jpg" : exportFormat;

    const pFill = $("#progress-fill"), pText = $("#progress-text");
    show("progress-container", true);
    show("bulk-report", false);
    pFill.style.width = "0%";

    const zip = new JSZip();
    const folder = zip.folder(mode === "qr" ? `qr_${ext}` : `codigos_barras_${ext}`);
    const used = new Set();
    const errors = [];
    let ok = 0, empty = 0;

    const tempQR = mode === "qr" ? new QRCodeStyling({
        width: exportSize, height: exportSize, type: exportFormat === "svg" ? "svg" : "canvas",
        margin: quietZone(exportSize), ...bulkPanel.options(exportSize / PREVIEW_SIZE)
    }) : null;
    const scale = exportSize >= 2000 ? 4 : exportSize >= 1000 ? 3 : 2;
    const bOpts = barOptions(scale);

    const total = workbookData.length - 1;
    try {
        for (let i = 1; i < workbookData.length; i++) {
            const row = workbookData[i] || [];
            const content = String(row[dataCol] ?? "").trim();
            if (!content) {
                empty++;
            } else {
                let blob = null;
                try {
                    if (mode === "qr") {
                        tempQR.update({ data: content });
                        blob = await tempQR.getRawData(exportFormat);
                    } else if (exportFormat === "svg") {
                        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                        JsBarcode(svg, content, bOpts);
                        blob = svgToBlob(svg);
                    } else {
                        const canvas = document.createElement("canvas");
                        JsBarcode(canvas, content, bOpts);
                        blob = await new Promise(r => canvas.toBlob(r, exportFormat === "jpeg" ? "image/jpeg" : "image/png", 0.95));
                    }
                } catch (err) { blob = null; }

                if (blob) {
                    folder.file(`${uniqueName(bulkRowName(row, i, nameCol), used)}.${ext}`, blob);
                    ok++;
                } else {
                    errors.push({ row: i + 1, content });
                }
            }
            pFill.style.width = `${Math.round((i / total) * 100)}%`;
            pText.textContent = `Procesando ${i} de ${total}`;
            if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
        }

        if (errors.length) {
            zip.file("ERRORES.txt", "Filas que no se pudieron generar (revise que el valor sea válido para el formato elegido):\r\n\r\n" +
                errors.map(e => `Fila ${e.row}: ${e.content}`).join("\r\n"));
        }
        if (ok === 0) {
            pText.textContent = "No se generó ningún código.";
            toast("Ninguna fila tiene un valor válido.", "error");
        } else {
            pText.textContent = "Empaquetando ZIP...";
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `${mode === "qr" ? "QR" : "Codigos_barras"}_${sanitizeFilename(bulkFileName.replace(/\.[^.]+$/, "")) || "lote"}.zip`);
            pText.textContent = "¡Completado!";
            toast(`ZIP con ${ok} archivo(s) descargado.`, "success");
            afterDownload();
        }
        showBulkReport(ok, empty, errors);
    } finally {
        isProcessing = false;
        btn.disabled = false;
        btnLabel.textContent = prevLabel;
        setTimeout(() => show("progress-container", false), 2500);
    }
}

function showBulkReport(ok, empty, errors) {
    const box = $("#bulk-report");
    let html = `<strong><i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${ok} archivo(s) generado(s).</strong>`;
    if (empty) html += `<br>${empty} fila(s) vacía(s) omitida(s).`;
    if (errors.length) {
        const list = errors.slice(0, 10).map(e => `<li>Fila ${e.row}: <code>${escapeHtml(e.content)}</code></li>`).join("");
        html += `<br><span class="report-error">${errors.length} fila(s) con valor inválido para el formato elegido (detalle en ERRORES.txt dentro del ZIP):</span><ul>${list}</ul>` +
            (errors.length > 10 ? `<p>... y ${errors.length - 10} más.</p>` : "");
    }
    box.innerHTML = html;
    box.classList.toggle("has-errors", errors.length > 0);
    show(box, true);
}

function downloadExcelTemplate() {
    const data = [
        ["CONTENIDO", "NOMBRE_ARCHIVO"],
        ["https://www.miempresa.com", "web_principal"],
        ["WIFI:T:WPA;S:MiRed;P:1234;;", "wifi_invitados"],
        ["7751234567892", "producto_ean13"],
        ["CODE-128-TEST", "etiqueta_logistica"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 40 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Datos");
    XLSX.writeFile(wb, "Ejemplo_QR_Free.xlsx");
}

/* =========================================
   5. CÓDIGO DE BARRAS INDIVIDUAL
   ========================================= */
let barcodeValid = false;
const BARCODE_HINTS = {
    CODE128: "Acepta letras, números y símbolos. Ideal para uso interno.",
    EAN13: "12 o 13 dígitos. Si escribe 12, el dígito de control se calcula solo.",
    UPC: "11 o 12 dígitos.",
    CODE39: "Letras MAYÚSCULAS, números y - . $ / + % espacio.",
    ITF14: "13 o 14 dígitos."
};
const BARCODE_EXAMPLES = { CODE128: "CODE-128-TEST", EAN13: "775123456789", UPC: "03600029145", CODE39: "ABC-123", ITF14: "1775123456789" };

function initBarcodePage() {
    const fmt = $("#barcode-format");
    fmt.addEventListener("change", () => {
        const input = $("#barcode-value");
        const v = input.value.trim();
        // Si el valor es vacío o un ejemplo de otro formato, poner el ejemplo del nuevo formato
        if (!v || Object.values(BARCODE_EXAMPLES).includes(v)) input.value = BARCODE_EXAMPLES[fmt.value];
        generateBarcode();
    });
    $("#barcode-value").addEventListener("input", generateBarcode);
    $("#bar-color").addEventListener("input", generateBarcode);
    $("#bar-height").addEventListener("input", generateBarcode);
    $$('input[name="show-text"]').forEach(r => r.addEventListener("change", generateBarcode));
    $("#btn-download-barcode").addEventListener("click", downloadBarcode);
    generateBarcode();
}

function readBarcodeOptions() {
    return {
        format: $("#barcode-format").value,
        lineColor: $("#bar-color").value,
        displayValue: radioValue("show-text") !== "false",
        width: 2, height: parseInt($("#bar-height").value, 10) || 100, margin: 10, background: "#ffffff"
    };
}

function generateBarcode() {
    const input = $("#barcode-value");
    const value = input.value.trim();
    const errorBox = $("#barcode-error");
    const svg = $("#barcode");
    const fmt = $("#barcode-format").value;
    $("#barcode-format-hint").textContent = BARCODE_HINTS[fmt];

    barcodeValid = false;
    if (value) {
        try { JsBarcode(svg, value, readBarcodeOptions()); barcodeValid = true; } catch (err) { barcodeValid = false; }
    }
    $("#barcode-stage").dataset.state = barcodeValid ? "ready" : "empty";
    show(svg, barcodeValid);
    $("#btn-download-barcode").disabled = !barcodeValid;
    input.setAttribute("aria-invalid", String(!barcodeValid && Boolean(value)));
    if (barcodeValid) {
        show(errorBox, false);
    } else {
        errorBox.querySelector("span").textContent = value
            ? `No es válido para ${fmt}. ${BARCODE_HINTS[fmt]}`
            : "Escriba un código para generarlo.";
        show(errorBox, true);
    }
}

async function downloadBarcode() {
    if (!barcodeValid) return;
    const value = $("#barcode-value").value.trim();
    const base = sanitizeFilename(value) || "codigo_barras";
    if (radioValue("bc-format") === "svg") {
        triggerDownload(svgToBlob($("#barcode")), `${base}.svg`);
    } else {
        const canvas = document.createElement("canvas");
        const o = readBarcodeOptions();
        JsBarcode(canvas, value, { ...o, width: 4, height: o.height * 2, fontSize: 40, margin: 20 });
        const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
        triggerDownload(blob, `${base}.png`);
    }
    toast("Descarga iniciada.", "success");
    afterDownload();
}

/* =========================================
   6. APOYO / DONACIONES (Yape)
   ========================================= */
const SUPPORT = { yapeQr: "/img/yape-qr.png", delayMs: 1500 };

function storageGet(key) { try { return sessionStorage.getItem(key); } catch (e) { return null; } }
function storageSet(key, val) { try { sessionStorage.setItem(key, val); } catch (e) { /* modo privado */ } }

function afterDownload() {
    if (storageGet("qrfree-support-shown")) return;
    storageSet("qrfree-support-shown", "1");
    setTimeout(showSupport, SUPPORT.delayMs);
}

function showSupport() {
    if ($("#support-modal")) return;
    const lastFocus = document.activeElement;
    const modal = document.createElement("div");
    modal.id = "support-modal";
    modal.className = "modal-backdrop";
    modal.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true" aria-labelledby="support-title">
            <button type="button" class="modal-close" aria-label="Cerrar">&times;</button>
            <h2 id="support-title">¡Listo! Su descarga ya empezó 🎉</h2>
            <p>QR Free es gratis y sin registro. Si le ahorramos tiempo, puede apoyarnos con un <strong>Yape desde S/ 1</strong>.</p>
            <img src="${SUPPORT.yapeQr}" alt="Código QR de Yape para apoyar a QR Free" class="modal-yape" width="170" height="240">
            <div class="modal-actions">
                <a class="btn btn-support" href="/apoyar">Cómo apoyar</a>
                <button type="button" class="btn btn-secondary" data-close>Ahora no</button>
            </div>
        </div>`;
    const close = () => {
        modal.remove();
        document.removeEventListener("keydown", onKey);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    };
    const onKey = (e) => {
        if (e.key === "Escape") close();
        if (e.key === "Tab") { // mantener el foco dentro del diálogo
            const f = $$("a, button", modal);
            if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
            else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
        }
    };
    modal.addEventListener("click", (e) => {
        if (e.target === modal || e.target.closest(".modal-close") || e.target.closest("[data-close]")) close();
    });
    document.addEventListener("keydown", onKey);
    document.body.appendChild(modal);
    $(".modal-close", modal).focus();
}

document.addEventListener("click", (e) => {
    if (e.target.closest("a[data-support]")) afterDownload();
});

/* =========================================
   7. INICIO COMÚN
   ========================================= */
initNav();
initTabs();
bindColorOutputs();

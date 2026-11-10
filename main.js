/* =========================================
   QR FREE - Lógica compartida
   index.html (individual), bulk.html (masivo), barcode.html (barras)
   ========================================= */

const DEFAULT_QR_DATA = "https://qrfre.com";

/* =========================================
   0. UTILIDADES
   ========================================= */

// Escapa caracteres especiales del formato WIFI: (\ ; , : ")
function escapeWifi(str) {
    return String(str || "").replace(/([\\;,:"])/g, "\\$1");
}

// Escapa valores de texto en vCard 3.0 (RFC 2426)
function escapeVCard(str) {
    return String(str || "")
        .replace(/\\/g, "\\\\")
        .replace(/\r?\n/g, "\\n")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,");
}

// Deja solo dígitos y un "+" inicial
function cleanPhone(str) {
    const s = String(str || "").trim();
    const digits = s.replace(/[^\d]/g, "");
    return s.startsWith("+") && digits ? "+" + digits : digits;
}

// Añade https:// si el usuario escribió "miweb.com"
function normalizeUrl(str) {
    const s = String(str || "").trim();
    if (!s) return "";
    return /^[a-z][a-z0-9+.-]*:/i.test(s) ? s : "https://" + s;
}

// Nombre de archivo seguro: quita tildes (á→a, ñ→n) y caracteres no válidos
function sanitizeFilename(str) {
    return String(str || "")
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .trim()
        .replace(/[^a-z0-9\-_]+/gi, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 120);
}

function show(el, visible) {
    if (typeof el === "string") el = document.getElementById(el);
    if (el) el.hidden = !visible;
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

/* =========================================
   1. LÓGICA INDIVIDUAL (index.html)
   ========================================= */
let qrCode;
let currentType = "url";
let uploadedLogo = null;   // Data URL del logo subido
let selectedIcon = null;   // Nombre del ícono de IconDB

const formTemplates = {
    url: `<div class="form-group"><label for="inp-url">URL</label><input type="url" id="inp-url" placeholder="https://miempresa.com" oninput="updateSingleQR()"></div>`,
    whatsapp: `<div class="form-group"><label for="inp-wa-phone">Número (con código de país)</label><input type="tel" id="inp-wa-phone" placeholder="Ej: 51999888777" oninput="updateSingleQR()"></div><div class="form-group"><label for="inp-wa-msg">Mensaje (opcional)</label><input type="text" id="inp-wa-msg" placeholder="Hola, quiero información..." oninput="updateSingleQR()"></div>`,
    wifi: `<div class="form-group"><label for="inp-ssid">Nombre de la red (SSID)</label><input type="text" id="inp-ssid" oninput="updateSingleQR()"></div><div class="form-group"><label for="inp-pass">Contraseña</label><input type="text" id="inp-pass" oninput="updateSingleQR()"></div><div class="form-group"><label for="inp-enc">Seguridad</label><select id="inp-enc" onchange="updateSingleQR()"><option value="WPA">WPA/WPA2/WPA3</option><option value="WEP">WEP</option><option value="nopass">Abierta (sin clave)</option></select></div>`,
    vcard: `<div class="grid-2"><div class="form-group"><label for="inp-first">Nombre</label><input type="text" id="inp-first" oninput="updateSingleQR()"></div><div class="form-group"><label for="inp-last">Apellido</label><input type="text" id="inp-last" oninput="updateSingleQR()"></div></div><div class="form-group"><label for="inp-tel">Teléfono</label><input type="tel" id="inp-tel" oninput="updateSingleQR()"></div><div class="form-group"><label for="inp-email">Email</label><input type="email" id="inp-email" oninput="updateSingleQR()"></div><div class="form-group"><label for="inp-org">Empresa</label><input type="text" id="inp-org" oninput="updateSingleQR()"></div>`,
    email: `<div class="form-group"><label for="inp-mail-to">Email destino</label><input type="email" id="inp-mail-to" placeholder="correo@ejemplo.com" oninput="updateSingleQR()"></div><div class="form-group"><label for="inp-mail-sub">Asunto</label><input type="text" id="inp-mail-sub" oninput="updateSingleQR()"></div><div class="form-group"><label for="inp-mail-body">Mensaje (opcional)</label><textarea id="inp-mail-body" rows="2" oninput="updateSingleQR()"></textarea></div>`,
    phone: `<div class="form-group"><label for="inp-phone">Número de teléfono</label><input type="tel" id="inp-phone" placeholder="+51 900 000 000" oninput="updateSingleQR()"></div>`,
    sms: `<div class="form-group"><label for="inp-sms-phone">Número destino</label><input type="tel" id="inp-sms-phone" placeholder="+51..." oninput="updateSingleQR()"></div><div class="form-group"><label for="inp-sms-msg">Mensaje</label><textarea id="inp-sms-msg" rows="2" oninput="updateSingleQR()"></textarea></div>`,
    text: `<div class="form-group"><label for="inp-text">Texto</label><textarea id="inp-text" rows="3" oninput="updateSingleQR()"></textarea></div>`,
    geo: `<div class="grid-2"><div class="form-group"><label for="inp-geo-lat">Latitud</label><input type="text" id="inp-geo-lat" inputmode="decimal" placeholder="-12.0464" oninput="updateSingleQR()"></div><div class="form-group"><label for="inp-geo-lon">Longitud</label><input type="text" id="inp-geo-lon" inputmode="decimal" placeholder="-77.0428" oninput="updateSingleQR()"></div></div>`
};

function initSingleQR() {
    qrCode = new QRCodeStyling({
        width: 300, height: 300, type: "canvas", data: DEFAULT_QR_DATA,
        dotsOptions: { color: "#0f172a", type: "square" },
        cornersSquareOptions: { type: "square", color: "#0f172a" },
        cornersDotOptions: { type: "square", color: "#0f172a" },
        backgroundOptions: { color: "#ffffff" },
        imageOptions: { crossOrigin: "anonymous", margin: 10 }
    });

    document.getElementById("dynamic-inputs").innerHTML = formTemplates.url;
    qrCode.append(document.getElementById("canvas"));
    renderIconPresets();
}

function setType(type, btn) {
    currentType = formTemplates[type] ? type : "url";
    document.querySelectorAll(".type-btn").forEach(el => {
        el.classList.remove("active");
        el.setAttribute("aria-pressed", "false");
    });
    if (btn) {
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
    }
    document.getElementById("dynamic-inputs").innerHTML = formTemplates[currentType];
    updateSingleQR();
}

// Devuelve el contenido del QR o "" si el usuario aún no escribió nada
function buildSingleData() {
    const val = (id) => {
        const el = document.getElementById(id);
        return el ? el.value.trim() : "";
    };

    switch (currentType) {
        case "url":
            return normalizeUrl(val("inp-url"));
        case "text":
            return val("inp-text");
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
            if (isNaN(lat) || isNaN(lon)) return "";
            return `geo:${lat},${lon}`;
        }
        case "vcard": {
            const first = val("inp-first"), last = val("inp-last");
            if (!first && !last && !val("inp-tel") && !val("inp-email")) return "";
            const lines = [
                "BEGIN:VCARD",
                "VERSION:3.0",
                `N:${escapeVCard(last)};${escapeVCard(first)};;;`,
                `FN:${escapeVCard([first, last].filter(Boolean).join(" "))}`
            ];
            if (val("inp-org")) lines.push(`ORG:${escapeVCard(val("inp-org"))}`);
            if (val("inp-tel")) lines.push(`TEL;TYPE=CELL:${cleanPhone(val("inp-tel"))}`);
            if (val("inp-email")) lines.push(`EMAIL:${escapeVCard(val("inp-email"))}`);
            lines.push("END:VCARD");
            return lines.join("\n");
        }
    }
    return "";
}

function updateSingleQR() {
    if (!qrCode) return;
    qrCode.update({ data: buildSingleData() || DEFAULT_QR_DATA });
}

function updateDesign() {
    const dotsType = document.getElementById("qr-dots-type").value;
    const cornerType = document.getElementById("qr-corner-type").value;
    const colorDots = document.getElementById("colorDots").value;
    const colorCorners = document.getElementById("colorCorners").value;
    const colorBg = document.getElementById("colorBg").value;

    // El "punto" interior del ojo solo admite: square, dot (y extra-rounded en versiones nuevas)
    const cornerDotType = (cornerType === "dot" || cornerType === "extra-rounded") ? "dot" : "square";

    qrCode.update({
        dotsOptions: { color: colorDots, type: dotsType },
        cornersSquareOptions: { type: cornerType, color: colorCorners },
        cornersDotOptions: { type: cornerDotType, color: colorCorners },
        backgroundOptions: { color: colorBg },
        image: currentLogo()
    });
}

/* ---- Logo / Íconos ---- */
function coloredIconDataUrl(name, color) {
    if (!window.IconDB || !window.IconDB[name]) return "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" fill="${color}"><path d="${window.IconDB[name]}"/></svg>`;
    return "data:image/svg+xml;base64," + btoa(svg);
}

function currentLogo() {
    if (uploadedLogo) return uploadedLogo;
    if (selectedIcon) {
        const color = document.getElementById("colorDots").value;
        return coloredIconDataUrl(selectedIcon, color);
    }
    return "";
}

function renderIconPresets() {
    const container = document.getElementById("icon-presets");
    if (!container || !window.IconDB) return;
    container.innerHTML = "";

    const makeBtn = (name, title, inner) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "icon-preset" + (name === null ? " selected" : "");
        b.title = title;
        b.setAttribute("aria-label", title);
        b.innerHTML = inner;
        b.onclick = () => selectIcon(name, b);
        container.appendChild(b);
    };

    makeBtn(null, "Sin ícono", '<i class="fa-solid fa-ban"></i>');
    for (const [name, path] of Object.entries(window.IconDB)) {
        const title = name.charAt(0).toUpperCase() + name.slice(1);
        makeBtn(name, title, `<svg viewBox="0 0 512 512" aria-hidden="true"><path d="${path}"/></svg>`);
    }
}

function selectIcon(name, btn) {
    document.querySelectorAll(".icon-preset").forEach(el => el.classList.remove("selected"));
    btn.classList.add("selected");
    selectedIcon = name;
    if (name) clearUploadedLogo();
    updateDesign();
}

function handleLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedLogo = e.target.result;
        selectedIcon = null;
        document.querySelectorAll(".icon-preset").forEach((el, i) => el.classList.toggle("selected", i === 0));
        show("logoUploadPlaceholder", false);
        show("logoPreviewArea", true);
        document.getElementById("imgPreview").src = uploadedLogo;
        updateDesign();
    };
    reader.readAsDataURL(file);
}

function clearUploadedLogo() {
    uploadedLogo = null;
    document.getElementById("logoInput").value = "";
    show("logoUploadPlaceholder", true);
    show("logoPreviewArea", false);
}

function removeLogo(event) {
    if (event) event.stopPropagation();
    clearUploadedLogo();
    updateDesign();
}

function downloadQR() {
    if (!buildSingleData()) {
        alert("Primero ingrese el contenido del código QR (el campo está vacío).");
        return;
    }
    const ext = document.getElementById("dl-format").value;
    qrCode.download({ name: "qr-free", extension: ext });
}

/* =========================================
   2. LÓGICA MASIVA (bulk.html)
   ========================================= */
let workbookData = [];
let bulkPreviewQR;
let bulkLogoData = null;
let bulkMode = "qr";
let isProcessing = false;

function initBulkPage() {
    if (document.getElementById("bulk-canvas-preview")) {
        bulkPreviewQR = new QRCodeStyling({
            width: 200, height: 200, type: "canvas",
            data: DEFAULT_QR_DATA,
            dotsOptions: { color: "#0f172a", type: "square" },
            cornersSquareOptions: { type: "square", color: "#0f172a" },
            cornersDotOptions: { type: "square", color: "#0f172a" },
            backgroundOptions: { color: "#ffffff" },
            imageOptions: { crossOrigin: "anonymous", margin: 5 }
        });
        bulkPreviewQR.append(document.getElementById("bulk-canvas-preview"));
    }

    const input = document.getElementById("excel-input");
    const dropZone = document.getElementById("drop-zone");
    if (input) input.addEventListener("change", (e) => handleFile(e.target.files[0]));
    if (dropZone) {
        dropZone.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.click(); }
        });
        dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("dragover"); });
        dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
        dropZone.addEventListener("drop", (e) => {
            e.preventDefault();
            dropZone.classList.remove("dragover");
            handleFile(e.dataTransfer.files[0]);
        });
    }
}

function switchTab(tab, btn) {
    document.querySelectorAll(".tab-btn").forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
    });
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    document.getElementById("tab-" + tab).classList.add("active");
    bulkMode = tab;
}

function columnLetter(i) {
    let s = "";
    for (i = i + 1; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s;
    return s;
}

function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            workbookData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: "" });
        } catch (err) {
            workbookData = [];
        }
        if (workbookData.length > 1) setupBulkUI(file.name);
        else alert("El archivo está vacío, no tiene filas de datos o no es un Excel/CSV válido.");
    };
    reader.readAsArrayBuffer(file);
}

function setupBulkUI(fileName) {
    show("drop-zone", false);
    show("bulk-controls", true);

    // Número de columnas = la fila más ancha
    const colCount = workbookData.reduce((m, r) => Math.max(m, (r || []).length), 0);
    const headers = workbookData[0] || [];
    const selectData = document.getElementById("col-data");
    const selectName = document.getElementById("col-name");

    selectData.innerHTML = "";
    selectName.innerHTML = "";
    selectName.add(new Option("(Numerar automáticamente)", ""));
    for (let i = 0; i < colCount; i++) {
        const h = String(headers[i] ?? "").trim();
        const label = `${columnLetter(i)}: ${h || "(sin encabezado)"}`;
        selectData.add(new Option(label, i));
        selectName.add(new Option(label, i));
    }
    if (colCount > 1) selectName.value = "1";

    document.getElementById("record-count").innerText =
        `${workbookData.length - 1} registros encontrados en "${fileName}"`;
    show("bulk-report", false);
}

function resetBulkFile() {
    if (isProcessing) return;
    workbookData = [];
    document.getElementById("excel-input").value = "";
    show("bulk-controls", false);
    show("drop-zone", true);
    show("bulk-report", false);
}

function readBulkDesign() {
    const cornersStyle = document.getElementById("bulk-qr-corners").value;
    const color = document.getElementById("bulk-qr-corners-color").value;
    return {
        dotsOptions: {
            color: document.getElementById("bulk-qr-color").value,
            type: document.getElementById("bulk-qr-dots").value
        },
        cornersSquareOptions: { type: cornersStyle, color },
        cornersDotOptions: {
            type: (cornersStyle === "dot" || cornersStyle === "extra-rounded") ? "dot" : "square",
            color
        },
        backgroundOptions: { color: document.getElementById("bulk-qr-bg").value },
        image: bulkLogoData || ""
    };
}

function updateBulkPreview() {
    if (bulkPreviewQR) bulkPreviewQR.update(readBulkDesign());
}

function handleBulkLogoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        bulkLogoData = e.target.result;
        show("bulkUploadPlaceholder", false);
        show("bulkLogoPreviewArea", true);
        document.getElementById("bulkImgPreview").src = bulkLogoData;
        updateBulkPreview();
    };
    reader.readAsDataURL(file);
}

function removeBulkLogo(event) {
    if (event) event.stopPropagation();
    bulkLogoData = null;
    document.getElementById("bulkLogoInput").value = "";
    show("bulkUploadPlaceholder", true);
    show("bulkLogoPreviewArea", false);
    updateBulkPreview();
}

// Genera un nombre único dentro del ZIP (evita que se sobrescriban archivos)
function uniqueName(base, used) {
    let name = base, n = 2;
    while (used.has(name.toLowerCase())) name = `${base}_${n++}`;
    used.add(name.toLowerCase());
    return name;
}

async function processBulkData() {
    if (isProcessing) return;
    if (workbookData.length < 2) { alert("Primero cargue un archivo con datos."); return; }

    isProcessing = true;
    const btn = document.getElementById("btn-process");
    btn.disabled = true;

    const mode = bulkMode;
    const dataCol = parseInt(document.getElementById("col-data").value, 10);
    const nameColRaw = document.getElementById("col-name").value;
    const nameCol = nameColRaw === "" ? null : parseInt(nameColRaw, 10);
    const exportFormat = document.getElementById("bulk-export-format").value;
    const exportSize = parseInt(document.getElementById("bulk-export-size").value, 10);

    const pFill = document.getElementById("progress-fill");
    const pText = document.getElementById("progress-text");
    show("progress-container", true);
    show("bulk-report", false);
    pFill.style.width = "0%";

    const zip = new JSZip();
    const folder = zip.folder(mode === "qr" ? `lote_qrs_${exportFormat}` : `lote_barcodes_${exportFormat}`);
    const usedNames = new Set();
    const errors = [];
    let ok = 0, empty = 0;

    let tempQR;
    if (mode === "qr") {
        tempQR = new QRCodeStyling({
            width: exportSize, height: exportSize,
            type: exportFormat === "svg" ? "svg" : "canvas",
            imageOptions: { margin: 10, crossOrigin: "anonymous" },
            ...readBulkDesign()
        });
    }

    const barFormat = document.getElementById("bulk-bar-format").value;
    const barShowText = document.getElementById("bulk-bar-text").value === "true";
    const barColor = document.getElementById("bulk-bar-color").value;
    const scaleFactor = exportSize >= 2000 ? 4 : exportSize >= 1000 ? 3 : 2;
    const barOptions = {
        format: barFormat, lineColor: barColor, displayValue: barShowText,
        width: scaleFactor, height: 50 * scaleFactor, fontSize: 10 * scaleFactor,
        margin: 5 * scaleFactor, background: "#ffffff"
    };

    const total = workbookData.length - 1;
    try {
        for (let i = 1; i < workbookData.length; i++) {
            const row = workbookData[i] || [];
            const content = String(row[dataCol] ?? "").trim();

            if (!content) {
                empty++;
            } else {
                const rawName = nameCol === null ? "" : String(row[nameCol] ?? "");
                const base = sanitizeFilename(rawName) || `codigo_${String(i).padStart(4, "0")}`;
                let blob = null;

                try {
                    if (mode === "qr") {
                        tempQR.update({ data: content });
                        blob = await tempQR.getRawData(exportFormat);
                    } else if (exportFormat === "svg") {
                        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
                        JsBarcode(svg, content, barOptions);
                        blob = svgToBlob(svg);
                    } else {
                        const canvas = document.createElement("canvas");
                        JsBarcode(canvas, content, barOptions);
                        const mime = exportFormat === "jpeg" ? "image/jpeg" : "image/png";
                        blob = await new Promise(r => canvas.toBlob(r, mime, 0.95));
                    }
                } catch (err) {
                    blob = null;
                }

                if (blob) {
                    folder.file(`${uniqueName(base, usedNames)}.${exportFormat === "jpeg" ? "jpg" : exportFormat}`, blob);
                    ok++;
                } else {
                    errors.push({ row: i + 1, content });
                }
            }

            pFill.style.width = `${Math.round((i / total) * 100)}%`;
            pText.innerText = `Procesando ${i} / ${total}`;
            if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
        }

        if (errors.length) {
            const txt = "Filas que no se pudieron generar (revise que el valor sea válido para el formato elegido):\r\n\r\n" +
                errors.map(e => `Fila ${e.row}: ${e.content}`).join("\r\n");
            zip.file("ERRORES.txt", txt);
        }

        if (ok === 0) {
            pText.innerText = "No se generó ningún código.";
        } else {
            pText.innerText = "Empaquetando ZIP...";
            const content = await zip.generateAsync({ type: "blob" });
            saveAs(content, `Lote_${mode.toUpperCase()}.zip`);
            pText.innerText = "¡Completado!";
        }
        showBulkReport(ok, empty, errors);
    } finally {
        isProcessing = false;
        btn.disabled = false;
        setTimeout(() => show("progress-container", false), 3000);
    }
}

function showBulkReport(ok, empty, errors) {
    const box = document.getElementById("bulk-report");
    if (!box) return;
    let html = `<strong>${ok} archivo(s) generado(s).</strong>`;
    if (empty) html += `<br>${empty} fila(s) vacía(s) omitida(s).`;
    if (errors.length) {
        const list = errors.slice(0, 10)
            .map(e => `<li>Fila ${e.row}: <code>${escapeHtml(e.content)}</code></li>`).join("");
        html += `<br><span class="report-error">${errors.length} fila(s) con valor inválido para el formato elegido` +
            ` (detalle en ERRORES.txt dentro del ZIP):</span><ul>${list}</ul>` +
            (errors.length > 10 ? `<p>... y ${errors.length - 10} más.</p>` : "");
    }
    box.innerHTML = html;
    box.classList.toggle("has-errors", errors.length > 0);
    show(box, true);
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function downloadExcelTemplate() {
    const data = [
        ["DATOS_QR", "NOMBRE_ARCHIVO"],
        ["https://www.miempresa.com", "web_principal"],
        ["WIFI:T:WPA;S:MiRed;P:1234;;", "wifi_invitados"],
        ["1234567890128", "producto_ean13"],
        ["CODE-128-TEST", "etiqueta_logistica"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [{ wch: 40 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Carga");
    XLSX.writeFile(wb, "Plantilla_QR_Free.xlsx");
}

/* =========================================
   3. CÓDIGO DE BARRAS INDIVIDUAL (barcode.html)
   ========================================= */
let barcodeValid = false;

function readBarcodeOptions() {
    return {
        format: document.getElementById("barcode-format").value,
        lineColor: document.getElementById("bar-color").value,
        displayValue: document.getElementById("show-text").value === "true",
        width: 2, height: 100, margin: 10, background: "#ffffff"
    };
}

function generateBarcode() {
    const value = document.getElementById("barcode-value").value.trim();
    const errorBox = document.getElementById("barcode-error");
    const svg = document.getElementById("barcode");
    const dlBtn = document.getElementById("btn-download-barcode");

    barcodeValid = false;
    if (value) {
        try {
            JsBarcode(svg, value, readBarcodeOptions());
            barcodeValid = true;
        } catch (err) {
            barcodeValid = false;
        }
    }

    show(svg, barcodeValid);
    dlBtn.disabled = !barcodeValid;
    if (barcodeValid) {
        show(errorBox, false);
    } else {
        errorBox.textContent = value
            ? "El valor no es válido para el formato seleccionado (revise la cantidad de dígitos y el dígito de control)."
            : "Ingrese un valor para generar el código.";
        show(errorBox, true);
    }
}

async function downloadBarcode() {
    if (!barcodeValid) return;
    const value = document.getElementById("barcode-value").value.trim();
    const format = document.getElementById("barcode-dl-format").value;
    const base = sanitizeFilename(value) || "codigo_barras";

    if (format === "svg") {
        triggerDownload(svgToBlob(document.getElementById("barcode")), `${base}.svg`);
    } else {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, value, { ...readBarcodeOptions(), width: 4, height: 200, fontSize: 40, margin: 20 });
        const blob = await new Promise(r => canvas.toBlob(r, "image/png"));
        triggerDownload(blob, `${base}.png`);
    }
}

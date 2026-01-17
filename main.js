/* =========================================
   VARIABLES GLOBALES
   ========================================= */
let qrCode;
let currentType = 'url';
let workbookData = [];
let uploadedLogo = null; // Para Indivual

let bulkPreviewQR; // Instancia para preview masivo
let bulkLogoData = null; // Base64 logo masivo

// Plantillas de formularios (Para Individual)
const formTemplates = {
    url: `<div class="form-group"><label>URL</label><input type="url" id="inp-url" placeholder="https://..." oninput="updateSingleQR()"></div>`,
    wifi: `<div class="form-group"><label>SSID</label><input type="text" id="inp-ssid" oninput="updateSingleQR()"></div><div class="form-group"><label>Password</label><input type="text" id="inp-pass" oninput="updateSingleQR()"></div><div class="form-group"><label>Seguridad</label><select id="inp-enc" onchange="updateSingleQR()"><option value="WPA">WPA/WPA2</option><option value="WEP">WEP</option><option value="nopass">Abierta</option></select></div>`,
    vcard: `<div class="form-group"><label>Nombre</label><input type="text" id="inp-name" oninput="updateSingleQR()"></div><div class="form-group"><label>Teléfono</label><input type="tel" id="inp-tel" oninput="updateSingleQR()"></div><div class="form-group"><label>Email</label><input type="email" id="inp-email" oninput="updateSingleQR()"></div>`,
    email: `<div class="form-group"><label>Email</label><input type="email" id="inp-mail-to" oninput="updateSingleQR()"></div><div class="form-group"><label>Asunto</label><input type="text" id="inp-mail-sub" oninput="updateSingleQR()"></div>`,
    text: `<div class="form-group"><label>Texto</label><textarea id="inp-text" rows="3" oninput="updateSingleQR()"></textarea></div>`,
    geo: `<div class="form-group"><label>Latitud, Longitud</label><input type="text" id="inp-geo" placeholder="-12.00, -77.00" oninput="updateSingleQR()"></div>`
};

/* =========================================
   1. LÓGICA INDIVIDUAL (INDEX)
   ========================================= */
function initSingleQR() {
    qrCode = new QRCodeStyling({
        width: 300, height: 300, type: "canvas", data: "https://qr-enterprise.com",
        dotsOptions: { color: "#0f172a", type: "square" },
        cornersSquareOptions: { type: "square", color: "#0f172a" },
        backgroundOptions: { color: "#ffffff" },
        imageOptions: { crossOrigin: "anonymous", margin: 10 }
    });
    
    const container = document.getElementById('dynamic-inputs');
    if(container) {
        container.innerHTML = formTemplates['url'];
        qrCode.append(document.getElementById('canvas'));
    }
}

function setType(type) {
    currentType = type;
    document.querySelectorAll('.type-btn').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
    document.getElementById('dynamic-inputs').innerHTML = formTemplates[type] || formTemplates['url'];
    updateSingleQR();
}

function updateSingleQR() {
    let data = "";
    const val = (id) => document.getElementById(id) ? document.getElementById(id).value : "";

    if(currentType === 'url') data = val('inp-url') || "https://ejemplo.com";
    else if(currentType === 'text') data = val('inp-text') || "Texto";
    else if(currentType === 'wifi') data = `WIFI:T:${val('inp-enc')};S:${val('inp-ssid')};P:${val('inp-pass')};;`;
    else if(currentType === 'email') data = `mailto:${val('inp-mail-to')}?subject=${val('inp-mail-sub')}`;
    else if(currentType === 'geo') data = `geo:${val('inp-geo')}`;
    else if(currentType === 'vcard') data = `BEGIN:VCARD\nVERSION:3.0\nFN:${val('inp-name')}\nTEL:${val('inp-tel')}\nEMAIL:${val('inp-email')}\nEND:VCARD`;

    qrCode.update({ data: data });
}

function updateDesign() {
    const dotsType = document.getElementById('qr-dots-type').value;
    const cornerType = document.getElementById('qr-corner-type').value;
    const colorDots = document.getElementById('colorDots').value;
    const colorCorners = document.getElementById('colorCorners').value;
    
    // NUEVO: Leer color de fondo
    const colorBg = document.getElementById('colorBg').value;

    qrCode.update({
        dotsOptions: { color: colorDots, type: dotsType },
        cornersSquareOptions: { type: cornerType, color: colorCorners },
        cornersDotOptions: { type: cornerType, color: colorCorners },
        // NUEVO: Aplicar color de fondo
        backgroundOptions: { color: colorBg }
    });
}

function handleLogoUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            uploadedLogo = e.target.result;
            document.querySelector('.upload-placeholder').style.display = 'none';
            document.getElementById('logoPreviewArea').style.display = 'flex';
            document.getElementById('imgPreview').src = uploadedLogo;
            qrCode.update({ image: uploadedLogo });
        };
        reader.readAsDataURL(file);
    }
}

function removeLogo() {
    uploadedLogo = null;
    document.getElementById('logoInput').value = "";
    document.querySelector('.upload-placeholder').style.display = 'block';
    document.getElementById('logoPreviewArea').style.display = 'none';
    qrCode.update({ image: null });
}

function downloadQR() {
    const ext = document.getElementById('dl-format').value;
    qrCode.download({ name: "qr-pro", extension: ext });
}

/* =========================================
   2. LÓGICA MASIVA (BULK & BARCODE)
   ========================================= */
function initBulkPage() {
    const dropZone = document.getElementById('drop-zone');
    const input = document.getElementById('excel-input');
    
    // Inicializar Preview
    if(document.getElementById('bulk-canvas-preview')) {
        bulkPreviewQR = new QRCodeStyling({
            width: 200, height: 200, type: "canvas", 
            data: "PREVIEW-DATA",
            dotsOptions: { color: "#0f172a", type: "square" },
            backgroundOptions: { color: "#ffffff" },
            imageOptions: { crossOrigin: "anonymous", margin: 5 }
        });
        bulkPreviewQR.append(document.getElementById('bulk-canvas-preview'));
    }

    if(dropZone) {
        input.addEventListener('change', (e) => handleFile(e.target.files[0]));
    }
}

function handleFile(file) {
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        workbookData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1});

        if(workbookData.length > 0) setupBulkUI();
        else alert("Archivo vacío o inválido.");
    };
    reader.readAsArrayBuffer(file);
}

function setupBulkUI() {
    document.getElementById('drop-zone').style.display = 'none';
    document.getElementById('bulk-controls').style.display = 'block';
    
    const headers = workbookData[0];
    const selectData = document.getElementById('col-data');
    const selectName = document.getElementById('col-name');
    
    selectData.innerHTML = ''; selectName.innerHTML = '';
    headers.forEach((h, i) => {
        selectData.add(new Option(h, i));
        selectName.add(new Option(h, i));
    });
    document.getElementById('record-count').innerText = `${workbookData.length - 1} Registros encontrados`;
}

function updateBulkPreview() {
    if(!bulkPreviewQR) return;

    const dotsStyle = document.getElementById('bulk-qr-dots').value;
    const colorDots = document.getElementById('bulk-qr-color').value;
    const cornersStyle = document.getElementById('bulk-qr-corners').value;
    const colorCorners = document.getElementById('bulk-qr-corners-color').value;
    const bg = document.getElementById('bulk-qr-bg').value;

    bulkPreviewQR.update({
        dotsOptions: { color: colorDots, type: dotsStyle },
        cornersSquareOptions: { type: cornersStyle, color: colorCorners },
        cornersDotOptions: { type: cornersStyle, color: colorCorners },
        backgroundOptions: { color: bg },
        image: bulkLogoData
    });
}

function handleBulkLogoUpload(input) {
    const file = input.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            bulkLogoData = e.target.result;
            document.getElementById('bulkUploadPlaceholder').style.display = 'none';
            document.getElementById('bulkLogoPreviewArea').style.display = 'flex';
            document.getElementById('bulkImgPreview').src = bulkLogoData;
            updateBulkPreview();
        };
        reader.readAsDataURL(file);
    }
}

function removeBulkLogo() {
    bulkLogoData = null;
    document.getElementById('bulkLogoInput').value = "";
    document.getElementById('bulkUploadPlaceholder').style.display = 'block';
    document.getElementById('bulkLogoPreviewArea').style.display = 'none';
    updateBulkPreview();
}

async function processBulkData() {
    const mode = window.currentBulkMode || 'qr';
    const dataCol = document.getElementById('col-data').value;
    const nameCol = document.getElementById('col-name').value;
    
    // Opciones Exportación
    const exportFormat = document.getElementById('bulk-export-format').value;
    const exportSize = parseInt(document.getElementById('bulk-export-size').value);

    // UI Progress
    const pContainer = document.getElementById('progress-container');
    const pFill = document.getElementById('progress-fill');
    const pText = document.getElementById('progress-text');
    pContainer.style.display = 'block';

    const zip = new JSZip();
    const folderName = mode === 'qr' ? `lote_qrs_${exportFormat}` : "lote_barcodes";
    const folder = zip.folder(folderName);

    // Configuración QR Instance
    let tempQR;
    if (mode === 'qr') {
        const dotsStyle = document.getElementById('bulk-qr-dots').value;
        const colorDots = document.getElementById('bulk-qr-color').value;
        const cornersStyle = document.getElementById('bulk-qr-corners').value;
        const colorCorners = document.getElementById('bulk-qr-corners-color').value;
        const colorBg = document.getElementById('bulk-qr-bg').value;
        
        tempQR = new QRCodeStyling({
            width: exportSize, height: exportSize, type: "canvas",
            dotsOptions: { color: colorDots, type: dotsStyle },
            cornersSquareOptions: { type: cornersStyle, color: colorCorners },
            cornersDotOptions: { type: cornersStyle, color: colorCorners },
            backgroundOptions: { color: colorBg },
            imageOptions: { margin: 10, crossOrigin: "anonymous" },
            image: bulkLogoData
        });
    }

    let barcodeCanvas = document.createElement('canvas');

    for (let i = 1; i < workbookData.length; i++) {
        const row = workbookData[i];
        if(!row) continue;
        
        const content = String(row[dataCol] || "");
        let filename = String(row[nameCol] || `file_${i}`).replace(/[^a-z0-9\-_]/gi, '_');
        
        if(!content) continue;
        let blob;

        if (mode === 'qr') {
            tempQR.update({ data: content });
            blob = await tempQR.getRawData(exportFormat);
        } else {
            // Barcode Logic (siempre PNG o JPG)
            const format = document.getElementById('bulk-bar-format').value;
            const showText = document.getElementById('bulk-bar-text').value === "true";
            const color = document.getElementById('bulk-bar-color').value;
            const scaleFactor = exportSize > 1000 ? 3 : 2;

            try {
                JsBarcode(barcodeCanvas, content, {
                    format: format, lineColor: color, displayValue: showText,
                    width: scaleFactor, height: 100 * (scaleFactor/2), margin: 10, background: "#ffffff"
                });
                const mime = exportFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
                blob = await new Promise(r => barcodeCanvas.toBlob(r, mime));
            } catch(e) {}
        }

        const finalExt = (mode === 'barcode' && exportFormat === 'svg') ? 'png' : exportFormat;
        if(blob) folder.file(`${filename}.${finalExt}`, blob);

        const pct = Math.round((i / (workbookData.length - 1)) * 100);
        pFill.style.width = `${pct}%`;
        pText.innerText = `Procesando ${i} / ${workbookData.length - 1}`;
        await new Promise(r => setTimeout(r, 5));
    }

    pText.innerText = "Empaquetando ZIP...";
    zip.generateAsync({type:"blob"}).then(content => {
        saveAs(content, `Lote_${mode.toUpperCase()}.zip`);
        pText.innerText = "¡Completado!";
        setTimeout(() => { pContainer.style.display = 'none'; }, 4000);
    });
}

function downloadExcelTemplate() {
    const data = [
        ["DATOS_QR", "NOMBRE_ARCHIVO"], 
        ["https://www.miempresa.com", "web_principal"],
        ["WIFI:S:MiRed;T:WPA;P:1234;;", "wifi_invitados"],
        ["1234567890128", "producto_ean13"],
        ["CODE-128-TEST", "etiqueta_logistica"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 40 }, { wch: 25 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Carga");
    XLSX.writeFile(wb, "Plantilla_QR_Enterprise.xlsx");
}   
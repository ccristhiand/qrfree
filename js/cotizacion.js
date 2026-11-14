/* =========================================
   QR Free · Generador de cotizaciones, proformas y notas de venta (PDF)
   Todo se guarda solo en este navegador. Requiere: kit.js, jsPDF (window.jspdf)
   ========================================= */
const QUOTE_KEY = "qrfree-cotizacion";
const DOC_TYPES = {
    cotizacion: { title: "COTIZACIÓN", prefix: "COT", validity: true },
    proforma: { title: "PROFORMA", prefix: "PRO", validity: true },
    nota: { title: "NOTA DE VENTA", prefix: "NV", validity: false, noTax: true },
    recibo: { title: "RECIBO", prefix: "REC", validity: false, noTax: true },
};
const CURRENCIES = { PEN: { sym: "S/", word: "SOLES" }, USD: { sym: "US$", word: "DÓLARES AMERICANOS" } };

function initCotizacion() {
    const form = $("#quote-form");
    const tbody = $("#items-body");
    let logo = null;

    /* ---- Ítems ---- */
    const addItem = (it = {}, focus = false) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="text" class="it-desc" aria-label="Descripción" placeholder="Producto o servicio" autocomplete="off"></td>
            <td><input type="number" class="it-qty" aria-label="Cantidad" min="0" step="any" inputmode="decimal" value="1"></td>
            <td><input type="number" class="it-price" aria-label="Precio unitario" min="0" step="any" inputmode="decimal" placeholder="0.00"></td>
            <td class="it-total" aria-live="off">0.00</td>
            <td><button type="button" class="icon-btn icon-btn-danger" aria-label="Quitar fila"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></td>`;
        $(".it-desc", tr).value = it.desc || "";
        if (it.qty !== undefined) $(".it-qty", tr).value = it.qty;
        if (it.price !== undefined) $(".it-price", tr).value = it.price;
        $("button", tr).addEventListener("click", () => {
            if ($$("tr", tbody).length === 1) { $$("input", tr).forEach(i => i.value = i.classList.contains("it-qty") ? "1" : ""); }
            else tr.remove();
            update();
        });
        tbody.appendChild(tr);
        if (focus) $(".it-desc", tr).focus();
    };
    const items = () => $$("tr", tbody).map(tr => ({
        desc: $(".it-desc", tr).value.trim(),
        qty: parseNum($(".it-qty", tr).value),
        price: parseNum($(".it-price", tr).value),
    }));
    $("#btn-add-item").addEventListener("click", () => { addItem({}, true); update(); });

    /* ---- Logo ---- */
    const setLogo = (dataUrl) => {
        logo = dataUrl;
        show("logo-drop", !logo);
        show("logo-chip", !!logo);
        if (logo) $("#logo-img").src = logo;
    };
    initDropzone($("#logo-drop"), $("#logo-input"), async (file) => {
        try {
            const bmp = await loadBitmap(file);
            const k = Math.min(1, 400 / Math.max(bmp.width, bmp.height));
            const c = document.createElement("canvas");
            c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
            c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
            setLogo(c.toDataURL("image/png"));
            update();
        } catch (e) { toast("No se pudo leer la imagen del logo.", "error"); }
    });
    $("#logo-remove").addEventListener("click", () => { setLogo(null); update(); });

    /* ---- Totales ---- */
    const totals = () => {
        const v = formValues(form);
        const type = DOC_TYPES[v.tipo] || DOC_TYPES.cotizacion;
        const sum = items().reduce((s, it) => s + it.qty * it.price, 0);
        const disc = Math.min(sum, parseNum(v.descuento));
        const net = sum - disc;
        const mode = v.igv;
        let base, igv, total;
        if (mode === "agregar") { base = net; igv = net * 0.18; total = net + igv; }
        else if (mode === "incluido") { total = net; base = net / 1.18; igv = total - base; }
        else { base = net; igv = 0; total = net; }
        return { v, type, sum, disc, base, igv, total, cur: CURRENCIES[v.moneda] || CURRENCIES.PEN };
    };

    const update = () => {
        $$("tr", tbody).forEach(tr => {
            const t = parseNum($(".it-qty", tr).value) * parseNum($(".it-price", tr).value);
            $(".it-total", tr).textContent = MONEY_FMT.format(round2(t));
        });
        const t = totals();
        const { sym } = t.cur;
        show("validity-field", t.type.validity);
        $("#quote-totals").innerHTML = resultRows([
            ["Subtotal", fmtMoney(t.sum, sym)],
            t.disc ? ["Descuento", "− " + fmtMoney(t.disc, sym), "is-neg"] : null,
            t.v.igv !== "sin" ? ["Op. gravada", fmtMoney(t.base, sym)] : null,
            t.v.igv !== "sin" ? ["IGV 18 %", fmtMoney(t.igv, sym)] : null,
        ].filter(Boolean)) + bigTotal("Total", fmtMoney(t.total, sym));
        $("#quote-words").textContent = `SON: ${numberToWordsEs(t.total)} ${t.cur.word}`;
        save();
    };

    /* ---- Guardado local ---- */
    const save = () => {
        const v = formValues(form);
        const data = { v, items: items(), logo: v.recordar ? logo : null };
        if (!v.recordar) { // solo el borrador, sin datos de la empresa
            ["emp_nombre", "emp_ruc", "emp_dir", "emp_tel", "emp_email", "pago"].forEach(k => delete data.v[k]);
        }
        localSet(QUOTE_KEY, data);
    };
    const load = () => {
        const data = localGet(QUOTE_KEY, null);
        if (data && data.v) {
            Object.entries(data.v).forEach(([k, val]) => {
                const el = form.elements[k];
                if (!el) return;
                if (el instanceof RadioNodeList) { $$(`input[name="${k}"]`, form).forEach(r => r.checked = r.value === val); }
                else if (el.type === "checkbox") el.checked = !!val;
                else el.value = val;
            });
            if (data.logo) setLogo(data.logo);
        }
        (data && data.items && data.items.length ? data.items : [{}]).forEach(it => addItem(it));
        if (!$("#q-fecha").value) $("#q-fecha").value = isoDate(new Date());
        if (!$("#q-numero").value) $("#q-numero").value = nextNumber();
    };
    const nextNumber = (current) => {
        const type = DOC_TYPES[$("#q-tipo").value] || DOC_TYPES.cotizacion;
        const m = String(current || "").match(/(\d+)\s*$/);
        const n = m ? parseInt(m[1], 10) + 1 : 1;
        return `${type.prefix}-${String(n).padStart(m ? m[1].length : 4, "0")}`;
    };
    $("#q-tipo").addEventListener("change", () => {
        const type = DOC_TYPES[$("#q-tipo").value];
        const num = $("#q-numero");
        const m = num.value.match(/^([A-Z]+)-(\d+)$/);
        if (!num.value || (m && Object.values(DOC_TYPES).some(t => t.prefix === m[1]))) num.value = `${type.prefix}-${m ? m[2] : "0001"}`;
        if (type.noTax && $("#q-igv").value === "agregar") $("#q-igv").value = "sin";
        update();
    });

    $("#btn-new").addEventListener("click", () => {
        if (!confirm("¿Empezar un documento nuevo? Se borrarán el cliente y los productos (sus datos de empresa se mantienen).")) return;
        ["cli_nombre", "cli_doc", "cli_dir", "cli_contacto", "descuento"].forEach(k => { if (form.elements[k]) form.elements[k].value = ""; });
        tbody.innerHTML = ""; addItem({}, false);
        $("#q-numero").value = nextNumber($("#q-numero").value);
        $("#q-fecha").value = isoDate(new Date());
        update();
        $("#cli-nombre").focus();
    });

    form.addEventListener("input", update);
    form.addEventListener("change", update);
    form.addEventListener("submit", (e) => e.preventDefault());

    /* ---- PDF ---- */
    const buildPdf = () => {
        if (!window.jspdf) throw new Error("No se pudo cargar el generador de PDF. Recargue la página.");
        const t = totals();
        const v = t.v;
        const list = items().filter(it => it.desc || it.price);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: "mm", format: "a4" });
        const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
        const M = 15;
        const color = hexToRgb(v.color || "#2563eb");
        const ink = [15, 23, 42], muted = [91, 107, 128], line = [226, 232, 240];
        const sym = t.cur.sym;
        const money = (n) => `${sym} ${MONEY_FMT.format(round2(n))}`;
        let y = M;

        // Encabezado: logo y empresa
        let textX = M;
        if (logo) {
            const props = doc.getImageProperties(logo);
            const k = Math.min(32 / props.width, 22 / props.height);
            const w = props.width * k, h = props.height * k;
            doc.addImage(logo, "PNG", M, y, w, h);
            textX = M + w + 5;
        }
        doc.setTextColor(...ink);
        doc.setFont("helvetica", "bold"); doc.setFontSize(13);
        const empLines = doc.splitTextToSize(v.emp_nombre || "Su empresa", 95 - (textX - M));
        doc.text(empLines, textX, y + 5);
        let ey = y + 5 + empLines.length * 5.5;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...muted);
        [v.emp_ruc ? `RUC: ${v.emp_ruc}` : "", v.emp_dir, [v.emp_tel, v.emp_email].filter(Boolean).join(" · ")].filter(Boolean).forEach(s => {
            const ls = doc.splitTextToSize(s, 95 - (textX - M));
            doc.text(ls, textX, ey); ey += ls.length * 4;
        });

        // Recuadro del documento
        const bx = W - M - 62, bw = 62;
        doc.setDrawColor(...color); doc.setLineWidth(0.6);
        doc.roundedRect(bx, y, bw, 26, 2, 2, "S");
        doc.setFillColor(...color); doc.roundedRect(bx, y, bw, 9, 2, 2, "F"); doc.rect(bx, y + 5, bw, 4, "F");
        doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(10.5);
        doc.text(t.type.title, bx + bw / 2, y + 6.2, { align: "center" });
        doc.setTextColor(...ink); doc.setFontSize(12);
        doc.text(`N.° ${v.numero || "-"}`, bx + bw / 2, y + 16, { align: "center" });
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...muted);
        const fecha = parseDate(v.fecha) || new Date();
        doc.text(`Fecha: ${fmtDate(fecha)}`, bx + bw / 2, y + 22, { align: "center" });
        y = Math.max(ey, y + 26) + 6;

        // Cliente
        doc.setDrawColor(...line); doc.setLineWidth(0.3);
        const cli = [
            ["Cliente", v.cli_nombre || "-"],
            ["RUC / DNI", v.cli_doc],
            ["Dirección", v.cli_dir],
            ["Contacto", v.cli_contacto],
            t.type.validity && parseNum(v.validez) ? ["Válida hasta", fmtDate(addDays(fecha, parseNum(v.validez)))] : null,
        ].filter(r => r && r[1]);
        const cliStart = y;
        y += 6;
        cli.forEach(([k, val]) => {
            doc.setFont("helvetica", "bold"); doc.setTextColor(...muted); doc.setFontSize(8.5);
            doc.text(k.toUpperCase(), M + 4, y);
            doc.setFont("helvetica", "normal"); doc.setTextColor(...ink); doc.setFontSize(9.5);
            const ls = doc.splitTextToSize(String(val), W - 2 * M - 40);
            doc.text(ls, M + 32, y);
            y += Math.max(5, ls.length * 4.5);
        });
        doc.roundedRect(M, cliStart, W - 2 * M, y - cliStart - 1, 2, 2, "S");
        y += 5;

        // Tabla
        const cols = [
            { key: "n", label: "#", w: 9, align: "center" },
            { key: "desc", label: "Descripción", w: W - 2 * M - 9 - 18 - 28 - 30 },
            { key: "qty", label: "Cant.", w: 18, align: "right" },
            { key: "price", label: "P. unit.", w: 28, align: "right" },
            { key: "total", label: "Importe", w: 30, align: "right" },
        ];
        const header = () => {
            doc.setFillColor(...color); doc.rect(M, y, W - 2 * M, 8, "F");
            doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(9);
            let x = M;
            cols.forEach(c => {
                const tx = c.align === "right" ? x + c.w - 2 : c.align === "center" ? x + c.w / 2 : x + 2;
                doc.text(c.label, tx, y + 5.4, { align: c.align || "left" });
                x += c.w;
            });
            y += 8;
        };
        header();
        doc.setFontSize(9);
        list.forEach((it, i) => {
            doc.setFont("helvetica", "normal");
            const descLines = doc.splitTextToSize(it.desc || "-", cols[1].w - 4);
            const h = Math.max(7, descLines.length * 4.3 + 3);
            if (y + h > H - 40) { doc.addPage(); y = M; header(); doc.setFontSize(9); }
            if (i % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(M, y, W - 2 * M, h, "F"); }
            doc.setTextColor(...ink);
            const vals = { n: String(i + 1), qty: it.qty.toLocaleString("es-PE", { maximumFractionDigits: 3 }), price: MONEY_FMT.format(round2(it.price)), total: MONEY_FMT.format(round2(it.qty * it.price)) };
            let x = M;
            cols.forEach(c => {
                if (c.key === "desc") doc.text(descLines, x + 2, y + 4.8);
                else {
                    const tx = c.align === "right" ? x + c.w - 2 : x + c.w / 2;
                    doc.text(vals[c.key], tx, y + 4.8, { align: c.align });
                }
                x += c.w;
            });
            y += h;
            doc.setDrawColor(...line); doc.line(M, y, W - M, y);
        });
        if (!list.length) { doc.setTextColor(...muted); doc.text("Sin productos", M + 11, y + 5); y += 8; }

        // Totales
        y += 5;
        if (y > H - 60) { doc.addPage(); y = M; }
        const tx = W - M - 70;
        const totalRow = (label, value, bold) => {
            doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(bold ? 11 : 9.5);
            doc.setTextColor(...(bold ? ink : muted));
            doc.text(label, tx, y);
            doc.setTextColor(...ink);
            doc.text(value, W - M - 2, y, { align: "right" });
            y += bold ? 7 : 5.5;
        };
        totalRow("Subtotal", money(t.sum));
        if (t.disc) totalRow("Descuento", "- " + money(t.disc));
        if (v.igv !== "sin") { totalRow("Op. gravada", money(t.base)); totalRow("IGV 18 %", money(t.igv)); }
        doc.setDrawColor(...color); doc.setLineWidth(0.5); doc.line(tx, y - 3, W - M, y - 3);
        y += 2;
        totalRow("TOTAL", money(t.total), true);
        doc.setFont("helvetica", "normal"); doc.setFontSize(8.5); doc.setTextColor(...ink);
        const words = doc.splitTextToSize(`SON: ${numberToWordsEs(t.total)} ${t.cur.word}`, W - 2 * M);
        doc.text(words, M, y + 2); y += words.length * 4 + 6;
        if (v.igv === "incluido") { doc.setTextColor(...muted); doc.text("Precios incluyen IGV.", M, y - 2); y += 3; }

        // Notas
        const block = (title, text) => {
            if (!text || !text.trim()) return;
            const ls = doc.splitTextToSize(text.trim(), W - 2 * M);
            if (y + 8 + ls.length * 4.2 > H - 18) { doc.addPage(); y = M; }
            doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(...color);
            doc.text(title, M, y); y += 5;
            doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...ink);
            doc.text(ls, M, y); y += ls.length * 4.2 + 5;
        };
        block("Condiciones", v.condiciones);
        block("Datos de pago", v.pago);

        // Pie
        const pages = doc.getNumberOfPages();
        for (let p = 1; p <= pages; p++) {
            doc.setPage(p);
            doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(148, 163, 184);
            const legal = t.type.noTax ? "Documento interno sin valor tributario. No reemplaza a una boleta o factura electrónica." : "";
            if (legal) doc.text(legal, M, H - 10);
            doc.text(`Página ${p} de ${pages}`, W - M, H - 10, { align: "right" });
            doc.text("Creado gratis en qrfre.com", W - M, H - 6, { align: "right" });
        }
        return doc;
    };
    const fileName = () => {
        const v = formValues(form);
        return `${sanitizeFilename(`${v.numero || "documento"}_${v.cli_nombre || ""}`) || "cotizacion"}.pdf`;
    };
    const guard = () => {
        if (!items().some(it => it.desc && it.price)) { toast("Agregue al menos un producto con descripción y precio.", "error"); $(".it-desc", tbody).focus(); return false; }
        return true;
    };
    $("#btn-pdf").addEventListener("click", () => {
        if (!guard()) return;
        try {
            const doc = buildPdf();
            triggerDownload(doc.output("blob"), fileName());
            toast("¡Listo! Su PDF se está descargando.", "success");
            afterDownload();
        } catch (e) { console.error(e); toast(e.message || "No se pudo crear el PDF.", "error"); }
    });
    $("#btn-preview").addEventListener("click", () => {
        if (!guard()) return;
        const win = window.open("", "_blank");
        try {
            const url = URL.createObjectURL(buildPdf().output("blob"));
            if (win) win.location.href = url; else window.location.href = url;
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e) { if (win) win.close(); toast(e.message || "No se pudo crear el PDF.", "error"); }
    });
    $("#btn-wa").addEventListener("click", () => {
        const t = totals();
        const msg = `Hola${t.v.cli_nombre ? " " + t.v.cli_nombre : ""}, le envío la ${t.type.title.toLowerCase()} N.° ${t.v.numero} por un total de ${fmtMoney(t.total, t.cur.sym)}. Quedo atento(a). ${t.v.emp_nombre || ""}`.trim();
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
    });

    load();
    update();
}

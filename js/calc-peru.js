/* =========================================
   QR Free · Calculadoras laborales y tributarias de Perú
   CTS, gratificación, liquidación, renta de 5.ª (sueldo neto), IGV y RUC.
   Requiere: kit.js
   Valores de referencia (editables en cada calculadora):
   ========================================= */
const PE = {
    RMV: 1130,   // Remuneración mínima vital
    UIT: 5500,   // Unidad impositiva tributaria
    IGV: 18,
};
const REGIMEN = {
    general: { label: "Régimen general", cts: 1, grati: 1, vac: 1 },
    pequena: { label: "Pequeña empresa (REMYPE)", cts: 0.5, grati: 0.5, vac: 0.5 },
    micro: { label: "Microempresa (REMYPE)", cts: 0, grati: 0, vac: 0.5 },
};
const PENSION = { none: 0, onp: 0.13, afp: 0.1137 };

/* Remuneración computable básica: sueldo + asignación familiar + promedio de variables */
function baseRemuneration(v) {
    const rmv = parseNum(v.rmv) || PE.RMV;
    const af = v.af ? rmv * 0.10 : 0;
    const sueldo = parseNum(v.sueldo);
    const variable = parseNum(v.variable);
    return { sueldo, af, variable, rmv, total: sueldo + af + variable };
}
function regimen(v) { return REGIMEN[v.regimen] || REGIMEN.general; }
function monthIndex(d) { return d.getFullYear() * 12 + d.getMonth(); }
function firstOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function lastOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function mdText(md) { return [md.months ? plural(md.months, "mes", "meses") : "", md.days ? plural(md.days, "día", "días") : ""].filter(Boolean).join(" y ") || "0 días"; }

/** Meses calendario completos laborados entre start y end (ambos inclusive). */
function fullMonths(start, end) {
    if (!start || !end || end < start) return 0;
    const s = start.getDate() === 1 ? start : addMonths(firstOfMonth(start), 1);
    const e = end.getDate() === lastOfMonth(end).getDate() ? end : addDays(firstOfMonth(end), -1);
    return Math.max(0, monthIndex(e) - monthIndex(s) + 1);
}

function setResult(html, footnote) {
    $("#calc-result").innerHTML = html;
    const fn = $("#calc-note");
    if (fn) { fn.innerHTML = footnote || ""; show(fn, !!footnote); }
}
function fillRmvHints() {
    $$("[data-rmv-hint]").forEach(el => {
        const rmv = parseNum(($("#rmv") || {}).value) || PE.RMV;
        el.textContent = `(10 % de la RMV: ${fmtMoney(rmv * 0.1)})`;
    });
}

/* =========================================
   CTS
   ========================================= */
function ctsPeriods(today = new Date()) {
    const out = [];
    for (let y = today.getFullYear() - 1; y <= today.getFullYear() + 1; y++) {
        out.push({ value: `${y}-05`, label: `Mayo ${y} (nov. ${y - 1} – abr. ${y})`, start: new Date(y - 1, 10, 1), end: new Date(y, 3, 30), deposit: new Date(y, 4, 15) });
        out.push({ value: `${y}-11`, label: `Noviembre ${y} (may. – oct. ${y})`, start: new Date(y, 4, 1), end: new Date(y, 9, 31), deposit: new Date(y, 10, 15) });
    }
    return out.filter(p => daysBetween(today, p.deposit) > -400 && daysBetween(today, p.deposit) < 200);
}
function initCts() {
    const sel = $("#periodo");
    const periods = ctsPeriods();
    const today = new Date();
    const next = periods.find(p => daysBetween(today, p.deposit) >= -20) || periods[periods.length - 1];
    sel.innerHTML = periods.map(p => `<option value="${p.value}"${p === next ? " selected" : ""}>${p.label}</option>`).join("");
    liveForm($("#calc-form"), () => {
        fillRmvHints();
        const v = formValues($("#calc-form"));
        const r = regimen(v);
        const base = baseRemuneration(v);
        const p = periods.find(x => x.value === v.periodo);
        if (!base.sueldo) { setResult(`<p class="hint">Ingrese su sueldo para calcular.</p>`); return; }
        const ingreso = parseDate(v.ingreso);
        const start = ingreso && ingreso > p.start ? ingreso : p.start;
        if (start > p.end) { setResult(`<div class="status is-warn"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>Ingresó después de este período: su primera CTS corresponde al siguiente depósito.</span></div>`); return; }
        const md = monthsAndDays(start, p.end);
        const grati = v.grati !== "" ? parseNum(v.grati) : base.total * r.grati;
        const rc = base.total + grati / 6;
        const byMonths = rc / 12 * md.months, byDays = rc / 360 * md.days;
        const cts = (byMonths + byDays) * r.cts;
        const noMonth = md.months < 1;
        setResult(
            bigTotal("CTS a depositar", fmtMoney(noMonth ? 0 : cts), `Depósito hasta el 15 de ${v.periodo.endsWith("05") ? "mayo" : "noviembre"} · ${r.label}`) +
            `<div class="result-list">${resultRows([
                ["Sueldo básico", fmtMoney(base.sueldo)],
                ["Asignación familiar", fmtMoney(base.af)],
                ["Promedio de variables", fmtMoney(base.variable)],
                ["1/6 de la gratificación", fmtMoney(grati / 6)],
                ["Remuneración computable", fmtMoney(rc), "is-sub"],
                ["Tiempo computable", mdText(md)],
                [`Por ${plural(md.months, "mes", "meses")} (RC ÷ 12 × meses)`, fmtMoney(byMonths)],
                [`Por ${plural(md.days, "día", "días")} (RC ÷ 360 × días)`, fmtMoney(byDays)],
                r.cts !== 1 ? [`Ajuste ${r.label}`, r.cts ? "50 %" : "No corresponde"] : null,
            ].filter(Boolean))}</div>`,
            noMonth ? "Para tener derecho a CTS se requiere al menos un mes completo de servicios en el período." :
                r.cts === 0 ? "En la microempresa (REMYPE) los trabajadores no tienen derecho a CTS." :
                    "La CTS no está afecta a descuentos de AFP/ONP ni a impuesto a la renta.");
    });
}

/* =========================================
   GRATIFICACIÓN
   ========================================= */
function gratiPeriods(today = new Date()) {
    const y = today.getFullYear();
    const out = [];
    for (let yy = y - 1; yy <= y + 1; yy++) {
        out.push({ value: `${yy}-07`, label: `Fiestas Patrias · julio ${yy} (ene. – jun.)`, start: new Date(yy, 0, 1), end: new Date(yy, 5, 30), pay: new Date(yy, 6, 15) });
        out.push({ value: `${yy}-12`, label: `Navidad · diciembre ${yy} (jul. – dic.)`, start: new Date(yy, 6, 1), end: new Date(yy, 11, 31), pay: new Date(yy, 11, 15) });
    }
    return out.filter(p => daysBetween(today, p.pay) > -400 && daysBetween(today, p.pay) < 250);
}
function initGratificacion() {
    const sel = $("#periodo");
    const periods = gratiPeriods();
    const today = new Date();
    const next = periods.find(p => daysBetween(today, p.pay) >= -15) || periods[periods.length - 1];
    sel.innerHTML = periods.map(p => `<option value="${p.value}"${p === next ? " selected" : ""}>${p.label}</option>`).join("");
    liveForm($("#calc-form"), () => {
        fillRmvHints();
        const v = formValues($("#calc-form"));
        const r = regimen(v);
        const base = baseRemuneration(v);
        const p = periods.find(x => x.value === v.periodo);
        if (!base.sueldo) { setResult(`<p class="hint">Ingrese su sueldo para calcular.</p>`); return; }
        const ingreso = parseDate(v.ingreso);
        const months = fullMonths(ingreso && ingreso > p.start ? ingreso : p.start, p.end);
        const grati = base.total * months / 6 * r.grati;
        const rate = v.seguro === "eps" ? 0.0675 : 0.09;
        const bono = grati * rate;
        setResult(
            bigTotal("Total a recibir", fmtMoney(grati + bono), `Pago hasta el 15 de ${v.periodo.endsWith("07") ? "julio" : "diciembre"} · ${r.label}`) +
            `<div class="result-list">${resultRows([
                ["Remuneración computable", fmtMoney(base.total)],
                ["Meses completos en el semestre", `${months} de 6`],
                [`Gratificación (RC × ${months} ÷ 6${r.grati === 0.5 ? " × 50 %" : ""})`, fmtMoney(grati)],
                [`Bonificación extraordinaria (${v.seguro === "eps" ? "6,75 % EPS" : "9 % EsSalud"})`, fmtMoney(bono)],
            ])}</div>`,
            r.grati === 0 ? "En la microempresa (REMYPE) no corresponde gratificación." :
                "La gratificación y la bonificación no tienen descuento de AFP/ONP (Ley 30334). Solo se cuentan meses calendario completos; los días sueltos no suman.");
    });
}

/* =========================================
   LIQUIDACIÓN (beneficios sociales)
   ========================================= */
function initLiquidacion() {
    const t = new Date();
    const cese = $("#cese");
    if (cese && !cese.value) cese.value = isoDate(t);
    liveForm($("#calc-form"), () => {
        fillRmvHints();
        const v = formValues($("#calc-form"));
        const r = regimen(v);
        const base = baseRemuneration(v);
        const ingreso = parseDate(v.ingreso), fin = parseDate(v.cese);
        if (!base.sueldo || !ingreso || !fin) { setResult(`<p class="hint">Ingrese su sueldo, fecha de ingreso y fecha de cese.</p>`); return; }
        if (fin < ingreso) { setResult(`<div class="status is-error"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i><span>La fecha de cese no puede ser anterior a la de ingreso.</span></div>`); return; }
        const rc = base.total;
        const service = monthsAndDays(ingreso, fin);
        const rows = [];
        let total = 0, afecto = 0;

        // 1) CTS trunca: desde el último período (1 de mayo o 1 de noviembre)
        const m = fin.getMonth();
        const ctsStart = m >= 4 && m <= 9 ? new Date(fin.getFullYear(), 4, 1) : new Date(m >= 10 ? fin.getFullYear() : fin.getFullYear() - 1, 10, 1);
        const ctsMd = monthsAndDays(ingreso > ctsStart ? ingreso : ctsStart, fin);
        const gratiRecibida = v.grati !== "" ? parseNum(v.grati) : rc * r.grati;
        const rcCts = rc + gratiRecibida / 6;
        const cts = service.months >= 1 ? (rcCts / 12 * ctsMd.months + rcCts / 360 * ctsMd.days) * r.cts : 0;
        rows.push([`CTS trunca (${mdText(ctsMd)})`, fmtMoney(cts)]);
        total += cts;

        // 2) Gratificación trunca + bonificación
        const semStart = new Date(fin.getFullYear(), fin.getMonth() < 6 ? 0 : 6, 1);
        const gMonths = fullMonths(ingreso > semStart ? ingreso : semStart, fin);
        const grati = rc * gMonths / 6 * r.grati;
        const bono = grati * (v.seguro === "eps" ? 0.0675 : 0.09);
        rows.push([`Gratificación trunca (${plural(gMonths, "mes", "meses")})`, fmtMoney(grati)]);
        rows.push([`Bonificación extraordinaria (${v.seguro === "eps" ? "6,75" : "9"} %)`, fmtMoney(bono)]);
        total += grati + bono;

        // 3) Vacaciones truncas: desde el último aniversario
        let anniv = new Date(ingreso);
        while (addMonths(anniv, 12) <= fin) anniv = addMonths(anniv, 12);
        const vacMd = monthsAndDays(anniv, fin);
        const vac = service.months >= 1 ? (rc / 12 * vacMd.months + rc / 360 * vacMd.days) * r.vac : 0;
        rows.push([`Vacaciones truncas (${mdText(vacMd)})`, fmtMoney(vac)]);
        total += vac; afecto += vac;

        // 4) Vacaciones pendientes de años anteriores
        const pendDays = parseNum(v.vacpend);
        if (pendDays > 0) {
            const vp = rc / 30 * pendDays;
            rows.push([`Vacaciones no gozadas (${pendDays} días)`, fmtMoney(vp)]);
            total += vp; afecto += vp;
            if (v.vacvencidas) {
                rows.push(["Indemnización vacacional", fmtMoney(vp)]);
                total += vp;
            }
        }

        // 5) Indemnización por despido arbitrario
        if (v.despido) {
            const years = service.months / 12 + service.days / 360;
            let ind;
            if (v.regimen === "pequena") ind = Math.min(rc / 30 * 20 * years, rc / 30 * 120);
            else if (v.regimen === "micro") ind = Math.min(rc / 30 * 10 * years, rc / 30 * 90);
            else ind = Math.min(rc * 1.5 * years, rc * 12);
            rows.push(["Indemnización por despido arbitrario", fmtMoney(ind)]);
            total += ind;
        }

        const pens = PENSION[v.pension] || 0;
        const desc = afecto * pens;
        if (desc) rows.push([`Descuento ${v.pension === "onp" ? "ONP 13 %" : "AFP aprox. 11,37 %"} (sobre vacaciones)`, "− " + fmtMoney(desc), "is-neg"]);
        setResult(
            bigTotal("Liquidación estimada", fmtMoney(total - desc), `Tiempo de servicios: ${service.months >= 12 ? plural(Math.floor(service.months / 12), "año", "años") + ", " : ""}${mdText({ months: service.months % 12, days: service.days })}`) +
            `<div class="result-list">${resultRows([["Remuneración computable", fmtMoney(rc), "is-sub"], ...rows])}</div>`,
            "El empleador debe pagar la liquidación dentro de las 48 horas siguientes al cese. Es un cálculo referencial para el régimen laboral privado: no incluye utilidades, horas extras pendientes ni sueldo del último mes.");
    });
}

/* =========================================
   RENTA DE 5.ª CATEGORÍA / SUELDO NETO
   ========================================= */
const TRAMOS_5TA = [[5, 0.08], [20, 0.14], [35, 0.17], [45, 0.20], [Infinity, 0.30]];
function initRentaQuinta() {
    liveForm($("#calc-form"), () => {
        fillRmvHints();
        const v = formValues($("#calc-form"));
        const uit = parseNum(v.uit) || PE.UIT;
        const base = baseRemuneration(v);
        if (!base.sueldo) { setResult(`<p class="hint">Ingrese su sueldo bruto mensual para calcular.</p>`); return; }
        const monthly = base.total;
        const gratis = v.gratis ? monthly * 2 * (v.seguro === "eps" ? 1.0675 : 1.09) : 0;
        const extras = parseNum(v.bonos);
        const gross = monthly * 12 + gratis + extras;
        const ded7 = 7 * uit;
        const ded3 = Math.min(parseNum(v.ded3), 3 * uit);
        const net = Math.max(0, gross - ded7 - ded3);
        let rest = net, prev = 0, tax = 0;
        const tramoRows = [];
        for (const [lim, rate] of TRAMOS_5TA) {
            const cap = lim * uit - prev * uit;
            const part = Math.max(0, Math.min(rest, cap));
            const label = lim === Infinity ? `Más de ${prev} UIT` : prev === 0 ? `Hasta ${lim} UIT` : `Más de ${prev} hasta ${lim} UIT`;
            if (part > 0) tramoRows.push([`${label} · ${Math.round(rate * 100)} %`, fmtMoney(part * rate)]);
            tax += part * rate; rest -= part; prev = lim;
            if (rest <= 0) break;
        }
        const pens = PENSION[v.pension] || 0;
        const pensMonthly = monthly * pens;
        const taxMonthly = tax / 12;
        const netMonthly = monthly - pensMonthly - taxMonthly;
        setResult(
            bigTotal("Sueldo neto mensual aprox.", fmtMoney(netMonthly), `Retención de 5.ª promedio: ${fmtMoney(taxMonthly)} al mes`) +
            `<div class="result-list">${resultRows([
                ["Remuneración mensual", fmtMoney(monthly)],
                [`Aporte ${v.pension === "onp" ? "ONP 13 %" : v.pension === "afp" ? "AFP aprox. 11,37 %" : "de pensión"}`, "− " + fmtMoney(pensMonthly), "is-neg"],
                ["Retención 5.ª categoría (promedio)", "− " + fmtMoney(taxMonthly), "is-neg"],
                ["Ingreso bruto anual proyectado", fmtMoney(gross), "is-sub"],
                [`Deducción de 7 UIT`, "− " + fmtMoney(ded7)],
                ded3 ? ["Deducción adicional (hasta 3 UIT)", "− " + fmtMoney(ded3)] : null,
                ["Renta neta imponible", fmtMoney(net), "is-sub"],
                ...tramoRows,
                ["Impuesto anual", fmtMoney(tax), "is-sub"],
                ["Tasa efectiva sobre el bruto", gross ? `${(tax / gross * 100).toFixed(2)} %` : "0 %"],
            ].filter(Boolean))}</div>`,
            tax === 0 ? `Si su ingreso anual no supera 7 UIT (${fmtMoney(ded7)}), no paga impuesto de 5.ª categoría.` :
                "La retención real varía mes a mes (es mayor en julio y diciembre por las gratificaciones). El aporte de AFP varía según su AFP y comisión.");
    });
}

/* =========================================
   IGV
   ========================================= */
function initIgv() {
    const form = $("#calc-form");
    const rateSel = $("#tasa"), custom = $("#tasa-otra-field");
    liveForm(form, () => {
        const v = formValues(form);
        show(custom, v.tasa === "otra");
        const rate = (v.tasa === "otra" ? parseNum(v.tasaotra) : parseNum(v.tasa)) / 100;
        const amount = parseNum(v.monto);
        const sym = v.moneda === "USD" ? "US$" : "S/";
        const word = v.moneda === "USD" ? "DÓLARES AMERICANOS" : "SOLES";
        if (!amount) { setResult(`<p class="hint">Escriba un monto para calcular.</p>`); return; }
        let baseAmt, igv, total;
        if (v.modo === "quitar") { total = amount; baseAmt = amount / (1 + rate); igv = total - baseAmt; }
        else { baseAmt = amount; igv = amount * rate; total = baseAmt + igv; }
        setResult(
            bigTotal(v.modo === "quitar" ? "Valor sin IGV" : "Precio con IGV", fmtMoney(v.modo === "quitar" ? baseAmt : total, sym)) +
            `<div class="result-list">${resultRows([
                ["Valor de venta (base imponible)", fmtMoney(baseAmt, sym)],
                [`IGV (${(rate * 100).toLocaleString("es-PE")} %)`, fmtMoney(igv, sym)],
                ["Precio de venta (total)", fmtMoney(total, sym), "is-sub"],
            ])}</div>
            <p class="amount-words"><strong>SON:</strong> ${numberToWordsEs(total)} ${word}</p>
            <button type="button" class="btn btn-secondary btn-sm" id="copy-igv"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copiar resultado</button>`);
        $("#copy-igv").addEventListener("click", () => copyText(
            `Valor de venta: ${fmtMoney(baseAmt, sym)}\nIGV ${(rate * 100)}%: ${fmtMoney(igv, sym)}\nTotal: ${fmtMoney(total, sym)}\nSON: ${numberToWordsEs(total)} ${word}`));
    });
    if (rateSel) rateSel.addEventListener("change", () => { if (rateSel.value === "otra") $("#tasaotra").focus(); });
}

/* =========================================
   RUC / DNI
   ========================================= */
function rucCheckDigit(first10) {
    const w = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
    const sum = first10.split("").reduce((s, d, i) => s + Number(d) * w[i], 0);
    const dv = 11 - (sum % 11);
    return dv === 10 ? 0 : dv === 11 ? 1 : dv;
}
const RUC_TYPES = {
    "10": "Persona natural con negocio (con DNI)",
    "15": "Persona natural no domiciliada / con otros documentos",
    "16": "Persona natural (otros documentos)",
    "17": "Persona natural extranjera o con otros documentos",
    "20": "Persona jurídica (empresa)",
};
function initRuc() {
    const input = $("#ruc-input");
    const run = () => {
        const raw = input.value.replace(/\D/g, "");
        if (!raw) { setResult(`<p class="hint">Escriba un RUC de 11 dígitos o un DNI de 8 dígitos.</p>`); return; }
        if (raw.length === 8) {
            const ruc = "10" + raw + rucCheckDigit("10" + raw);
            setResult(
                bigTotal("RUC de persona natural", `<span translate="no">${ruc}</span>`, `Calculado a partir del DNI ${raw}`) +
                `<button type="button" class="btn btn-secondary btn-sm" id="copy-ruc"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copiar RUC</button>`,
                "Este es el número que SUNAT asigna si la persona tiene RUC. Que el formato sea correcto no significa que el RUC esté activo: confírmelo en la consulta RUC de SUNAT.");
            $("#copy-ruc").addEventListener("click", () => copyText(ruc));
            return;
        }
        if (raw.length !== 11) {
            setResult(`<div class="status is-warn"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i><span>Tiene ${raw.length} dígitos. El RUC tiene 11 y el DNI 8.</span></div>`);
            return;
        }
        const prefix = raw.slice(0, 2);
        const dv = rucCheckDigit(raw.slice(0, 10));
        const okDv = dv === Number(raw[10]);
        const okPrefix = !!RUC_TYPES[prefix];
        const ok = okDv && okPrefix;
        const rows = [
            ["Tipo de contribuyente", okPrefix ? RUC_TYPES[prefix] : `Prefijo «${prefix}» no válido`],
            ["Dígito verificador", okDv ? `${dv} ✓ correcto` : `Debería ser ${dv} (tiene ${raw[10]})`],
        ];
        if (prefix === "10") rows.push(["DNI del titular", raw.slice(2, 10)]);
        setResult(
            `<div class="status ${ok ? "is-ok" : "is-error"}"><i class="fa-solid ${ok ? "fa-circle-check" : "fa-circle-xmark"}" aria-hidden="true"></i><span>${ok ? "RUC con formato válido" : "RUC no válido"}: <strong translate="no">${raw}</strong></span></div>` +
            `<div class="result-list">${resultRows(rows)}</div>`,
            ok ? "El formato es correcto. Para saber si está activo y habido, consúltelo en la web de SUNAT." : "Revise que no haya un dígito cambiado: un solo error hace que el dígito verificador no coincida.");
    };
    input.addEventListener("input", run);
    $("#calc-form").addEventListener("submit", (e) => { e.preventDefault(); run(); });
    run();
}

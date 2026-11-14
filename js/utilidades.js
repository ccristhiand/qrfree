/* =========================================
   QR Free · Utilidades rápidas
   Link de WhatsApp, contador de palabras, sorteos, contraseñas,
   porcentajes y edad / días entre fechas.
   Requiere: kit.js
   ========================================= */

/* =========================================
   LINK DE WHATSAPP
   ========================================= */
function initWhatsappLink() {
    const form = $("#calc-form");
    const saved = localGet("qrfree-wa", null);
    if (saved) { $("#wa-country").value = saved.country || "51"; $("#wa-phone").value = saved.phone || ""; }
    let link = "";
    liveForm(form, () => {
        const v = formValues(form);
        let phone = String(v.phone || "").replace(/\D/g, "");
        const cc = String(v.country === "otro" ? v.ccother : v.country).replace(/\D/g, "");
        show("wa-cc-other", v.country === "otro");
        if (phone.startsWith("00")) phone = phone.slice(2);
        const full = phone.startsWith(cc) && phone.length > 9 ? phone : cc + phone.replace(/^0+/, "");
        const valid = phone.length >= 6;
        link = valid ? `https://wa.me/${full}${v.message ? "?text=" + encodeURIComponent(v.message) : ""}` : "";
        $("#wa-link").textContent = link || "https://wa.me/…";
        $("#wa-open").toggleAttribute("aria-disabled", !valid);
        $("#wa-open").href = link || "#";
        $("#wa-copy").disabled = !valid;
        $("#wa-qr").href = valid ? `/qr-whatsapp` : "/qr-whatsapp";
        setStatusBox("wa-status", valid ? "ok" : "info", valid
            ? `El enlace abrirá un chat con <strong>+${full}</strong>${v.message ? " y su mensaje ya escrito" : ""}.`
            : "Escriba el número de celular.");
        if (valid) localSet("qrfree-wa", { country: v.country, phone: v.phone });
    });
    $("#wa-copy").addEventListener("click", () => link && copyText(link, "Enlace copiado. Péguelo en su Instagram, Facebook o web."));
    $("#wa-open").addEventListener("click", (e) => { if (!link) e.preventDefault(); });
    $$("[data-wa-msg]").forEach(b => b.addEventListener("click", () => {
        $("#wa-message").value = b.dataset.waMsg;
        $("#wa-message").dispatchEvent(new Event("input", { bubbles: true }));
    }));
}

/* =========================================
   CONTADOR DE PALABRAS Y CONVERTIDOR DE TEXTO
   ========================================= */
function stripAccents(s) { return s.normalize("NFD").replace(/[̀-ͯ]/g, "").normalize("NFC"); }
const SMALL_WORDS = new Set(["a", "al", "de", "del", "el", "en", "la", "las", "los", "o", "por", "u", "un", "una", "y", "e", "con", "para", "sin", "que"]);
const TEXT_ACTIONS = {
    upper: (t) => t.toLocaleUpperCase("es"),
    lower: (t) => t.toLocaleLowerCase("es"),
    sentence: (t) => t.toLocaleLowerCase("es").replace(/(^\s*|[.!?¡¿]\s+|\n\s*)(\p{L})/gu, (m, p, c) => p + c.toLocaleUpperCase("es")),
    title: (t) => t.toLocaleLowerCase("es").replace(/\p{L}[\p{L}\p{M}'’]*/gu, (w, i) => (i > 0 && SMALL_WORDS.has(w)) ? w : w[0].toLocaleUpperCase("es") + w.slice(1)),
    spaces: (t) => t.replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim(),
    accents: (t) => stripAccents(t),
    lines: (t) => t.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim(),
};
function textStats(t) {
    const words = (t.match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}'’\-]*/gu) || []);
    const sentences = t.split(/[.!?…]+(?:\s|$)/).filter(s => /[\p{L}\p{N}]/u.test(s)).length;
    const paragraphs = t.split(/\n\s*\n/).filter(p => p.trim()).length;
    return {
        words: words.length,
        chars: [...t].length,
        noSpaces: [...t.replace(/\s/g, "")].length,
        sentences, paragraphs,
        lines: t ? t.split("\n").length : 0,
        read: words.length / 200, speak: words.length / 130,
        wordsList: words,
    };
}
function fmtMinutes(min) {
    if (min < 1 / 60) return "0 s";
    if (min < 1) return `${Math.round(min * 60)} s`;
    const m = Math.floor(min), s = Math.round((min - m) * 60);
    return s ? `${m} min ${s} s` : `${m} min`;
}
const STOP_ES = new Set("a al algo ante antes como con contra cual cuando de del desde donde e el ella ellas ellos en entre era es esa esas ese eso esos esta estas este esto estos fue ha hay la las le les lo los mas me mi mis muy ni no nos o os otra otro para pero por porque que quien se ser si sin sobre su sus también te tu tus u un una uno unos y ya yo".split(" "));
function initWordCounter() {
    const ta = $("#text-input");
    const saved = localGet("qrfree-text", "");
    if (saved && !ta.value) ta.value = saved;
    const update = () => {
        const t = ta.value;
        const s = textStats(t);
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set("st-words", fmtNum(s.words));
        set("st-chars", fmtNum(s.chars));
        set("st-nospaces", fmtNum(s.noSpaces));
        set("st-sentences", fmtNum(s.sentences));
        set("st-paragraphs", fmtNum(s.paragraphs));
        set("st-read", fmtMinutes(s.read));
        set("st-speak", fmtMinutes(s.speak));
        // Límites populares
        $$("[data-limit]").forEach(el => {
            const lim = +el.dataset.limit;
            const over = s.chars > lim;
            el.classList.toggle("is-over", over);
            $("span", el).textContent = over ? `${fmtNum(s.chars - lim)} de más` : `quedan ${fmtNum(lim - s.chars)}`;
        });
        // Palabras más usadas
        const freq = new Map();
        s.wordsList.forEach(w => { const k = w.toLocaleLowerCase("es"); if (k.length > 2 && !STOP_ES.has(k)) freq.set(k, (freq.get(k) || 0) + 1); });
        const top = [...freq].sort((a, b) => b[1] - a[1]).slice(0, 8);
        const box = $("#top-words");
        if (box) {
            box.innerHTML = top.length ? top.map(([w, n]) => `<li><span></span><strong>${n}</strong></li>`).join("") : `<li class="hint">Aparecerán al escribir.</li>`;
            $$("li span", box).forEach((el, i) => { el.textContent = top[i][0]; });
        }
        localSet("qrfree-text", t.length < 20000 ? t : "");
    };
    ta.addEventListener("input", update);
    $$("[data-text-act]").forEach(b => b.addEventListener("click", () => {
        const fn = TEXT_ACTIONS[b.dataset.textAct];
        if (!fn) return;
        ta.value = fn(ta.value);
        update();
        ta.focus();
    }));
    $("#text-copy").addEventListener("click", () => ta.value && copyText(ta.value, "Texto copiado"));
    $("#text-clear").addEventListener("click", () => { ta.value = ""; update(); ta.focus(); });
    update();
}

/* =========================================
   SORTEOS: ruleta, ganadores, equipos y número al azar
   ========================================= */
const WHEEL_COLORS = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#16a34a", "#0891b2", "#ca8a04", "#4f46e5", "#dc2626", "#0d9488"];
function namesFrom(ta) {
    return ta.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}
function initSorteo() {
    const ta = $("#names");
    const saved = localGet("qrfree-sorteo", "");
    if (saved) ta.value = saved;
    const countEl = $("#names-count");
    const canvas = $("#wheel");
    const ctx = canvas.getContext("2d");
    let angle = 0, spinning = false;

    const names = () => namesFrom(ta);
    const drawWheel = () => {
        const list = names();
        const size = canvas.width, r = size / 2;
        ctx.clearRect(0, 0, size, size);
        if (!list.length) {
            ctx.fillStyle = "#e2e8f0"; ctx.beginPath(); ctx.arc(r, r, r - 4, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#5b6b80"; ctx.font = "600 28px Inter, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText("Escriba los participantes", r, r);
            return;
        }
        const seg = (Math.PI * 2) / list.length;
        list.forEach((name, i) => {
            const a0 = angle + i * seg - Math.PI / 2;
            ctx.beginPath(); ctx.moveTo(r, r); ctx.arc(r, r, r - 4, a0, a0 + seg); ctx.closePath();
            ctx.fillStyle = WHEEL_COLORS[i % WHEEL_COLORS.length]; ctx.fill();
            ctx.strokeStyle = "#fff"; ctx.lineWidth = 3; ctx.stroke();
            ctx.save();
            ctx.translate(r, r); ctx.rotate(a0 + seg / 2);
            ctx.fillStyle = "#fff"; ctx.textAlign = "right"; ctx.textBaseline = "middle";
            const fs = Math.max(14, Math.min(30, 380 / list.length + 8));
            ctx.font = `700 ${fs}px Inter, sans-serif`;
            const label = name.length > 22 ? name.slice(0, 21) + "…" : name;
            ctx.fillText(label, r - 24, 0);
            ctx.restore();
        });
        ctx.beginPath(); ctx.arc(r, r, 26, 0, Math.PI * 2); ctx.fillStyle = "#fff"; ctx.fill();
        ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 4; ctx.stroke();
    };
    const update = () => {
        const n = names().length;
        countEl.textContent = n === 1 ? "1 participante" : `${n} participantes`;
        localSet("qrfree-sorteo", ta.value);
        if (!spinning) drawWheel();
    };
    ta.addEventListener("input", update);

    const announce = (html) => { const box = $("#sorteo-result"); box.innerHTML = html; show(box, true); };

    // Ruleta
    $("#btn-spin").addEventListener("click", () => {
        const list = names();
        if (list.length < 2) { toast("Escriba al menos 2 participantes.", "error"); ta.focus(); return; }
        if (spinning) return;
        spinning = true;
        const winner = randInt(list.length);
        const seg = (Math.PI * 2) / list.length;
        // El puntero está arriba: el centro del ganador debe quedar en el ángulo 0
        const offset = (seg * 0.15) + (randInt(1000) / 1000) * seg * 0.7; // aleatorio dentro del sector
        const target = -(winner * seg + offset);
        const turns = 6 + randInt(3);
        const start = angle;
        const norm = ((target - start) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        const end = start + norm + turns * Math.PI * 2;
        const dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 10 : 5200;
        const t0 = performance.now();
        const btn = $("#btn-spin"); btn.disabled = true;
        const frame = (now) => {
            const p = Math.min(1, (now - t0) / dur);
            angle = start + (end - start) * (1 - Math.pow(1 - p, 4));
            drawWheel();
            if (p < 1) requestAnimationFrame(frame);
            else {
                spinning = false; btn.disabled = false;
                angle = end % (Math.PI * 2);
                const name = list[winner];
                announce(`<span class="win-label">¡Ganador!</span><strong class="win-name"></strong>`);
                $("#sorteo-result .win-name").textContent = name;
                if ($("#remove-winner").checked) {
                    const lines = ta.value.split(/\r?\n/);
                    const idx = lines.findIndex(l => l.trim() === name);
                    if (idx >= 0) lines.splice(idx, 1);
                    ta.value = lines.join("\n");
                    update();
                }
            }
        };
        requestAnimationFrame(frame);
    });

    // Ganadores
    $("#btn-winners").addEventListener("click", () => {
        const list = names();
        const n = Math.max(1, parseInt($("#winners-n").value, 10) || 1);
        if (!list.length) { toast("Escriba los participantes.", "error"); ta.focus(); return; }
        if (n > list.length) { toast(`Solo hay ${list.length} participantes.`, "error"); return; }
        const picked = shuffle(list).slice(0, n);
        announce(`<span class="win-label">${n === 1 ? "Ganador" : "Ganadores"}</span><ol class="win-list"></ol>`);
        const ol = $("#sorteo-result .win-list");
        picked.forEach(p => { const li = document.createElement("li"); li.textContent = p; ol.appendChild(li); });
    });

    // Equipos
    $("#btn-teams").addEventListener("click", () => {
        const list = names();
        const n = Math.max(2, parseInt($("#teams-n").value, 10) || 2);
        if (list.length < n) { toast(`Necesita al menos ${n} participantes.`, "error"); return; }
        const mixed = shuffle(list);
        const teams = Array.from({ length: n }, () => []);
        mixed.forEach((p, i) => teams[i % n].push(p));
        announce(`<span class="win-label">${n} equipos</span><div class="teams"></div>`);
        const box = $("#sorteo-result .teams");
        teams.forEach((t, i) => {
            const div = document.createElement("div");
            div.className = "team";
            div.innerHTML = `<h3>Equipo ${i + 1}</h3><ul></ul>`;
            t.forEach(p => { const li = document.createElement("li"); li.textContent = p; $("ul", div).appendChild(li); });
            box.appendChild(div);
        });
    });

    // Número aleatorio
    $("#btn-number").addEventListener("click", () => {
        let a = parseInt($("#num-min").value, 10), b = parseInt($("#num-max").value, 10);
        if (!Number.isFinite(a) || !Number.isFinite(b)) { toast("Escriba el mínimo y el máximo.", "error"); return; }
        if (a > b) [a, b] = [b, a];
        const qty = Math.max(1, Math.min(100, parseInt($("#num-qty").value, 10) || 1));
        const range = b - a + 1;
        const noRepeat = $("#num-norepeat").checked;
        if (noRepeat && qty > range) { toast(`Solo hay ${range} números posibles.`, "error"); return; }
        const out = [];
        const used = new Set();
        while (out.length < qty) {
            const x = a + randInt(range);
            if (noRepeat && used.has(x)) continue;
            used.add(x); out.push(x);
        }
        announce(`<span class="win-label">${qty === 1 ? "Número" : "Números"}</span><strong class="win-name">${out.join(" · ")}</strong>`);
    });

    $("#btn-shuffle").addEventListener("click", () => { ta.value = shuffle(names()).join("\n"); update(); });
    $("#btn-names-clear").addEventListener("click", () => { ta.value = ""; update(); ta.focus(); });
    update();
}

/* =========================================
   GENERADOR DE CONTRASEÑAS
   ========================================= */
const PW_SETS = {
    lower: "abcdefghijkmnopqrstuvwxyz" + "l",
    upper: "ABCDEFGHJKLMNPQRSTUVWXYZ" + "IO",
    digits: "23456789" + "01",
    symbols: "!@#$%&*?-_=+.:;",
};
const AMBIGUOUS = /[lIO01]/g;
function makePassword(len, opts) {
    const sets = Object.keys(PW_SETS).filter(k => opts[k]).map(k => opts.noAmbiguous ? PW_SETS[k].replace(AMBIGUOUS, "") : PW_SETS[k]);
    if (!sets.length) return "";
    const all = sets.join("");
    // Garantiza al menos un carácter de cada tipo elegido
    const chars = sets.map(s => s[randInt(s.length)]);
    while (chars.length < len) chars.push(all[randInt(all.length)]);
    return shuffle(chars).join("");
}
function passwordStrength(len, opts) {
    const pool = Object.keys(PW_SETS).filter(k => opts[k]).reduce((s, k) => s + (opts.noAmbiguous ? PW_SETS[k].replace(AMBIGUOUS, "") : PW_SETS[k]).length, 0);
    const bits = pool ? len * Math.log2(pool) : 0;
    if (bits < 45) return { bits, label: "Débil", cls: "is-weak", pct: 25 };
    if (bits < 65) return { bits, label: "Aceptable", cls: "is-fair", pct: 50 };
    if (bits < 90) return { bits, label: "Fuerte", cls: "is-good", pct: 78 };
    return { bits, label: "Muy fuerte", cls: "is-great", pct: 100 };
}
function initPasswords() {
    const form = $("#calc-form");
    const out = $("#pw-output"), lenOut = $("#pw-len-out");
    const gen = () => {
        const v = formValues(form);
        const len = parseInt(v.length, 10) || 16;
        lenOut.textContent = len;
        const opts = { lower: v.lower, upper: v.upper, digits: v.digits, symbols: v.symbols, noAmbiguous: v.noambiguous };
        if (!opts.lower && !opts.upper && !opts.digits && !opts.symbols) { out.value = ""; toast("Elija al menos un tipo de carácter.", "error"); return; }
        out.value = makePassword(len, opts);
        const st = passwordStrength(len, opts);
        const meter = $("#pw-meter");
        meter.className = `pw-meter ${st.cls}`;
        $(".pw-meter-fill", meter).style.width = st.pct + "%";
        $("#pw-strength").textContent = `${st.label} · ${Math.round(st.bits)} bits de entropía`;
        const list = $("#pw-list");
        list.innerHTML = "";
        for (let i = 0; i < 5; i++) {
            const pw = makePassword(len, opts);
            const li = document.createElement("li");
            li.innerHTML = `<code translate="no"></code><button type="button" class="icon-btn" aria-label="Copiar"><i class="fa-regular fa-copy" aria-hidden="true"></i></button>`;
            $("code", li).textContent = pw;
            $("button", li).addEventListener("click", () => copyText(pw, "Contraseña copiada"));
            list.appendChild(li);
        }
    };
    form.addEventListener("input", gen);
    form.addEventListener("change", gen);
    form.addEventListener("submit", (e) => { e.preventDefault(); gen(); });
    $("#pw-regen").addEventListener("click", gen);
    $("#pw-copy").addEventListener("click", () => out.value && copyText(out.value, "Contraseña copiada"));
    gen();
}

/* =========================================
   CALCULADORA DE PORCENTAJES
   ========================================= */
function fmtSmart(n) {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString("es-PE", { maximumFractionDigits: Math.abs(n) < 1 ? 4 : 2 });
}
function initPercent() {
    const calcs = {
        of: (a, b) => [`${fmtSmart(a)} % de ${fmtSmart(b)} es`, fmtSmart(a / 100 * b)],
        what: (a, b) => [`${fmtSmart(a)} es el`, b ? fmtSmart(a / b * 100) + " %" : "—", ` de ${fmtSmart(b)}`],
        change: (a, b) => {
            if (!a) return ["Variación", "—"];
            const p = (b - a) / Math.abs(a) * 100;
            return [p >= 0 ? "Aumentó" : "Disminuyó", fmtSmart(Math.abs(p)) + " %", ` (${p >= 0 ? "+" : "−"}${fmtSmart(Math.abs(b - a))})`];
        },
        discount: (a, b) => [`Con ${fmtSmart(b)} % de descuento paga`, fmtSmart(a * (1 - b / 100)), ` (ahorra ${fmtSmart(a * b / 100)})`],
        increase: (a, b) => [`Con ${fmtSmart(b)} % más queda en`, fmtSmart(a * (1 + b / 100)), ` (+${fmtSmart(a * b / 100)})`],
        reverse: (a, b) => [`Si ${fmtSmart(a)} es el ${fmtSmart(b)} %, el total es`, b ? fmtSmart(a / b * 100) : "—"],
    };
    $$("[data-pct]").forEach(box => {
        const [ia, ib] = $$("input", box);
        const out = $(".pct-out", box);
        const run = () => {
            if (ia.value === "" || ib.value === "") { out.innerHTML = `<span class="hint">Complete ambos valores</span>`; return; }
            const [pre, val, post = ""] = calcs[box.dataset.pct](parseNum(ia.value), parseNum(ib.value));
            out.innerHTML = `<span></span> <strong></strong><span></span>`;
            const spans = $$("span", out);
            spans[0].textContent = pre; $("strong", out).textContent = val; spans[1].textContent = post;
        };
        box.addEventListener("input", run);
        run();
    });
}

/* =========================================
   EDAD Y DÍAS ENTRE FECHAS
   ========================================= */
const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
function ymdDiff(a, b) {
    let y = b.getFullYear() - a.getFullYear();
    let m = b.getMonth() - a.getMonth();
    let d = b.getDate() - a.getDate();
    if (d < 0) { m--; d += new Date(b.getFullYear(), b.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    return { y, m, d };
}
function businessDays(a, b) {
    let n = 0;
    for (let d = new Date(a); d <= b; d = addDays(d, 1)) { const w = d.getDay(); if (w !== 0 && w !== 6) n++; }
    return n;
}
function initDates() {
    const today = new Date();
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    $$("input[data-default-today]").forEach(i => { if (!i.value) i.value = isoDate(t0); });

    // Edad
    liveForm($("#age-form"), () => {
        const birth = parseDate($("#birth").value);
        const at = parseDate($("#age-at").value) || t0;
        const out = $("#age-result");
        if (!birth) { out.innerHTML = `<p class="hint">Elija la fecha de nacimiento.</p>`; return; }
        if (birth > at) { out.innerHTML = `<div class="status is-warn"><i class="fa-solid fa-circle-info" aria-hidden="true"></i><span>La fecha de nacimiento es posterior a la fecha de cálculo.</span></div>`; return; }
        const { y, m, d } = ymdDiff(birth, at);
        const days = daysBetween(birth, at);
        let next = new Date(at.getFullYear(), birth.getMonth(), birth.getDate());
        if (next < at) next = new Date(at.getFullYear() + 1, birth.getMonth(), birth.getDate());
        const toNext = daysBetween(at, next);
        out.innerHTML = bigTotal("Edad", `${plural(y, "año", "años")}`, `${plural(m, "mes", "meses")} y ${plural(d, "día", "días")}`) +
            `<div class="result-list">${resultRows([
                ["Nació un", WEEKDAYS[birth.getDay()]],
                ["Meses vividos", fmtNum(y * 12 + m)],
                ["Semanas vividas", fmtNum(Math.floor(days / 7))],
                ["Días vividos", fmtNum(days)],
                ["Próximo cumpleaños", toNext === 0 ? "¡Hoy! 🎂" : `en ${plural(toNext, "día", "días")} (${WEEKDAYS[next.getDay()]})`],
            ])}</div>`;
    });

    // Días entre fechas
    liveForm($("#diff-form"), () => {
        const a = parseDate($("#from").value), b = parseDate($("#to").value);
        const out = $("#diff-result");
        if (!a || !b) { out.innerHTML = `<p class="hint">Elija ambas fechas.</p>`; return; }
        const [s, e] = a <= b ? [a, b] : [b, a];
        const incl = $("#include-end").checked ? 1 : 0;
        const days = daysBetween(s, e) + incl;
        const { y, m, d } = ymdDiff(s, incl ? addDays(e, 1) : e);
        out.innerHTML = bigTotal("Diferencia", plural(days, "día", "días"), [y ? plural(y, "año", "años") : "", m ? plural(m, "mes", "meses") : "", d ? plural(d, "día", "días") : ""].filter(Boolean).join(", ")) +
            `<div class="result-list">${resultRows([
                ["Semanas", `${fmtNum(Math.floor(days / 7))} y ${plural(days % 7, "día", "días")}`],
                ["Días hábiles (lun. a vie.)", fmtNum(businessDays(s, incl ? e : addDays(e, -1)))],
                ["Horas", fmtNum(days * 24)],
            ])}</div>`;
    });

    // Sumar o restar días
    liveForm($("#add-form"), () => {
        const base = parseDate($("#add-base").value);
        const n = parseInt($("#add-n").value, 10) || 0;
        const unit = $("#add-unit").value;
        const sign = $("#add-op").value === "-" ? -1 : 1;
        const out = $("#add-result");
        if (!base) { out.innerHTML = `<p class="hint">Elija una fecha.</p>`; return; }
        let r;
        if (unit === "months") r = addMonths(base, sign * n);
        else if (unit === "years") r = addMonths(base, sign * n * 12);
        else if (unit === "weeks") r = addDays(base, sign * n * 7);
        else if (unit === "bdays") {
            r = new Date(base); let left = n;
            while (left > 0) { r = addDays(r, sign); if (r.getDay() !== 0 && r.getDay() !== 6) left--; }
        } else r = addDays(base, sign * n);
        out.innerHTML = bigTotal("Resultado", fmtDate(r), WEEKDAYS[r.getDay()]);
    });
}

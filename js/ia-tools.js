/* =========================================
   QR Free · Herramientas con IA en el navegador
   Quitar fondo (personas) y transcribir audios a texto.
   Requiere: kit.js, JSZip (para descargar varias). El modelo corre en /js/ia-worker.js
   ========================================= */

/* ---- Puente con el worker ---- */
let IA_WORKER = null, IA_SEQ = 0;
const IA_PENDING = new Map();
function iaWorker() {
    if (IA_WORKER) return IA_WORKER;
    IA_WORKER = new Worker("/js/ia-worker.js", { type: "module" });
    IA_WORKER.onmessage = ({ data }) => {
        const job = IA_PENDING.get(data.id);
        if (!job) return;
        if (data.type === "progress") job.onProgress && job.onProgress(data);
        else if (data.type === "status") job.onStatus && job.onStatus(data.text);
        else if (data.type === "done") { IA_PENDING.delete(data.id); job.resolve(data); }
        else if (data.type === "error") { IA_PENDING.delete(data.id); job.reject(new Error(data.message)); }
    };
    IA_WORKER.onerror = (e) => {
        IA_PENDING.forEach(j => j.reject(new Error(e.message || "No se pudo iniciar la IA en este navegador.")));
        IA_PENDING.clear();
        IA_WORKER = null;
    };
    return IA_WORKER;
}
function iaRun(payload, { onProgress, onStatus } = {}, transfer = []) {
    return new Promise((resolve, reject) => {
        const id = ++IA_SEQ;
        IA_PENDING.set(id, { resolve, reject, onProgress, onStatus });
        iaWorker().postMessage(Object.assign({ id }, payload), transfer);
    });
}
/** Barra de descarga del modelo: suma el progreso de todos sus archivos */
function modelProgress(label) {
    const files = new Map();
    return (p) => {
        if (!p.file) return;
        if (p.total) files.set(p.file, { loaded: p.status === "done" ? p.total : p.loaded, total: p.total });
        let loaded = 0, total = 0;
        files.forEach(f => { loaded += f.loaded; total += f.total; });
        if (total > 1e6 && loaded < total) setProgress("tool-progress", loaded, total, `${label}: ${fmtBytes(loaded)} de ${fmtBytes(total)} (solo la primera vez)`);
    };
}
function iaSupported() {
    return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined";
}

/* =========================================
   QUITAR FONDO
   ========================================= */
function initRemoveBg() {
    const items = [];
    const grid = $("#bg-results"), btn = $("#btn-run"), status = $("#tool-status"), zipBtn = $("#btn-zip");
    const MAX = 2048;

    const opts = () => ({ mode: radioValue("bg-mode") || "transparent", color: $("#bg-color").value });
    const syncOpts = () => {
        show("bg-color-field", opts().mode === "color");
        items.forEach(it => it.mask && paint(it));
    };
    $$('input[name="bg-mode"]').forEach(r => r.addEventListener("change", syncOpts));
    $("#bg-color").addEventListener("input", syncOpts);
    $$("[data-bg-color]").forEach(b => b.addEventListener("click", () => {
        $('input[name="bg-mode"][value="color"]').checked = true;
        $("#bg-color").value = b.dataset.bgColor;
        $("#bg-color").dispatchEvent(new Event("input"));
    }));

    const refresh = () => {
        const pending = items.filter(it => !it.mask && !it.error).length;
        btn.disabled = !pending;
        show(zipBtn, items.filter(it => it.mask).length > 1);
        if (!items.length) setStatusBox(status, "info", "Agregue fotos de personas: retratos, selfies o fotos de cuerpo entero.");
        else if (pending) setStatusBox(status, "info", `${pending} foto(s) listas. Pulse <strong>Quitar fondo</strong>.`);
    };

    initMultiDropzone($("#tool-drop"), $("#tool-input"), async (files) => {
        for (const f of files) {
            if (isHeic(f)) { toast(`«${f.name}» es HEIC: conviértalo primero en /heic-a-jpg`, "error"); continue; }
            try {
                const bmp = await loadBitmap(f);
                const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
                const src = document.createElement("canvas");
                src.width = Math.round(bmp.width * k); src.height = Math.round(bmp.height * k);
                src.getContext("2d").drawImage(bmp, 0, 0, src.width, src.height);
                if (bmp.close) bmp.close();
                const it = { name: f.name, src, mask: null };
                items.push(it);
                addCard(it);
            } catch (e) { toast(`No se pudo abrir «${f.name}».`, "error"); }
        }
        refresh();
    }, isImage);

    function addCard(it) {
        const card = document.createElement("figure");
        card.className = "bg-card";
        card.innerHTML = `<div class="checker"><canvas></canvas><span class="bg-badge">Original</span></div>
            <figcaption><span class="bg-name"></span>
            <span class="bg-actions"><button type="button" class="btn btn-secondary btn-sm" data-dl disabled><i class="fa-solid fa-download" aria-hidden="true"></i> Descargar</button>
            <button type="button" class="icon-btn icon-btn-danger" data-del aria-label="Quitar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></span></figcaption>`;
        $(".bg-name", card).textContent = it.name;
        const c = $("canvas", card);
        c.width = it.src.width; c.height = it.src.height;
        c.getContext("2d").drawImage(it.src, 0, 0);
        it.card = card; it.canvas = c;
        $("[data-dl]", card).addEventListener("click", () => download(it));
        $("[data-del]", card).addEventListener("click", () => { items.splice(items.indexOf(it), 1); card.remove(); refresh(); });
        grid.appendChild(card);
        show(grid, true);
    }

    function compose(it, o = opts()) {
        const { width: w, height: h } = it.src;
        const out = document.createElement("canvas");
        out.width = w; out.height = h;
        const ctx = out.getContext("2d");
        if (o.mode === "white" || o.mode === "color") { ctx.fillStyle = o.mode === "white" ? "#ffffff" : o.color; ctx.fillRect(0, 0, w, h); }
        if (o.mode === "blur") {
            ctx.filter = `blur(${Math.max(6, Math.round(Math.max(w, h) / 120))}px)`;
            ctx.drawImage(it.src, 0, 0);
            ctx.filter = "none";
        }
        const fg = document.createElement("canvas");
        fg.width = w; fg.height = h;
        const fctx = fg.getContext("2d");
        fctx.drawImage(it.src, 0, 0);
        const img = fctx.getImageData(0, 0, w, h);
        for (let i = 0, j = 3; i < it.mask.length; i++, j += 4) img.data[j] = it.mask[i];
        fctx.putImageData(img, 0, 0);
        ctx.drawImage(fg, 0, 0);
        return out;
    }
    function paint(it) {
        const out = compose(it);
        const ctx = it.canvas.getContext("2d");
        ctx.clearRect(0, 0, it.canvas.width, it.canvas.height);
        ctx.drawImage(out, 0, 0);
        $(".bg-badge", it.card).textContent = "Sin fondo";
        $("[data-dl]", it.card).disabled = false;
    }
    async function blobOf(it) {
        const o = opts();
        const png = o.mode === "transparent";
        const blob = await canvasToBlob(compose(it, o), png ? "image/png" : "image/jpeg", 0.92);
        return { blob, name: `${sanitizeFilename(baseName(it.name)) || "foto"}_sin_fondo.${png ? "png" : "jpg"}` };
    }
    async function download(it) { const f = await blobOf(it); triggerDownload(f.blob, f.name); afterDownload(); }

    btn.addEventListener("click", async () => {
        if (!iaSupported()) { setStatusBox(status, "error", "Su navegador no puede ejecutar la IA. Pruebe con Chrome, Edge o Firefox actualizados."); return; }
        setBusy(btn, true, "Procesando…");
        const todo = items.filter(it => !it.mask && !it.error);
        let n = 0;
        for (const it of todo) {
            n++;
            setStatusBox(status, "info", `Foto ${n} de ${todo.length}: preparando la IA…`);
            it.card.classList.add("is-working");
            try {
                const blob = await canvasToBlob(it.src, "image/png");
                const res = await iaRun({ type: "bg", blob }, {
                    onProgress: modelProgress("Descargando la IA"),
                    onStatus: (t) => { setProgress("tool-progress", 0, 0); setStatusBox(status, "info", `Foto ${n} de ${todo.length}: ${t}`); },
                });
                it.mask = res.mask;
                paint(it);
            } catch (err) {
                console.error(err);
                it.error = true;
                setStatusBox(status, "error", `No se pudo procesar «${escapeHtml(it.name)}». ${/fetch|network|Failed/i.test(err.message) ? "Revise su conexión: la primera vez se descarga la IA." : ""}`);
            }
            it.card.classList.remove("is-working");
        }
        setProgress("tool-progress", 0, 0);
        setBusy(btn, false);
        const ok = items.filter(it => it.mask).length;
        if (ok) setStatusBox(status, "ok", `¡Listo! ${ok} foto(s) sin fondo. Elija el fondo y descargue.`);
        refresh();
        if (ok === 1 && todo.length === 1 && todo[0].mask) { /* el usuario elige fondo antes de descargar */ }
    });
    zipBtn.addEventListener("click", async () => {
        const files = [];
        for (const it of items.filter(i => i.mask)) files.push(await blobOf(it));
        downloadMany(files, "fotos_sin_fondo.zip");
    });
    syncOpts();
    refresh();
}

/* =========================================
   TRANSCRIBIR AUDIO A TEXTO
   ========================================= */
const ASR_MODELS = {
    rapido: { id: "onnx-community/whisper-tiny", label: "Rápido", size: "≈ 40 MB" },
    preciso: { id: "onnx-community/whisper-base", label: "Preciso", size: "≈ 80 MB" },
    max: { id: "onnx-community/whisper-small", label: "Máxima precisión", size: "≈ 250 MB" },
};
async function decodeAudio16k(file) {
    const buf = await file.arrayBuffer();
    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    let audio;
    try {
        audio = await new Promise((res, rej) => {
            const p = ctx.decodeAudioData(buf.slice(0), res, rej);
            if (p && p.then) p.then(res, rej);
        });
    } finally { if (ctx.close) ctx.close(); }
    const frames = Math.ceil(audio.duration * 16000);
    const off = new OfflineAudioContext(1, Math.max(1, frames), 16000);
    const src = off.createBufferSource();
    src.buffer = audio;
    src.connect(off.destination);
    src.start();
    const rendered = await off.startRendering();
    // Copia propia: el búfer de un AudioBuffer no siempre se puede transferir al worker
    return { data: new Float32Array(rendered.getChannelData(0)), duration: audio.duration };
}
function fmtTime(s, srt = false) {
    s = Math.max(0, s || 0);
    const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = Math.floor(s % 60), ms = Math.round((s % 1) * 1000);
    if (srt) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
    return `${h ? h + ":" + String(m).padStart(2, "0") : m}:${String(sec).padStart(2, "0")}`;
}
function toSrt(chunks) {
    return chunks.map((c, i) => `${i + 1}\n${fmtTime(c.timestamp[0], true)} --> ${fmtTime(c.timestamp[1] ?? c.timestamp[0] + 3, true)}\n${c.text.trim()}\n`).join("\n");
}
function initTranscribe() {
    const queue = [];
    const btn = $("#btn-run"), status = $("#tool-status"), out = $("#asr-results");
    let recorder = null, chunksRec = [], recStart = 0, recTimer = null;

    const refresh = () => {
        const pending = queue.filter(q => !q.done).length;
        btn.disabled = !pending;
        if (!queue.length) setStatusBox(status, "info", "Agregue un audio de WhatsApp, una nota de voz o grabe con el micrófono.");
        else if (pending) setStatusBox(status, "info", `${pending} audio(s) en espera. Pulse <strong>Transcribir</strong>.`);
    };
    const addFile = (file) => {
        const it = { file, name: file.name || "grabacion.webm" };
        queue.push(it);
        const card = document.createElement("article");
        card.className = "asr-card";
        card.innerHTML = `<header><i class="fa-solid fa-microphone-lines" aria-hidden="true"></i><strong></strong><span class="hint">En espera</span>
            <button type="button" class="icon-btn icon-btn-danger" aria-label="Quitar"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></header>
            <audio controls preload="none"></audio>
            <div class="asr-body" hidden>
                <textarea rows="6" aria-label="Transcripción" spellcheck="true"></textarea>
                <div class="btn-row">
                    <button type="button" class="btn btn-secondary btn-sm" data-copy><i class="fa-regular fa-copy" aria-hidden="true"></i> Copiar</button>
                    <button type="button" class="btn btn-secondary btn-sm" data-txt><i class="fa-solid fa-file-lines" aria-hidden="true"></i> .txt</button>
                    <button type="button" class="btn btn-secondary btn-sm" data-srt><i class="fa-solid fa-closed-captioning" aria-hidden="true"></i> Subtítulos .srt</button>
                    <button type="button" class="btn btn-ghost btn-sm" data-times><i class="fa-regular fa-clock" aria-hidden="true"></i> Con tiempos</button>
                </div>
            </div>`;
        $("strong", card).textContent = it.name;
        const url = URL.createObjectURL(file);
        $("audio", card).src = url;
        $("header button", card).addEventListener("click", () => { queue.splice(queue.indexOf(it), 1); card.remove(); URL.revokeObjectURL(url); refresh(); });
        const ta = $("textarea", card);
        $("[data-copy]", card).addEventListener("click", () => copyText(ta.value, "Transcripción copiada"));
        const base = sanitizeFilename(baseName(it.name)) || "transcripcion";
        $("[data-txt]", card).addEventListener("click", () => { triggerDownload(new Blob([ta.value], { type: "text/plain;charset=utf-8" }), `${base}.txt`); afterDownload(); });
        $("[data-srt]", card).addEventListener("click", () => { triggerDownload(new Blob([toSrt(it.chunks || [])], { type: "application/x-subrip;charset=utf-8" }), `${base}.srt`); afterDownload(); });
        $("[data-times]", card).addEventListener("click", (e) => {
            it.withTimes = !it.withTimes;
            e.currentTarget.setAttribute("aria-pressed", String(it.withTimes));
            ta.value = it.withTimes ? (it.chunks || []).map(c => `[${fmtTime(c.timestamp[0])}] ${c.text.trim()}`).join("\n") : it.text;
        });
        it.card = card;
        out.prepend(card);
        show(out, true);
        refresh();
    };

    initMultiDropzone($("#tool-drop"), $("#tool-input"), (files) => files.forEach(addFile),
        (f) => /^(audio|video)\//.test(f.type) || /\.(opus|ogg|oga|m4a|mp3|wav|aac|webm|mp4|amr|flac)$/i.test(f.name));

    // Grabar con el micrófono
    const recBtn = $("#btn-record");
    if (!navigator.mediaDevices || !window.MediaRecorder) { recBtn.hidden = true; }
    recBtn.addEventListener("click", async () => {
        if (recorder && recorder.state === "recording") { recorder.stop(); return; }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            recorder = new MediaRecorder(stream);
            chunksRec = [];
            recorder.ondataavailable = (e) => e.data.size && chunksRec.push(e.data);
            recorder.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                clearInterval(recTimer);
                recBtn.classList.remove("is-recording");
                recBtn.innerHTML = `<i class="fa-solid fa-microphone" aria-hidden="true"></i> Grabar con el micrófono`;
                const type = recorder.mimeType || "audio/webm";
                const ext = /mp4/.test(type) ? "m4a" : /ogg/.test(type) ? "ogg" : "webm";
                addFile(new File(chunksRec, `grabacion_${new Date().toTimeString().slice(0, 5).replace(":", "-")}.${ext}`, { type }));
            };
            recorder.start();
            recStart = Date.now();
            recBtn.classList.add("is-recording");
            const tick = () => { recBtn.innerHTML = `<i class="fa-solid fa-stop" aria-hidden="true"></i> Detener · ${fmtTime((Date.now() - recStart) / 1000)}`; };
            tick(); recTimer = setInterval(tick, 500);
        } catch (e) {
            toast("No se pudo usar el micrófono. Revise el permiso del navegador.", "error");
        }
    });

    btn.addEventListener("click", async () => {
        if (!iaSupported()) { setStatusBox(status, "error", "Su navegador no puede ejecutar la IA. Pruebe con Chrome, Edge o Firefox actualizados."); return; }
        const model = ASR_MODELS[radioValue("asr-model")] || ASR_MODELS.preciso;
        const language = $("#asr-lang").value;
        const task = $("#asr-task").checked ? "translate" : "transcribe";
        setBusy(btn, true, "Transcribiendo…");
        const todo = queue.filter(q => !q.done);
        let n = 0;
        for (const it of todo) {
            n++;
            const label = $("header .hint", it.card);
            try {
                label.textContent = "Leyendo audio…";
                const { data, duration } = await decodeAudio16k(it.file);
                label.textContent = fmtTime(duration);
                const t0 = Date.now();
                const timer = setInterval(() => setStatusBox(status, "info", `Audio ${n} de ${todo.length} (${fmtTime(duration)}): transcribiendo… ${Math.round((Date.now() - t0) / 1000)} s`), 1000);
                let res;
                try {
                    res = await iaRun({ type: "asr", audio: data, model: model.id, language, task }, {
                        onProgress: modelProgress(`Descargando la IA (${model.size})`),
                        onStatus: () => setProgress("tool-progress", 0, 0),
                    }, [data.buffer]);
                } finally { clearInterval(timer); }
                it.text = (res.text || "").trim();
                it.chunks = res.chunks;
                it.done = true;
                $("textarea", it.card).value = it.text || "(No se detectó voz en el audio)";
                show($(".asr-body", it.card), true);
                label.textContent = `${fmtTime(duration)} · listo en ${Math.round((Date.now() - t0) / 1000)} s`;
            } catch (err) {
                console.error(err);
                it.done = true;
                label.textContent = "Error";
                const decode = /decode|EncodingError|Unable/i.test(err.message);
                setStatusBox(status, "error", decode
                    ? `No se pudo leer «${escapeHtml(it.name)}». Si es un audio de WhatsApp en iPhone, pruebe desde Chrome en Android o en la computadora.`
                    : `No se pudo transcribir «${escapeHtml(it.name)}». ${/fetch|network/i.test(err.message) ? "Revise su conexión: la primera vez se descarga la IA." : escapeHtml(err.message)}`);
            }
        }
        setProgress("tool-progress", 0, 0);
        setBusy(btn, false);
        const ok = todo.filter(t => t.text !== undefined).length;
        if (ok) { setStatusBox(status, "ok", `¡Listo! ${ok} audio(s) transcritos. Revise el texto: la IA puede equivocarse con nombres propios.`); afterDownload(); }
        refresh();
    });
    refresh();
}

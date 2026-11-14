/* =========================================
   QR Free · Buscador de herramientas (Ctrl+K o /) e instalación de la app
   El índice (window.QRF_INDEX) lo genera build.py en /js/indice.js
   ========================================= */
(function () {
    const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const index = () => (window.QRF_INDEX || []).map(it => Object.assign({ _t: norm(it.t), _s: norm([it.t, it.d, it.k, it.c].join(" ")) }, it));
    let items = null, modal = null, input = null, list = null, results = [], active = 0, lastFocus = null, background = [];

    function search(q) {
        items = items || index();
        const words = norm(q).split(/\s+/).filter(Boolean);
        if (!words.length) return items.filter(it => it.p).slice(0, 10);
        return items
            .map(it => {
                if (!words.every(w => it._s.includes(w))) return null;
                let score = 0;
                words.forEach(w => {
                    if (it._t.startsWith(w)) score += 6;
                    else if (new RegExp("\\b" + w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(it._t)) score += 4;
                    else if (it._t.includes(w)) score += 2;
                    else score += 1;
                });
                return { it, score: score + (it.p ? 0.5 : 0) };
            })
            .filter(Boolean)
            .sort((a, b) => b.score - a.score)
            .slice(0, 12)
            .map(r => r.it);
    }

    function render() {
        results = search(input.value);
        active = Math.min(active, Math.max(0, results.length - 1));
        if (!results.length) {
            list.innerHTML = `<li class="cmd-empty">No encontramos «${esc(input.value)}». Pruebe con otra palabra, por ejemplo «pdf», «foto» o «sueldo».</li>`;
            input.removeAttribute("aria-activedescendant");
            return;
        }
        list.innerHTML = results.map((it, i) => `
            <li role="option" id="cmd-opt-${i}" aria-selected="${i === active}">
                <a href="${esc(it.u)}" tabindex="-1">
                    <i class="fa-solid ${esc(it.i || "fa-wand-magic-sparkles")}" aria-hidden="true"></i>
                    <span><strong>${esc(it.t)}</strong><small>${esc(it.d)}</small></span>
                    <em>${esc(it.c || "")}</em>
                </a>
            </li>`).join("");
        input.setAttribute("aria-activedescendant", `cmd-opt-${active}`);
        const el = document.getElementById(`cmd-opt-${active}`);
        if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    }

    function open() {
        if (modal) return;
        lastFocus = document.activeElement;
        modal = document.createElement("div");
        modal.className = "cmd-backdrop";
        modal.innerHTML = `
            <div class="cmd" role="dialog" aria-modal="true" aria-label="Buscar herramientas">
                <div class="cmd-input">
                    <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
                    <input type="search" placeholder="¿Qué quiere hacer? Ej.: unir pdf, quitar fondo, CTS…" aria-label="Buscar herramientas"
                        role="combobox" aria-expanded="true" aria-controls="cmd-list" aria-autocomplete="list" autocomplete="off" spellcheck="false">
                    <kbd>Esc</kbd>
                </div>
                <ul class="cmd-list" id="cmd-list" role="listbox" aria-label="Resultados"></ul>
                <p class="cmd-foot"><span><kbd>↑</kbd><kbd>↓</kbd> moverse</span><span><kbd>Enter</kbd> abrir</span><span><kbd>Ctrl</kbd><kbd>K</kbd> buscar desde cualquier página</span></p>
            </div>`;
        background = Array.from(document.querySelectorAll("body > *")).filter(el => el !== modal && !el.classList.contains("toasts"));
        background.forEach(el => el.setAttribute("inert", ""));
        document.body.appendChild(modal);
        input = modal.querySelector("input");
        list = modal.querySelector(".cmd-list");
        active = 0;
        input.addEventListener("input", () => { active = 0; render(); });
        input.addEventListener("keydown", onKey);
        modal.addEventListener("click", (e) => { if (e.target === modal) close(); });
        list.addEventListener("mousemove", (e) => {
            const li = e.target.closest("li[role=option]");
            if (!li) return;
            const i = Number(li.id.replace("cmd-opt-", ""));
            if (i !== active) { active = i; list.querySelectorAll("li[role=option]").forEach((o, j) => o.setAttribute("aria-selected", String(j === i))); input.setAttribute("aria-activedescendant", li.id); }
        });
        render();
        input.focus();
    }

    function close() {
        if (!modal) return;
        background.forEach(el => el.removeAttribute("inert"));
        modal.remove();
        modal = null;
        if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function onKey(e) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!results.length) return;
            active = (active + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
            render();
        } else if (e.key === "Enter") {
            e.preventDefault();
            const it = results[active];
            if (it) location.href = it.u;
        } else if (e.key === "Escape") {
            e.preventDefault();
            close();
        } else if (e.key === "Tab") {
            e.preventDefault(); // el foco se queda en el buscador
        }
    }

    document.addEventListener("keydown", (e) => {
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement && document.activeElement.tagName) || (document.activeElement && document.activeElement.isContentEditable);
        if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") { e.preventDefault(); modal ? close() : open(); }
        else if (e.key === "/" && !typing && !modal) { e.preventDefault(); open(); }
    });
    document.addEventListener("click", (e) => { if (e.target.closest("[data-open-search]")) { e.preventDefault(); open(); } });
    if (/Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)) {
        document.querySelectorAll(".search-btn kbd").forEach(k => { k.textContent = "⌘K"; });
    }

    /* ---- App instalable ---- */
    if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
        window.addEventListener("load", () => {
            navigator.serviceWorker.register("/sw.js").then(() => navigator.serviceWorker.ready).then(reg => {
                const assets = performance.getEntriesByType("resource").map(e => e.name).filter(u => !/googlesyndication|doubleclick|google-analytics|huggingface/.test(u));
                if (reg.active) reg.active.postMessage({ type: "cache-page", page: location.pathname, assets });
            }).catch(() => { /* sin app: el sitio funciona igual */ });
        });
    }
    let installEvent = null;
    window.addEventListener("beforeinstallprompt", (e) => {
        e.preventDefault();
        installEvent = e;
        document.querySelectorAll("[data-install]").forEach(b => b.hidden = false);
    });
    window.addEventListener("appinstalled", () => {
        installEvent = null;
        document.querySelectorAll("[data-install]").forEach(b => b.hidden = true);
        if (window.toast) window.toast("¡QR Free quedó instalado! Búsquelo entre sus apps.", "success");
    });
    document.addEventListener("click", async (e) => {
        if (!e.target.closest("[data-install]") || !installEvent) return;
        installEvent.prompt();
        try { await installEvent.userChoice; } catch (err) { /* cancelado */ }
        installEvent = null;
        document.querySelectorAll("[data-install]").forEach(b => b.hidden = true);
    });

    window.QRFSearch = { open, close, search };
})();

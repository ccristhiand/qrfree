"""
Herramientas extra de qrfre.com: PDF, imágenes, cotizaciones, calculadoras de Perú y utilidades.

Cada herramienta se define en TOOLS (textos SEO, pasos, preguntas frecuentes) y su HTML
se arma con las funciones de este archivo. build.py importa este módulo y genera las páginas.
Para agregar una herramienta: cree su función de HTML, su entrada en TOOLS y su lógica en /js/.
"""
import html

e = html.escape

# ---------------------------------------------------------------------
# Piezas de interfaz
# ---------------------------------------------------------------------
TRUST = """<p class="trust"><span><i class="fa-solid fa-lock" aria-hidden="true"></i> Sus archivos no salen de su equipo</span><span><i class="fa-solid fa-check" aria-hidden="true"></i> Sin marcas de agua</span></p>"""


def head(n, title, opt=False, hid=None):
    hid = hid or f"h-step-{n}"
    o = '\n        <span class="opt">Opcional</span>' if opt else ""
    num = f'<span class="step-num">{n}</span>\n        ' if n else ""
    return f"""<div class="card-head">
        {num}<h2 id="{hid}">{title}</h2>{o}
    </div>"""


def dropzone(icon, title, sub, accept, multiple=True):
    m = " multiple" if multiple else ""
    return f"""<div class="dropzone" id="tool-drop" role="button" tabindex="0" aria-describedby="tool-drop-sub">
    <i class="fa-solid {icon}" aria-hidden="true"></i>
    <strong>{title}</strong>
    <small id="tool-drop-sub">{sub}</small>
</div>
<input type="file" id="tool-input" accept="{accept}"{m} hidden>"""


def file_chip(icon="fa-file-pdf"):
    return f"""<div class="file-chip file-chip-doc" id="tool-chip" hidden>
    <i class="fa-solid {icon}" aria-hidden="true"></i>
    <div><strong id="tool-chip-name">archivo.pdf</strong><span id="tool-chip-meta"></span></div>
    <button type="button" class="btn btn-secondary btn-sm" id="tool-chip-remove">Cambiar</button>
</div>"""


PROGRESS = """<div class="progress" id="tool-progress" hidden>
    <div class="progress-track" role="progressbar" aria-label="Progreso" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="progress-fill"></div></div>
    <p class="progress-text" aria-live="polite"></p>
</div>"""


def run_card(n, title, button, icon, options="", extra=""):
    return f"""<section class="card" aria-labelledby="h-step-{n}">
    {head(n, title)}
{indent(options, 4)}
    <div class="status" id="tool-status" role="status"></div>
{indent(PROGRESS, 4)}
    <button type="button" class="btn btn-primary btn-lg btn-block" id="btn-run" disabled>
        <i class="fa-solid {icon}" aria-hidden="true"></i> {button}
    </button>
{indent(extra, 4)}
    {TRUST}
</section>"""


def indent(text, n):
    pad = " " * n
    return "\n".join(pad + l if l.strip() else "" for l in text.splitlines())


def tool_layout(main, aside):
    return f"""<div class="tool">
    <div class="tool-main">
{indent(main, 8)}
    </div>
    <aside class="tool-aside">
{indent(aside, 8)}
    </aside>
</div>"""


def segmented(name, label, options, checked=None, lid=None):
    lid = lid or f"lbl-{name}"
    checked = checked or options[0][0]
    opts = "".join(
        f'<label><input type="radio" name="{name}" value="{v}"{" checked" if v == checked else ""}><span>{t}{f"<small>{s}</small>" if s else ""}</span></label>'
        for v, t, s in [(o + ("",))[:3] for o in options])
    return f"""<div class="field">
    <span class="field-label" id="{lid}">{label}</span>
    <div class="segmented" role="radiogroup" aria-labelledby="{lid}">{opts}</div>
</div>"""


def select(id_, name, label, options, selected=None, hint=""):
    opts = "\n".join(f'        <option value="{v}"{" selected" if v == selected else ""}>{t}</option>' for v, t in options)
    h = f'\n    <p class="hint">{hint}</p>' if hint else ""
    return f"""<div class="field">
    <label for="{id_}">{label}</label>
    <select id="{id_}" name="{name}">
{opts}
    </select>{h}
</div>"""


def number(id_, name, label, value="", placeholder="", hint="", step="0.01", prefix="S/", attrs=""):
    v = f' value="{value}"' if value != "" else ""
    ph = f' placeholder="{placeholder}"' if placeholder else ""
    h = f'\n    <p class="hint">{hint}</p>' if hint else ""
    inp = f'<input type="number" id="{id_}" name="{name}" min="0" step="{step}" inputmode="decimal"{v}{ph}{attrs}>'
    if prefix:
        inp = f'<div class="input-prefix"><span aria-hidden="true">{prefix}</span>{inp}</div>'
    return f"""<div class="field">
    <label for="{id_}">{label}</label>
    {inp}{h}
</div>"""


def date(id_, name, label, hint="", attrs=""):
    h = f'\n    <p class="hint">{hint}</p>' if hint else ""
    return f"""<div class="field">
    <label for="{id_}">{label}</label>
    <input type="date" id="{id_}" name="{name}"{attrs}>{h}
</div>"""


def check(id_, name, label, checked=False, hint=""):
    c = " checked" if checked else ""
    h = f' <span class="hint">{hint}</span>' if hint else ""
    return f"""<label class="check" for="{id_}"><input type="checkbox" id="{id_}" name="{name}"{c}><span>{label}{h}</span></label>"""


def result_card(title="Resultado"):
    return f"""<section class="card result-card" aria-labelledby="h-result">
    {head(None, title, hid="h-result")}
    <div id="calc-result" aria-live="polite"></div>
    <p class="calc-note" id="calc-note" hidden></p>
</section>"""


# ---------------------------------------------------------------------
# PDF
# ---------------------------------------------------------------------
def ui_merge():
    main = f"""<section class="card" aria-labelledby="h-step-1">
    {head(1, "Agregue sus PDF")}
{indent(dropzone("fa-file-pdf", "Elija sus archivos PDF o arrástrelos aquí", "Puede agregar varios a la vez · Se procesan en su equipo", "application/pdf,.pdf"), 4)}
    <ul class="file-list" id="file-list" hidden></ul>
</section>"""
    return tool_layout(main, run_card(2, "Una y descargue", "Unir PDF", "fa-object-group"))


def ui_split():
    main = f"""<section class="card" aria-labelledby="h-step-1">
    {head(1, "Suba su PDF")}
{indent(dropzone("fa-file-pdf", "Elija un PDF o arrástrelo aquí", "Se procesa en su equipo: no se sube a internet", "application/pdf,.pdf", False), 4)}
{indent(file_chip(), 4)}
    <div class="page-thumbs" id="page-thumbs" hidden aria-label="Páginas: toque para seleccionar"></div>
</section>"""
    opts = f"""<div id="split-options" hidden>
{indent(segmented("split-mode", "¿Qué desea hacer?", [("extract", "Extraer", "páginas elegidas"), ("all", "Separar", "todas"), ("every", "Cada N", "páginas")]), 4)}
    <div class="field" id="split-ranges-field">
        <label for="split-ranges">Páginas a extraer</label>
        <input type="text" id="split-ranges" name="paginas" placeholder="Ej.: 1-3, 5, 8" autocomplete="off" inputmode="numeric">
        <p class="hint">Use comas y guiones, o toque las miniaturas.</p>
    </div>
    <div class="field" id="split-every-field" hidden>
        <label for="split-every">Páginas por archivo</label>
        <input type="number" id="split-every" name="cada" min="1" value="2" inputmode="numeric">
    </div>
</div>"""
    return tool_layout(main, run_card(2, "Elija y descargue", "Dividir PDF", "fa-scissors", opts))


def ui_compress():
    main = f"""<section class="card" aria-labelledby="h-step-1">
    {head(1, "Suba su PDF")}
{indent(dropzone("fa-file-pdf", "Elija un PDF o arrástrelo aquí", "Ideal para PDF escaneados o con muchas fotos", "application/pdf,.pdf", False), 4)}
{indent(file_chip(), 4)}
    <details class="help">
        <summary><i class="fa-solid fa-circle-info" aria-hidden="true"></i> ¿Cómo funciona?</summary>
        <div class="help-body"><p>Cada página se convierte en una imagen optimizada. Es lo que más reduce el peso de PDF escaneados y con fotos.
        El texto deja de ser seleccionable, así que si necesita copiar texto conserve también el original.</p></div>
    </details>
</section>"""
    opts = segmented("level", "Nivel de compresión", [("low", "Baja", "más calidad"), ("mid", "Media", "recomendada"), ("high", "Alta", "menos peso")], "mid")
    extra = """<button type="button" class="btn btn-secondary btn-block" id="btn-download" hidden>
    <i class="fa-solid fa-download" aria-hidden="true"></i> Descargar otra vez
</button>"""
    return tool_layout(main, run_card(2, "Comprima y descargue", "Comprimir PDF", "fa-compress", opts, extra))


def ui_img2pdf():
    main = f"""<section class="card" aria-labelledby="h-step-1">
    {head(1, "Agregue sus imágenes")}
{indent(dropzone("fa-images", "Elija fotos o imágenes, o arrástrelas aquí", "JPG, PNG o WebP · Una imagen por página", "image/jpeg,image/png,image/webp,image/gif,image/bmp"), 4)}
    <ul class="file-list" id="file-list" hidden></ul>
</section>"""
    opts = "\n".join([
        select("img-pagesize", "tamano", "Tamaño de página", [("a4", "A4"), ("letter", "Carta"), ("legal", "Oficio / Legal"), ("fit", "Igual a la imagen")]),
        '<div class="grid-2">',
        indent(select("img-orient", "orientacion", "Orientación", [("auto", "Automática"), ("portrait", "Vertical"), ("landscape", "Horizontal")]), 4),
        indent(select("img-margin", "margen", "Margen", [("0", "Sin margen"), ("20", "Pequeño"), ("40", "Grande")], "20"), 4),
        "</div>",
    ])
    return tool_layout(main, run_card(2, "Cree su PDF", "Convertir a PDF", "fa-file-pdf", opts))


def ui_pdf2img():
    main = f"""<section class="card" aria-labelledby="h-step-1">
    {head(1, "Suba su PDF")}
{indent(dropzone("fa-file-pdf", "Elija un PDF o arrástrelo aquí", "Cada página se convierte en una imagen", "application/pdf,.pdf", False), 4)}
{indent(file_chip(), 4)}
    <div class="page-thumbs" id="page-thumbs" hidden aria-label="Vista previa de las páginas"></div>
</section>"""
    opts = "\n".join([
        segmented("img-format", "Formato", [("jpg", "JPG", "liviano"), ("png", "PNG", "máxima nitidez")]),
        select("img-dpi", "resolucion", "Resolución", [("72", "Baja · 72 ppp (pantalla)"), ("150", "Media · 150 ppp (recomendada)"), ("300", "Alta · 300 ppp (imprimir)")], "150"),
    ])
    return tool_layout(main, run_card(2, "Convierta y descargue", "Convertir a imágenes", "fa-images", opts))


# ---------------------------------------------------------------------
# Imágenes
# ---------------------------------------------------------------------
def ui_image(mode):
    accept = "image/*,.heic,.heif" if mode == "heic" else "image/*"
    title = {"heic": "Elija sus fotos HEIC o arrástrelas aquí"}.get(mode, "Elija imágenes o arrástrelas aquí")
    sub = {"heic": "Fotos del iPhone (.heic) · Varias a la vez"}.get(mode, "JPG, PNG, WebP · Varias a la vez · No se suben a internet")
    main = f"""<section class="card" aria-labelledby="h-step-1">
    {head(1, "Agregue sus imágenes")}
{indent(dropzone("fa-images", title, sub, accept), 4)}
    <ul class="file-list" id="file-list" hidden></ul>
    <ul class="file-list file-results" id="img-results" hidden aria-label="Resultados"></ul>
</section>"""
    fmt_opts = {
        "compress": [("same", "Mismo formato"), ("jpg", "JPG"), ("webp", "WebP (más liviano)"), ("png", "PNG")],
        "resize": [("same", "Mismo formato"), ("jpg", "JPG"), ("png", "PNG"), ("webp", "WebP")],
        "convert": [("jpg", "JPG"), ("png", "PNG"), ("webp", "WebP")],
        "heic": [("jpg", "JPG"), ("png", "PNG")],
    }[mode]
    q = {"compress": "70", "resize": "90", "convert": "90", "heic": "90"}[mode]
    parts = [select("img-format", "formato", "Formato de salida", fmt_opts)]
    parts.append(f"""<div class="field" id="quality-field">
    <label for="img-quality">Calidad <output id="img-quality-out" for="img-quality" class="hint">{q} %</output></label>
    <input type="range" id="img-quality" name="calidad" min="10" max="100" step="5" value="{q}">
    <p class="hint">{"70 % reduce mucho el peso sin que se note a simple vista." if mode == "compress" else "90 % conserva casi toda la calidad."}</p>
</div>""")
    if mode == "resize":
        parts.append(segmented("resize-mode", "Cambiar tamaño", [("size", "Medidas", "en píxeles"), ("percent", "Porcentaje", "")], "size"))
        parts.append("""<div id="resize-size">
    <span class="field-label">Redes sociales y documentos</span>
    <div class="chips chips-wrap" id="img-presets" role="radiogroup" aria-label="Medidas predefinidas"></div>
    <div class="grid-2 keep">
        <div class="field">
            <label for="img-w">Ancho (px)</label>
            <input type="number" id="img-w" name="ancho" min="1" max="10000" value="1080" inputmode="numeric">
        </div>
        <div class="field">
            <label for="img-h">Alto (px)</label>
            <input type="number" id="img-h" name="alto" min="1" max="10000" placeholder="auto" inputmode="numeric">
        </div>
    </div>
    """ + check("img-keep", "proporcion", "Mantener proporción", True, "(no deforma la imagen)") + """
    <div class="field" id="fit-field" hidden>
        <label for="img-fit">Si la proporción no coincide</label>
        <select id="img-fit" name="ajuste">
            <option value="cover">Recortar al centro (llenar)</option>
            <option value="contain">Encajar con bordes de color</option>
            <option value="stretch">Estirar</option>
        </select>
        <div class="color-input"><input type="color" id="img-bg" name="fondo" value="#ffffff" aria-label="Color de los bordes"><output for="img-bg">#FFFFFF</output></div>
    </div>
</div>
<div class="field" id="resize-percent" hidden>
    <label for="img-percent">Porcentaje del tamaño original</label>
    <div class="input-prefix input-suffix"><input type="number" id="img-percent" name="porcentaje" min="1" max="400" value="50" inputmode="numeric"><span aria-hidden="true">%</span></div>
</div>""")
    elif mode in ("compress", "convert"):
        parts.append(select("img-maxw", "maximo", "Ancho máximo", [("0", "No cambiar el tamaño"), ("3840", "3840 px (4K)"), ("2560", "2560 px"), ("1920", "1920 px (Full HD)"), ("1280", "1280 px (web)"), ("1080", "1080 px (redes)"), ("800", "800 px")],
                            "1920" if mode == "compress" else "0", "Reducir las medidas es lo que más baja el peso."))
    btn = {"compress": "Comprimir imágenes", "resize": "Cambiar tamaño", "convert": "Convertir imágenes", "heic": "Convertir a JPG"}[mode]
    opts = '<form id="img-options" onsubmit="return false">\n' + indent("\n".join(parts), 4) + "\n</form>"
    extra = """<button type="button" class="btn btn-secondary btn-block" id="btn-zip" hidden>
    <i class="fa-solid fa-file-zipper" aria-hidden="true"></i> Descargar todas (ZIP)
</button>"""
    return tool_layout(main, run_card(2, "Ajuste y descargue", btn, "fa-wand-magic-sparkles", opts, extra))


# ---------------------------------------------------------------------
# Cotizaciones
# ---------------------------------------------------------------------
def ui_cotizacion():
    text = lambda id_, name, label, ph="", t="text", auto="off": f"""<div class="field">
    <label for="{id_}">{label}</label>
    <input type="{t}" id="{id_}" name="{name}" placeholder="{ph}" autocomplete="{auto}">
</div>"""
    empresa = f"""<section class="card" aria-labelledby="h-step-1">
    {head(1, "Su negocio")}
    <div class="dropzone dropzone-sm" id="logo-drop" role="button" tabindex="0">
        <i class="fa-solid fa-image" aria-hidden="true"></i>
        <strong>Suba su logo (opcional)</strong>
        <small>PNG o JPG · Queda guardado solo en este navegador</small>
    </div>
    <input type="file" id="logo-input" accept="image/*" hidden>
    <div class="file-chip" id="logo-chip" hidden>
        <img id="logo-img" alt="Logo" width="40" height="40">
        <div><strong>Logo cargado</strong><span>Aparecerá en el PDF</span></div>
        <button type="button" class="btn btn-secondary btn-sm" id="logo-remove">Quitar</button>
    </div>
    <div class="grid-2" style="margin-top:16px">
{indent(text("emp-nombre", "emp_nombre", "Nombre o razón social", "Ej.: Bodega Don Lucho", auto="organization"), 8)}
{indent(text("emp-ruc", "emp_ruc", "RUC", "20123456789"), 8)}
    </div>
{indent(text("emp-dir", "emp_dir", "Dirección", "Av. Principal 123, Lima", auto="street-address"), 4)}
    <div class="grid-2">
{indent(text("emp-tel", "emp_tel", "Teléfono / WhatsApp", "999 888 777", "tel", "tel"), 8)}
{indent(text("emp-email", "emp_email", "Correo", "ventas@minegocio.com", "email", "email"), 8)}
    </div>
    <div class="grid-2">
        <div class="field">
            <label for="q-color">Color del documento</label>
            <div class="color-input"><input type="color" id="q-color" name="color" value="#2563eb"><output for="q-color">#2563EB</output></div>
        </div>
        <div class="field field-end">
            {check("q-recordar", "recordar", "Recordar mis datos en este equipo", True)}
        </div>
    </div>
</section>"""
    doc = f"""<section class="card" aria-labelledby="h-step-2">
    {head(2, "Documento y cliente")}
    <div class="grid-3">
{indent(select("q-tipo", "tipo", "Tipo", [("cotizacion", "Cotización"), ("proforma", "Proforma"), ("nota", "Nota de venta"), ("recibo", "Recibo")]), 8)}
{indent(text("q-numero", "numero", "Número", "COT-0001"), 8)}
{indent(date("q-fecha", "fecha", "Fecha"), 8)}
    </div>
    <div class="grid-2">
        <div class="field" id="validity-field">
            <label for="q-validez">Validez de la oferta</label>
            <select id="q-validez" name="validez"><option value="7">7 días</option><option value="15" selected>15 días</option><option value="30">30 días</option><option value="0">No indicar</option></select>
        </div>
{indent(select("q-moneda", "moneda", "Moneda", [("PEN", "Soles (S/)"), ("USD", "Dólares (US$)")]), 8)}
    </div>
    <div class="grid-2">
{indent(text("cli-nombre", "cli_nombre", "Cliente", "Nombre o razón social"), 8)}
{indent(text("cli-doc", "cli_doc", "RUC o DNI del cliente", "Opcional"), 8)}
    </div>
    <div class="grid-2">
{indent(text("cli-dir", "cli_dir", "Dirección del cliente", "Opcional"), 8)}
{indent(text("cli-contacto", "cli_contacto", "Contacto", "Teléfono o correo (opcional)"), 8)}
    </div>
</section>"""
    items = f"""<section class="card" aria-labelledby="h-step-3">
    {head(3, "Productos o servicios")}
    <div class="table-wrap items-wrap">
        <table class="items-table">
            <thead><tr><th scope="col">Descripción</th><th scope="col">Cant.</th><th scope="col">P. unit.</th><th scope="col">Importe</th><th scope="col"><span class="sr-only">Quitar</span></th></tr></thead>
            <tbody id="items-body"></tbody>
        </table>
    </div>
    <button type="button" class="btn btn-secondary btn-sm" id="btn-add-item"><i class="fa-solid fa-plus" aria-hidden="true"></i> Agregar fila</button>
    <div class="grid-2" style="margin-top:16px">
{indent(select("q-igv", "igv", "IGV (18 %)", [("agregar", "Agregar IGV a los precios"), ("incluido", "Los precios ya incluyen IGV"), ("sin", "Sin IGV")]), 8)}
{indent(number("q-descuento", "descuento", "Descuento (monto)", placeholder="0.00", prefix=""), 8)}
    </div>
</section>"""
    notas = f"""<section class="card" aria-labelledby="h-step-4">
    {head(4, "Condiciones y forma de pago", True)}
    <div class="field">
        <label for="q-condiciones">Condiciones</label>
        <textarea id="q-condiciones" name="condiciones" rows="3" placeholder="Ej.: Tiempo de entrega: 3 días hábiles. Incluye instalación. Precios sujetos a stock."></textarea>
    </div>
    <div class="field">
        <label for="q-pago">Datos de pago</label>
        <textarea id="q-pago" name="pago" rows="3" placeholder="Ej.: Yape/Plin: 999 888 777 · BCP Soles: 191-12345678-0-12 · CCI: 002-191-..."></textarea>
    </div>
</section>"""
    aside = """<section class="card preview-card" aria-labelledby="h-step-5">
    <div class="card-head"><span class="step-num">5</span><h2 id="h-step-5">Descargue su PDF</h2></div>
    <div class="result-list" id="quote-totals" aria-live="polite"></div>
    <p class="amount-words" id="quote-words"></p>
    <button type="button" class="btn btn-primary btn-lg btn-block" id="btn-pdf"><i class="fa-solid fa-file-pdf" aria-hidden="true"></i> Descargar PDF</button>
    <div class="btn-row">
        <button type="button" class="btn btn-secondary" id="btn-preview"><i class="fa-solid fa-eye" aria-hidden="true"></i> Vista previa</button>
        <button type="button" class="btn btn-secondary" id="btn-wa"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Avisar</button>
    </div>
    <button type="button" class="btn btn-ghost btn-block" id="btn-new"><i class="fa-solid fa-file-circle-plus" aria-hidden="true"></i> Nuevo documento</button>
    <p class="trust"><span><i class="fa-solid fa-lock" aria-hidden="true"></i> Sus datos se quedan en su equipo</span></p>
</section>"""
    return f"""<div class="tool">
    <form class="tool-main" id="quote-form" novalidate>
{indent(empresa, 8)}
{indent(doc, 8)}
{indent(items, 8)}
{indent(notas, 8)}
    </form>
    <aside class="tool-aside">
{indent(aside, 8)}
    </aside>
</div>"""


# ---------------------------------------------------------------------
# Calculadoras de Perú
# ---------------------------------------------------------------------
REGIMEN_OPTS = [("general", "Régimen general"), ("pequena", "Pequeña empresa (REMYPE)"), ("micro", "Microempresa (REMYPE)")]
SEGURO = lambda: segmented("seguro", "Seguro de salud", [("essalud", "EsSalud", "bonificación 9 %"), ("eps", "EPS", "bonificación 6,75 %")])
RMV_FIELD = f"""<details class="help">
    <summary><i class="fa-solid fa-sliders" aria-hidden="true"></i> Valores de referencia</summary>
    <div class="help-body">
{indent(number("rmv", "rmv", "Remuneración mínima vital (RMV)", "1130", hint="Úsela para calcular la asignación familiar (10 %). Actualícela si el Gobierno la cambia."), 8)}
    </div>
</details>"""


def sueldo_fields(variable_label="Promedio de comisiones, horas extras u otros pagos regulares"):
    return "\n".join([
        number("sueldo", "sueldo", "Sueldo bruto mensual", placeholder="Ej.: 2500", attrs=" required"),
        check("af", "af", 'Recibe asignación familiar <span class="hint" data-rmv-hint></span>'),
        number("variable", "variable", variable_label, placeholder="0.00", hint="Solo si los recibe en forma regular (al menos 3 de los últimos 6 meses)."),
    ])


def calc_form(fields):
    return f"""<form class="card" id="calc-form" novalidate aria-labelledby="h-step-1">
    {head(1, "Sus datos")}
{indent(fields, 4)}
</form>"""


def ui_cts():
    f = "\n".join([
        sueldo_fields(),
        number("grati", "grati", "Última gratificación recibida", placeholder="Automático", hint="Déjelo vacío para usar una gratificación completa (julio o diciembre)."),
        select("periodo", "periodo", "Depósito de CTS", []),
        date("ingreso", "ingreso", "Fecha de ingreso (opcional)", "Solo si empezó a trabajar durante el período."),
        select("regimen", "regimen", "Régimen laboral", REGIMEN_OPTS),
        RMV_FIELD,
    ])
    return tool_layout(calc_form(f), result_card("Su CTS"))


def ui_grati():
    f = "\n".join([
        sueldo_fields(),
        select("periodo", "periodo", "Gratificación", []),
        date("ingreso", "ingreso", "Fecha de ingreso (opcional)", "Solo si empezó a trabajar durante el semestre."),
        select("regimen", "regimen", "Régimen laboral", REGIMEN_OPTS),
        SEGURO(),
        RMV_FIELD,
    ])
    return tool_layout(calc_form(f), result_card("Su gratificación"))


def ui_liquidacion():
    f = "\n".join([
        sueldo_fields(),
        '<div class="grid-2">',
        indent(date("ingreso", "ingreso", "Fecha de ingreso", attrs=" required"), 4),
        indent(date("cese", "cese", "Fecha de cese (último día)", attrs=" required"), 4),
        "</div>",
        select("regimen", "regimen", "Régimen laboral", REGIMEN_OPTS),
        SEGURO(),
        number("grati", "grati", "Última gratificación recibida", placeholder="Automático", hint="Se usa para la CTS (1/6). Déjelo vacío si recibió una gratificación completa."),
        number("vacpend", "vacpend", "Días de vacaciones pendientes de años anteriores", placeholder="0", step="1", prefix="", hint="Vacaciones de años completos que no gozó (no incluya las del año en curso)."),
        check("vacvencidas", "vacvencidas", "Esas vacaciones ya vencieron (pasó más de un año sin gozarlas)", hint="Agrega la indemnización vacacional."),
        check("despido", "despido", "Fue un despido arbitrario (sin causa justa)", hint="Agrega la indemnización por despido."),
        select("pension", "pension", "Sistema de pensiones", [("onp", "ONP (13 %)"), ("afp", "AFP (aprox. 11,37 %)"), ("none", "No aportaba")], "onp", "Solo se descuenta de las vacaciones."),
        RMV_FIELD,
    ])
    return tool_layout(calc_form(f), result_card("Su liquidación"))


def ui_renta():
    f = "\n".join([
        sueldo_fields("Otros ingresos fijos mensuales (bonos, movilidad de libre disposición)"),
        check("gratis", "gratis", "Recibe gratificaciones de julio y diciembre", True),
        SEGURO(),
        number("bonos", "bonos", "Otros ingresos del año (bonos, utilidades, etc.)", placeholder="0.00"),
        number("ded3", "ded3", "Gastos deducibles adicionales (hasta 3 UIT)", placeholder="0.00", hint="Por ejemplo, el 20 % de alquileres, honorarios médicos o consumos en restaurantes con comprobante electrónico."),
        select("pension", "pension", "Sistema de pensiones", [("onp", "ONP (13 %)"), ("afp", "AFP (aprox. 11,37 %)"), ("none", "No aporta")], "afp"),
        f"""<details class="help">
    <summary><i class="fa-solid fa-sliders" aria-hidden="true"></i> Valores de referencia</summary>
    <div class="help-body">
{indent(number("uit", "uit", "Valor de la UIT", "5500", hint="UIT vigente para el año del cálculo."), 8)}
{indent(number("rmv", "rmv", "Remuneración mínima vital (RMV)", "1130"), 8)}
    </div>
</details>""",
    ])
    return tool_layout(calc_form(f), result_card("Su sueldo neto"))


def ui_igv():
    f = "\n".join([
        number("monto", "monto", "Monto", placeholder="Ej.: 1180", attrs=" autofocus"),
        segmented("modo", "¿Qué desea calcular?", [("agregar", "Agregar IGV", "precio sin IGV → total"), ("quitar", "Quitar IGV", "total → precio sin IGV")]),
        '<div class="grid-2">',
        indent(select("tasa", "tasa", "Tasa", [("18", "18 % (general)"), ("otra", "Otra tasa")]), 4),
        indent(select("moneda", "moneda", "Moneda", [("PEN", "Soles (S/)"), ("USD", "Dólares (US$)")]), 4),
        "</div>",
        f"""<div id="tasa-otra-field" hidden>
{indent(number("tasaotra", "tasaotra", "Otra tasa (%)", "10", prefix="%"), 4)}
</div>""",
    ])
    return tool_layout(calc_form(f), result_card())


def ui_ruc():
    f = """<div class="field">
    <label for="ruc-input">RUC o DNI</label>
    <input type="text" id="ruc-input" name="ruc" inputmode="numeric" maxlength="14" placeholder="Ej.: 20131312955 o 45678912" autocomplete="off" spellcheck="false" autofocus>
    <p class="hint">Con un RUC (11 dígitos) se valida; con un DNI (8 dígitos) se obtiene el RUC de persona natural.</p>
</div>"""
    return tool_layout(calc_form(f), result_card())


# ---------------------------------------------------------------------
# Utilidades
# ---------------------------------------------------------------------
def ui_whatsapp():
    countries = [("51", "🇵🇪 Perú (+51)"), ("52", "🇲🇽 México (+52)"), ("57", "🇨🇴 Colombia (+57)"), ("54", "🇦🇷 Argentina (+54)"),
                 ("56", "🇨🇱 Chile (+56)"), ("593", "🇪🇨 Ecuador (+593)"), ("591", "🇧🇴 Bolivia (+591)"), ("58", "🇻🇪 Venezuela (+58)"),
                 ("595", "🇵🇾 Paraguay (+595)"), ("598", "🇺🇾 Uruguay (+598)"), ("34", "🇪🇸 España (+34)"), ("1", "🇺🇸 EE. UU. (+1)"), ("otro", "Otro país")]
    msgs = [("Hola, quiero más información 😊", "Información"), ("Hola, quiero hacer un pedido", "Pedido"),
            ("Hola, quisiera una cotización", "Cotización"), ("Hola, quiero reservar una cita", "Reserva")]
    chips = "".join(f'<button type="button" class="chip" data-wa-msg="{e(m)}">{t}</button>' for m, t in msgs)
    f = "\n".join([
        '<div class="grid-2 wa-grid">',
        indent(select("wa-country", "country", "País", countries), 4),
        """    <div class="field">
        <label for="wa-phone">Número de celular</label>
        <input type="tel" id="wa-phone" name="phone" placeholder="999 888 777" autocomplete="tel-national" inputmode="tel" autofocus>
    </div>""",
        "</div>",
        """<div class="field" id="wa-cc-other" hidden>
    <label for="wa-cc">Código de país</label>
    <input type="text" id="wa-cc" name="ccother" placeholder="Ej.: 49" inputmode="numeric">
</div>""",
        f"""<div class="field">
    <label for="wa-message">Mensaje prellenado <span class="hint">(opcional)</span></label>
    <textarea id="wa-message" name="message" rows="3" placeholder="Hola, quiero más información sobre…"></textarea>
    <div class="chips chips-wrap">{chips}</div>
</div>""",
    ])
    aside = """<section class="card result-card" aria-labelledby="h-step-2">
    <div class="card-head"><span class="step-num">2</span><h2 id="h-step-2">Su enlace</h2></div>
    <div class="link-box"><code id="wa-link" translate="no">https://wa.me/…</code></div>
    <div class="status" id="wa-status" role="status"></div>
    <button type="button" class="btn btn-primary btn-lg btn-block" id="wa-copy" disabled><i class="fa-regular fa-copy" aria-hidden="true"></i> Copiar enlace</button>
    <div class="btn-row">
        <a class="btn btn-secondary" id="wa-open" href="#" target="_blank" rel="noopener" aria-disabled="true"><i class="fa-brands fa-whatsapp" aria-hidden="true"></i> Probar</a>
        <a class="btn btn-secondary" id="wa-qr" href="/qr-whatsapp"><i class="fa-solid fa-qrcode" aria-hidden="true"></i> Crear QR</a>
    </div>
</section>"""
    return tool_layout(calc_form(f), aside)


def ui_words():
    acts = [("upper", "MAYÚSCULAS"), ("lower", "minúsculas"), ("sentence", "Tipo oración"), ("title", "Tipo Título"),
            ("spaces", "Quitar espacios extra"), ("lines", "Unir líneas"), ("accents", "Quitar tildes")]
    btns = "".join(f'<button type="button" class="chip" data-text-act="{a}">{t}</button>' for a, t in acts)
    main = f"""<section class="card" aria-labelledby="h-text">
    <div class="card-head"><h2 id="h-text">Escriba o pegue su texto</h2></div>
    <textarea id="text-input" class="big-textarea" rows="14" aria-labelledby="h-text" placeholder="Pegue aquí su texto: ensayo, tarea, publicación o descripción…"></textarea>
    <div class="chips chips-wrap text-tools" aria-label="Convertir texto">{btns}</div>
    <div class="btn-row">
        <button type="button" class="btn btn-secondary" id="text-copy"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copiar texto</button>
        <button type="button" class="btn btn-ghost" id="text-clear"><i class="fa-solid fa-eraser" aria-hidden="true"></i> Borrar</button>
    </div>
</section>"""
    stat = lambda id_, label: f'<div class="stat"><strong id="{id_}">0</strong><span>{label}</span></div>'
    limits = [(160, "Meta descripción (Google)"), (280, "Publicación en X"), (2200, "Texto de Instagram"), (5000, "Descripción de YouTube")]
    lim = "\n".join(f'        <li data-limit="{n}"><strong>{t}</strong> <em>{n:,} caracteres</em> · <span></span></li>'.replace(",", ".") for n, t in limits)
    aside = f"""<section class="card" aria-labelledby="h-stats">
    <div class="card-head"><h2 id="h-stats">Conteo</h2></div>
    <div class="stat-grid" aria-live="polite">
        {stat("st-words", "palabras")}
        {stat("st-chars", "caracteres")}
        {stat("st-nospaces", "sin espacios")}
        {stat("st-sentences", "oraciones")}
        {stat("st-paragraphs", "párrafos")}
        {stat("st-read", "de lectura")}
    </div>
    <p class="hint">Tiempo para leer en voz alta: <strong id="st-speak">0 s</strong></p>
    <h3 class="mini-title">Límites populares</h3>
    <ul class="limit-list">
{lim}
    </ul>
    <h3 class="mini-title">Palabras más usadas</h3>
    <ol class="top-words" id="top-words"></ol>
</section>"""
    return tool_layout(main, aside)


def ui_sorteo():
    return f"""<div class="sorteo-layout">
    <section class="card" aria-labelledby="h-step-1">
        {head(1, "Participantes")}
        <div class="field">
            <label for="names">Un nombre por línea</label>
            <textarea id="names" rows="12" placeholder="Ana&#10;Luis&#10;María&#10;Carlos&#10;Rosa&#10;Jorge"></textarea>
            <p class="hint" id="names-count" aria-live="polite">0 participantes</p>
        </div>
        <div class="btn-row">
            <button type="button" class="btn btn-secondary btn-sm" id="btn-shuffle"><i class="fa-solid fa-shuffle" aria-hidden="true"></i> Mezclar</button>
            <button type="button" class="btn btn-ghost btn-sm" id="btn-names-clear"><i class="fa-solid fa-eraser" aria-hidden="true"></i> Borrar</button>
        </div>
    </section>
    <section class="card" aria-labelledby="h-step-2">
        {head(2, "Elija el tipo de sorteo")}
        <div class="tabs-ui" role="tablist" aria-label="Tipo de sorteo">
            <button type="button" class="tab-ui" role="tab" id="tab-wheel" aria-selected="true" aria-controls="panel-wheel"><i class="fa-solid fa-dharmachakra" aria-hidden="true"></i> Ruleta</button>
            <button type="button" class="tab-ui" role="tab" id="tab-win" aria-selected="false" aria-controls="panel-win" tabindex="-1"><i class="fa-solid fa-trophy" aria-hidden="true"></i> Ganadores</button>
            <button type="button" class="tab-ui" role="tab" id="tab-teams" aria-selected="false" aria-controls="panel-teams" tabindex="-1"><i class="fa-solid fa-people-group" aria-hidden="true"></i> Equipos</button>
            <button type="button" class="tab-ui" role="tab" id="tab-num" aria-selected="false" aria-controls="panel-num" tabindex="-1"><i class="fa-solid fa-dice" aria-hidden="true"></i> Número</button>
        </div>
        <div class="tab-panel" id="panel-wheel" role="tabpanel" aria-labelledby="tab-wheel">
            <div class="wheel-wrap">
                <span class="wheel-pointer" aria-hidden="true"></span>
                <canvas id="wheel" width="600" height="600" role="img" aria-label="Ruleta con los participantes"></canvas>
            </div>
            <button type="button" class="btn btn-primary btn-lg btn-block" id="btn-spin"><i class="fa-solid fa-rotate" aria-hidden="true"></i> Girar la ruleta</button>
            {check("remove-winner", "quitar", "Quitar al ganador de la lista después de cada giro")}
        </div>
        <div class="tab-panel" id="panel-win" role="tabpanel" aria-labelledby="tab-win" hidden>
            <div class="field">
                <label for="winners-n">¿Cuántos ganadores?</label>
                <input type="number" id="winners-n" min="1" value="1" inputmode="numeric">
            </div>
            <button type="button" class="btn btn-primary btn-lg btn-block" id="btn-winners"><i class="fa-solid fa-trophy" aria-hidden="true"></i> Elegir ganadores</button>
        </div>
        <div class="tab-panel" id="panel-teams" role="tabpanel" aria-labelledby="tab-teams" hidden>
            <div class="field">
                <label for="teams-n">¿Cuántos equipos o grupos?</label>
                <input type="number" id="teams-n" min="2" value="2" inputmode="numeric">
            </div>
            <button type="button" class="btn btn-primary btn-lg btn-block" id="btn-teams"><i class="fa-solid fa-people-group" aria-hidden="true"></i> Formar equipos</button>
        </div>
        <div class="tab-panel" id="panel-num" role="tabpanel" aria-labelledby="tab-num" hidden>
            <div class="grid-3 keep">
                <div class="field"><label for="num-min">Desde</label><input type="number" id="num-min" value="1" inputmode="numeric"></div>
                <div class="field"><label for="num-max">Hasta</label><input type="number" id="num-max" value="100" inputmode="numeric"></div>
                <div class="field"><label for="num-qty">Cantidad</label><input type="number" id="num-qty" value="1" min="1" max="100" inputmode="numeric"></div>
            </div>
            {check("num-norepeat", "norepeat", "Sin repetir números", True)}
            <button type="button" class="btn btn-primary btn-lg btn-block" id="btn-number"><i class="fa-solid fa-dice" aria-hidden="true"></i> Sortear número</button>
        </div>
        <div class="sorteo-result" id="sorteo-result" aria-live="assertive" hidden></div>
    </section>
</div>"""


def ui_passwords():
    main = f"""<form class="card" id="calc-form" aria-labelledby="h-pw">
    <div class="card-head"><h2 id="h-pw">Su nueva contraseña</h2></div>
    <div class="pw-out">
        <input type="text" id="pw-output" readonly aria-label="Contraseña generada" spellcheck="false" autocomplete="off" translate="no">
        <button type="button" class="icon-btn" id="pw-regen" aria-label="Generar otra"><i class="fa-solid fa-rotate" aria-hidden="true"></i></button>
    </div>
    <div class="pw-meter" id="pw-meter"><span class="pw-meter-fill"></span></div>
    <p class="hint" id="pw-strength" aria-live="polite"></p>
    <button type="button" class="btn btn-primary btn-lg btn-block" id="pw-copy"><i class="fa-regular fa-copy" aria-hidden="true"></i> Copiar contraseña</button>
    <div class="field" style="margin-top:20px">
        <label for="pw-length">Longitud: <output id="pw-len-out" for="pw-length">16</output> caracteres</label>
        <input type="range" id="pw-length" name="length" min="6" max="64" value="16">
    </div>
    <div class="check-grid">
        {check("pw-upper", "upper", "Mayúsculas (A-Z)", True)}
        {check("pw-lower", "lower", "Minúsculas (a-z)", True)}
        {check("pw-digits", "digits", "Números (0-9)", True)}
        {check("pw-symbols", "symbols", "Símbolos (!@#$%)", True)}
        {check("pw-noamb", "noambiguous", "Evitar caracteres parecidos (l, I, O, 0, 1)", False)}
    </div>
</form>"""
    aside = """<section class="card" aria-labelledby="h-more">
    <div class="card-head"><h2 id="h-more">Otras opciones</h2></div>
    <ul class="pw-list" id="pw-list"></ul>
    <p class="trust"><span><i class="fa-solid fa-lock" aria-hidden="true"></i> Se generan en su equipo y no se guardan</span></p>
</section>"""
    return tool_layout(main, aside)


def ui_percent():
    box = lambda kind, a, b, title, ph=("", ""): f"""<section class="card pct-card" data-pct="{kind}" aria-label="{e(title)}">
    <h2>{title}</h2>
    <div class="pct-inputs">
        <label><span class="sr-only">{a}</span><input type="number" step="any" inputmode="decimal" placeholder="{ph[0]}" aria-label="{a}"></label>
        <label><span class="sr-only">{b}</span><input type="number" step="any" inputmode="decimal" placeholder="{ph[1]}" aria-label="{b}"></label>
    </div>
    <p class="pct-out" aria-live="polite"></p>
</section>"""
    return f"""<div class="calc-grid">
{box("of", "Porcentaje", "Cantidad", "¿Cuánto es el X % de Y?", ("15 %", "200"))}
{box("what", "Valor", "Total", "¿Qué porcentaje es X de Y?", ("30", "120"))}
{box("discount", "Precio", "Descuento %", "Precio con descuento", ("150", "20 %"))}
{box("increase", "Valor", "Aumento %", "Sumar un porcentaje", ("1000", "18 %"))}
{box("change", "Valor inicial", "Valor final", "Variación porcentual (de X a Y)", ("80", "100"))}
{box("reverse", "Valor parcial", "Porcentaje", "Si X es el Y %, ¿cuál es el total?", ("50", "25 %"))}
</div>"""


def ui_dates():
    return f"""<div class="calc-grid calc-grid-3">
    <section class="card" aria-labelledby="h-age">
        <div class="card-head"><h2 id="h-age"><i class="fa-solid fa-cake-candles" aria-hidden="true"></i> Calcular edad</h2></div>
        <form id="age-form" novalidate>
{indent(date("birth", "nacimiento", "Fecha de nacimiento", attrs=' autocomplete="bday"'), 12)}
{indent(date("age-at", "fecha", "Edad a la fecha", attrs=" data-default-today"), 12)}
        </form>
        <div id="age-result" aria-live="polite"></div>
    </section>
    <section class="card" aria-labelledby="h-diff">
        <div class="card-head"><h2 id="h-diff"><i class="fa-solid fa-calendar-days" aria-hidden="true"></i> Días entre fechas</h2></div>
        <form id="diff-form" novalidate>
{indent(date("from", "desde", "Desde", attrs=" data-default-today"), 12)}
{indent(date("to", "hasta", "Hasta"), 12)}
            {check("include-end", "incluir", "Incluir el último día")}
        </form>
        <div id="diff-result" aria-live="polite"></div>
    </section>
    <section class="card" aria-labelledby="h-add">
        <div class="card-head"><h2 id="h-add"><i class="fa-solid fa-calendar-plus" aria-hidden="true"></i> Sumar o restar a una fecha</h2></div>
        <form id="add-form" novalidate>
{indent(date("add-base", "base", "Fecha", attrs=" data-default-today"), 12)}
            <div class="grid-3 keep">
                <div class="field"><label for="add-op">Operación</label><select id="add-op"><option value="+">Sumar</option><option value="-">Restar</option></select></div>
                <div class="field"><label for="add-n">Cantidad</label><input type="number" id="add-n" value="30" min="0" inputmode="numeric"></div>
                <div class="field"><label for="add-unit">Unidad</label><select id="add-unit"><option value="days">días</option><option value="bdays">días hábiles</option><option value="weeks">semanas</option><option value="months">meses</option><option value="years">años</option></select></div>
            </div>
        </form>
        <div id="add-result" aria-live="polite"></div>
    </section>
</div>"""


# ---------------------------------------------------------------------
# Catálogo de herramientas (SEO y contenido)
# ---------------------------------------------------------------------
CATEGORIES = [
    ("pdf", "fa-file-pdf", "PDF", "Una, divida, comprima y convierta sus PDF sin subirlos a internet."),
    ("img", "fa-image", "Imágenes", "Comprima, cambie el tamaño y convierta fotos en segundos."),
    ("negocio", "fa-store", "Negocios y SUNAT", "Cotizaciones en PDF, IGV y validación de RUC."),
    ("trabajo", "fa-briefcase", "Trabajo en Perú", "CTS, gratificación, liquidación y sueldo neto."),
    ("util", "fa-wand-magic-sparkles", "Utilidades", "Herramientas rápidas para el día a día."),
]

PDF_LIBS = ["pdflib", "jszip"]
TOOLS = [
    # ------------------------------ PDF
    {
        "slug": "unir-pdf", "cat": "pdf", "icon": "fa-object-group", "short": "Unir PDF",
        "card": "Junte varios PDF en uno solo, en el orden que quiera.",
        "title": "Unir PDF Gratis Online | Juntar varios PDF en uno | QR Free",
        "description": "Une varios archivos PDF en uno solo gratis, sin registro y sin marcas de agua. Ordena los archivos y descarga al instante. Tus PDF no se suben a internet.",
        "h1": "Unir PDF", "lead": "Junte varios PDF en un solo archivo y elija el orden. Rápido, gratis y sin subir sus documentos a internet.",
        "ui": ui_merge, "js": "pdf-tools", "init": "initMergePdf()", "libs": PDF_LIBS,
        "steps": [("Agregue sus PDF.", "Arrástrelos o elíjalos de su equipo o celular. Puede agregar más en cualquier momento."),
                  ("Ordénelos.", "Use las flechas para cambiar el orden en que aparecerán."),
                  ("Pulse «Unir PDF».", "El archivo unido se descarga al instante.")],
        "faqs": [("¿Mis PDF se suben a algún servidor?", "No. Todo se procesa en su navegador. Sus documentos nunca salen de su equipo, por eso es seguro para contratos, DNI o documentos privados."),
                 ("¿Hay límite de archivos o de tamaño?", "No ponemos límites. Depende de la memoria de su equipo; en celulares recomendamos hasta unos 100 MB en total."),
                 ("¿Pone marca de agua?", "No. El PDF unido queda exactamente igual que los originales, sin marcas ni publicidad."),
                 ("¿Funciona con PDF protegidos?", "Los PDF con contraseña o con restricciones de edición no se pueden unir directamente. Ábralos en su navegador o lector de PDF, elija <strong>Imprimir → Guardar como PDF</strong> y use esa copia.")],
    },
    {
        "slug": "dividir-pdf", "cat": "pdf", "icon": "fa-scissors", "short": "Dividir PDF",
        "card": "Extraiga páginas o separe un PDF en varios archivos.",
        "title": "Dividir PDF Gratis | Extraer o separar páginas de un PDF | QR Free",
        "description": "Divide un PDF gratis: extrae solo las páginas que necesitas o separa cada página en un archivo. Con vista previa de páginas. Sin registro y sin subir tu archivo.",
        "h1": "Dividir PDF y extraer páginas", "lead": "Saque solo las páginas que necesita o separe el PDF en varios archivos. Con vista previa de cada página.",
        "ui": ui_split, "js": "pdf-tools", "init": "initSplitPdf()", "libs": PDF_LIBS + ["pdfjs"],
        "steps": [("Suba su PDF.", "Verá una miniatura de cada página."),
                  ("Elija qué hacer.", "<strong>Extraer</strong> las páginas que toque o escriba (ej.: 1-3, 5), <strong>separar</strong> todas o dividir <strong>cada N páginas</strong>."),
                  ("Descargue.", "Un PDF con las páginas elegidas, o un ZIP con todos los archivos.")],
        "faqs": [("¿Cómo escribo las páginas?", "Use comas para páginas sueltas y guiones para rangos. Por ejemplo, <code>1-3, 5, 8-10</code>. Escriba <code>7-</code> para ir desde la 7 hasta el final."),
                 ("¿Se pierde calidad?", "No. Las páginas se copian tal cual: el texto sigue siendo seleccionable y las imágenes no se modifican."),
                 ("¿Puedo cambiar el orden de las páginas?", "Al extraer, las páginas se guardan en el orden en que las escribe. Por ejemplo, <code>3, 1, 2</code> crea un PDF con la página 3 primero.")],
    },
    {
        "slug": "comprimir-pdf", "cat": "pdf", "icon": "fa-compress", "short": "Comprimir PDF",
        "card": "Reduzca el peso de PDF escaneados para enviarlos por correo.",
        "title": "Comprimir PDF Gratis | Reducir el tamaño de un PDF online | QR Free",
        "description": "Comprime un PDF gratis y reduce su peso hasta en 90 % para enviarlo por correo, WhatsApp o subirlo a portales. Ideal para PDF escaneados. Sin subir tu archivo.",
        "h1": "Comprimir PDF", "lead": "Reduzca el peso de sus PDF escaneados para enviarlos por correo o subirlos a portales que piden archivos de menos de 2 MB.",
        "ui": ui_compress, "js": "pdf-tools", "init": "initCompressPdf()", "libs": PDF_LIBS + ["pdfjs"],
        "steps": [("Suba su PDF.", "Funciona mejor con documentos escaneados o con muchas fotos."),
                  ("Elija el nivel.", "<strong>Media</strong> es la recomendada. Use <strong>Alta</strong> si el portal pide un archivo muy liviano."),
                  ("Pulse «Comprimir PDF».", "Verá cuánto se redujo y se descargará al instante.")],
        "faqs": [("¿Cuánto se reduce el peso?", "En PDF escaneados suele bajar entre 50 % y 90 %. En PDF creados desde Word, que solo tienen texto, la reducción es menor porque ya son livianos."),
                 ("¿Por qué ya no puedo seleccionar el texto?", "Para lograr la máxima reducción cada página se convierte en una imagen optimizada. Si necesita copiar texto, guarde también el original."),
                 ("¿Sirve para portales del Estado o universidades?", "Sí. Muchos portales piden archivos de menos de 2 o 5 MB. Si no alcanza con «Media», pruebe con «Alta»."),
                 ("¿Mi documento se sube a internet?", "No. La compresión se hace en su navegador.")],
    },
    {
        "slug": "imagen-a-pdf", "cat": "pdf", "icon": "fa-file-image", "short": "JPG a PDF",
        "card": "Convierta fotos o capturas en un solo PDF.",
        "title": "JPG a PDF Gratis | Convertir imágenes y fotos a PDF | QR Free",
        "description": "Convierte imágenes JPG, PNG o fotos del celular a PDF gratis. Une varias fotos en un solo PDF, elige tamaño A4 u oficio y márgenes. Sin registro.",
        "h1": "Convertir JPG a PDF", "lead": "Junte fotos, capturas o documentos fotografiados en un solo PDF, con tamaño A4, carta u oficio.",
        "ui": ui_img2pdf, "js": "pdf-tools", "init": "initImagesToPdf()", "libs": PDF_LIBS,
        "steps": [("Agregue sus imágenes.", "JPG, PNG o WebP, desde su computadora o la galería del celular."),
                  ("Ordénelas.", "Cada imagen será una página, en el orden de la lista."),
                  ("Elija tamaño y margen, y descargue.", "A4 es el tamaño estándar para trámites.")],
        "faqs": [("¿Puedo convertir fotos de mi DNI o de documentos?", "Sí, y con seguridad: las imágenes no se suben a internet. Se procesan en su equipo."),
                 ("¿Las fotos del iPhone (HEIC) funcionan?", "Conviértalas primero con nuestro <a href=\"/heic-a-jpg\">convertidor de HEIC a JPG</a> y luego agréguelas aquí."),
                 ("¿Qué tamaño de página elijo?", "A4 para trámites en Perú y la mayoría de países. «Igual a la imagen» crea páginas del tamaño exacto de cada foto, sin bordes.")],
    },
    {
        "slug": "pdf-a-jpg", "cat": "pdf", "icon": "fa-images", "short": "PDF a JPG",
        "card": "Convierta cada página de un PDF en una imagen.",
        "title": "PDF a JPG Gratis | Convertir PDF a imagen JPG o PNG | QR Free",
        "description": "Convierte un PDF a imágenes JPG o PNG gratis, en alta resolución. Cada página se guarda como una imagen. Ideal para compartir en WhatsApp o redes. Sin registro.",
        "h1": "Convertir PDF a JPG", "lead": "Cada página de su PDF se convierte en una imagen JPG o PNG, lista para WhatsApp, redes o presentaciones.",
        "ui": ui_pdf2img, "js": "pdf-tools", "init": "initPdfToImages()", "libs": ["pdfjs", "jszip"],
        "steps": [("Suba su PDF.", "Verá la vista previa de las páginas."),
                  ("Elija formato y resolución.", "JPG es más liviano; PNG es más nítido para textos. 150 ppp sirve para la mayoría de usos."),
                  ("Descargue.", "Si el PDF tiene varias páginas, recibirá un ZIP con todas las imágenes.")],
        "faqs": [("¿Qué resolución elijo?", "72 ppp para ver en pantalla, 150 ppp para compartir (recomendada) y 300 ppp si va a imprimir."),
                 ("¿Cómo abro el ZIP en el celular?", "Android lo abre desde la app Archivos. En iPhone, tóquelo en la app Archivos y se descomprime solo.")],
    },
    # ------------------------------ Imágenes
    {
        "slug": "comprimir-imagen", "cat": "img", "icon": "fa-down-left-and-up-right-to-center", "short": "Comprimir imagen",
        "card": "Reduzca el peso de fotos JPG y PNG sin perder calidad visible.",
        "title": "Comprimir Imagen Gratis | Reducir el peso de fotos JPG y PNG | QR Free",
        "description": "Comprime imágenes JPG, PNG y WebP gratis y reduce su peso hasta en 80 % sin perder calidad visible. Varias fotos a la vez, sin subirlas a internet.",
        "h1": "Comprimir imágenes", "lead": "Reduzca el peso de sus fotos para su web, correo o formularios que piden archivos livianos. Varias a la vez.",
        "ui": lambda: ui_image("compress"), "js": "image-tools", "init": "initImageTool('compress')", "libs": ["jszip"],
        "steps": [("Agregue sus imágenes.", "Puede soltar decenas a la vez."),
                  ("Ajuste la calidad.", "70 % es un buen equilibrio. Reducir el ancho máximo baja aún más el peso."),
                  ("Descargue.", "Una por una o todas juntas en un ZIP.")],
        "faqs": [("¿Cuánto se reduce?", "Las fotos del celular suelen bajar de 3–5 MB a 300–600 KB con calidad 70 % y ancho de 1920 px, sin diferencia visible en pantalla."),
                 ("¿Por qué mi PNG casi no se reduce?", "El formato PNG no tiene ajuste de calidad. Elija JPG (si no necesita fondo transparente) o WebP para reducirlo mucho más."),
                 ("¿Las imágenes se suben a internet?", "No. Se comprimen en su navegador.")],
    },
    {
        "slug": "redimensionar-imagen", "cat": "img", "icon": "fa-up-right-and-down-left-from-center", "short": "Cambiar tamaño de imagen",
        "card": "Medidas exactas para Instagram, Facebook, YouTube o foto carné.",
        "title": "Cambiar Tamaño de Imagen Online Gratis | Redimensionar fotos | QR Free",
        "description": "Redimensiona imágenes gratis a la medida exacta en píxeles o por porcentaje. Medidas listas para Instagram, Facebook, YouTube, TikTok y foto carné. Varias a la vez.",
        "h1": "Cambiar el tamaño de imágenes", "lead": "Ajuste sus fotos a medidas exactas en píxeles, por porcentaje o con un toque para Instagram, Facebook, YouTube o foto carné.",
        "ui": lambda: ui_image("resize"), "js": "image-tools", "init": "initImageTool('resize')", "libs": ["jszip"],
        "steps": [("Agregue sus imágenes.", "JPG, PNG o WebP."),
                  ("Elija la medida.", "Toque una medida predefinida o escriba el ancho y alto. Si la proporción no coincide, elija recortar o encajar."),
                  ("Descargue.", "Las imágenes conservan su nombre, con la medida agregada.")],
        "faqs": [("¿Qué hace «Mantener proporción»?", "Evita que la imagen se deforme: ajusta el alto según el ancho (o al revés). Desactívelo para medidas exactas y elija si recortar o agregar bordes."),
                 ("¿Qué medida es la foto carné?", "La foto tamaño carné de 3,5 × 4,5 cm equivale a 413 × 531 píxeles a 300 ppp, lista para imprimir."),
                 ("¿Puedo agrandar una imagen?", "Sí, pero al agrandar se pierde nitidez. Para mejores resultados, use imágenes del tamaño final o más grandes.")],
    },
    {
        "slug": "convertir-imagen", "cat": "img", "icon": "fa-arrows-rotate", "short": "Convertir imagen",
        "card": "WebP a JPG, PNG a JPG, JPG a PNG y más.",
        "title": "Convertir Imagen Gratis | WebP a JPG, PNG a JPG, JPG a PNG | QR Free",
        "description": "Convierte imágenes entre JPG, PNG y WebP gratis. Pasa WebP a JPG, PNG a JPG o JPG a PNG en segundos, varias a la vez y sin subirlas a internet.",
        "h1": "Convertir imágenes (WebP, PNG, JPG)", "lead": "Cambie el formato de sus imágenes: WebP a JPG, PNG a JPG, JPG a PNG o a WebP. Varias a la vez.",
        "ui": lambda: ui_image("convert"), "js": "image-tools", "init": "initImageTool('convert')", "libs": ["jszip"],
        "steps": [("Agregue sus imágenes.", "Cualquier formato que su navegador pueda abrir: JPG, PNG, WebP, GIF, BMP o AVIF."),
                  ("Elija el formato de salida.", "JPG para fotos, PNG para logos con transparencia, WebP para web."),
                  ("Descargue.", "Una a una o todas en ZIP.")],
        "faqs": [("¿Por qué no puedo abrir imágenes WebP?", "Algunos programas antiguos no reconocen WebP. Conviértalas aquí a JPG y las podrá abrir en cualquier equipo."),
                 ("¿Se pierde la transparencia?", "Al convertir a JPG el fondo transparente se vuelve blanco, porque JPG no admite transparencia. Use PNG o WebP para conservarla."),
                 ("¿Y las fotos HEIC del iPhone?", "Use el <a href=\"/heic-a-jpg\">convertidor de HEIC a JPG</a>.")],
    },
    {
        "slug": "heic-a-jpg", "cat": "img", "icon": "fa-mobile-screen", "short": "HEIC a JPG",
        "card": "Abra las fotos del iPhone en Windows y en cualquier app.",
        "title": "HEIC a JPG Gratis | Convertir fotos del iPhone a JPG | QR Free",
        "description": "Convierte fotos HEIC del iPhone a JPG gratis para abrirlas en Windows, enviarlas o subirlas a cualquier web. Varias fotos a la vez y sin subirlas a internet.",
        "h1": "Convertir HEIC a JPG", "lead": "¿Pasó las fotos del iPhone a su computadora y no se abren? Conviértalas a JPG en segundos, varias a la vez.",
        "ui": lambda: ui_image("heic"), "js": "image-tools", "init": "initImageTool('heic')", "libs": ["heic", "jszip"],
        "steps": [("Agregue sus fotos .HEIC.", "Puede soltar muchas a la vez."),
                  ("Elija JPG o PNG.", "JPG es el formato que abre cualquier equipo."),
                  ("Descargue.", "Todas juntas en un ZIP o una por una.")],
        "faqs": [("¿Qué es HEIC?", "Es el formato que usa el iPhone para ahorrar espacio. Windows, muchas webs y algunas apps no lo abren, por eso conviene pasarlo a JPG."),
                 ("¿Cómo evito que el iPhone guarde en HEIC?", "En el iPhone vaya a Configuración → Cámara → Formatos y elija «Más compatible». Las fotos nuevas se guardarán en JPG."),
                 ("¿Mis fotos se suben a internet?", "No. La conversión ocurre en su navegador. Con muchas fotos puede tardar unos segundos por cada una.")],
    },
    # ------------------------------ Negocio
    {
        "slug": "cotizacion", "cat": "negocio", "icon": "fa-file-invoice-dollar", "short": "Cotizaciones en PDF",
        "card": "Cotizaciones, proformas y notas de venta con su logo.",
        "title": "Generador de Cotizaciones Gratis en PDF | Proformas con logo | QR Free",
        "description": "Crea cotizaciones y proformas profesionales en PDF gratis, con tu logo, RUC, IGV y monto en letras. Sin registro: tus datos se guardan solo en tu equipo.",
        "h1": "Generador de cotizaciones y proformas", "lead": "Cree cotizaciones, proformas y notas de venta en PDF con su logo, IGV y total en letras. Sus datos quedan guardados para la próxima vez.",
        "ui": ui_cotizacion, "js": "cotizacion", "init": "initCotizacion()", "libs": ["jspdf"],
        "steps": [("Complete los datos de su negocio.", "Solo la primera vez: quedan guardados en este navegador. Suba su logo si tiene."),
                  ("Elija el tipo de documento y el cliente.", "Cotización, proforma, nota de venta o recibo. El número se completa solo."),
                  ("Agregue productos o servicios.", "Elija si los precios incluyen IGV o si se debe agregar."),
                  ("Descargue el PDF.", "Envíelo por WhatsApp o correo. Para la siguiente, pulse «Nuevo documento».")],
        "faqs": [("¿La nota de venta o el recibo reemplazan a una boleta o factura?", "No. Son documentos internos sin valor tributario. Para ventas formales debe emitir boletas o facturas electrónicas desde SUNAT o un sistema autorizado."),
                 ("¿Dónde se guardan mis datos?", "Solo en este navegador (almacenamiento local). No los enviamos a ningún servidor. Si cambia de equipo o borra los datos del navegador, deberá ingresarlos de nuevo."),
                 ("¿Cómo calcula el IGV?", "«Agregar IGV» suma 18 % al subtotal. «Los precios ya incluyen IGV» separa el valor de venta y el IGV del total. «Sin IGV» no lo calcula."),
                 ("¿Puedo cambiar el número de la cotización?", "Sí, escriba el que quiera. Al pulsar «Nuevo documento» se usa el siguiente número.")],
    },
    {
        "slug": "calculadora-igv", "cat": "negocio", "icon": "fa-percent", "short": "Calculadora de IGV",
        "card": "Agregue o quite el 18 % de IGV y obtenga el monto en letras.",
        "title": "Calculadora de IGV Perú 18 % | Agregar o quitar IGV | QR Free",
        "description": "Calcula el IGV 18 % en Perú: agrega IGV a un precio o quítalo de un total. Obtén el valor de venta, el IGV y el monto en letras para facturas. Gratis.",
        "h1": "Calculadora de IGV (18 %)", "lead": "Agregue el IGV a un precio o sepárelo de un total. Incluye el monto en letras para sus facturas y cotizaciones.",
        "ui": ui_igv, "js": "calc-peru", "init": "initIgv()", "libs": [],
        "steps": [("Escriba el monto.", "Con o sin IGV, según lo que tenga."),
                  ("Elija «Agregar» o «Quitar».", "Agregar: del precio sin IGV obtiene el total. Quitar: del total obtiene el valor de venta y el IGV."),
                  ("Copie el resultado.", "Incluye el monto en letras.")],
        "faqs": [("¿Cómo se quita el IGV de un precio?", "Divida el total entre 1,18. Por ejemplo, S/ 118 ÷ 1,18 = S/ 100 de valor de venta y S/ 18 de IGV. No es correcto restar el 18 % del total."),
                 ("¿El IGV es 18 %?", "Sí: 16 % de IGV más 2 % del Impuesto de Promoción Municipal. Algunos regímenes especiales, como restaurantes y hoteles MYPE, tienen una tasa reducida temporal: use «Otra tasa»."),
                 ("¿Qué es el valor de venta?", "Es el precio sin impuestos, también llamado base imponible u operación gravada.")],
    },
    {
        "slug": "validar-ruc", "cat": "negocio", "icon": "fa-id-card", "short": "Validar RUC / DNI a RUC",
        "card": "Verifique si un RUC es válido u obtenga el RUC desde un DNI.",
        "title": "Validar RUC y convertir DNI a RUC | Verificador de RUC Perú | QR Free",
        "description": "Verifica si un número de RUC es válido (dígito verificador y tipo de contribuyente) o calcula el RUC de una persona natural a partir de su DNI. Gratis.",
        "h1": "Validar RUC y convertir DNI a RUC", "lead": "Compruebe si un RUC está bien escrito antes de emitir una factura, u obtenga el RUC 10 de una persona a partir de su DNI.",
        "ui": ui_ruc, "js": "calc-peru", "init": "initRuc()", "libs": [],
        "steps": [("Escriba el RUC o el DNI.", "Puede pegarlo con espacios o guiones: se limpian solos."),
                  ("Vea el resultado al instante.", "Con un RUC verá si el dígito verificador es correcto y el tipo de contribuyente. Con un DNI verá el RUC de persona natural.")],
        "faqs": [("¿Esto confirma que el RUC está activo?", "No. Solo valida que el número esté bien formado. Para saber si está activo y habido, use la Consulta RUC de la web de SUNAT."),
                 ("¿Cómo se obtiene el RUC desde el DNI?", "El RUC de una persona natural es 10 + los 8 dígitos del DNI + un dígito verificador. Solo existe si la persona se inscribió en SUNAT."),
                 ("¿Qué significan los primeros dígitos?", "10: persona natural con DNI. 15 y 17: personas naturales con otros documentos o extranjeros. 20: empresas (personas jurídicas).")],
    },
    # ------------------------------ Trabajo
    {
        "slug": "calculadora-cts", "cat": "trabajo", "icon": "fa-piggy-bank", "short": "Calculadora de CTS",
        "card": "Cuánto le deben depositar en mayo o noviembre.",
        "title": "Calculadora de CTS 2026 Perú | Calcula tu CTS de mayo y noviembre | QR Free",
        "description": "Calcula tu CTS en Perú: depósito de mayo y noviembre con sueldo, asignación familiar, 1/6 de gratificación y meses trabajados. Régimen general y MYPE. Gratis.",
        "h1": "Calculadora de CTS", "lead": "Calcule cuánto le deben depositar de CTS en mayo o noviembre, con asignación familiar, gratificación y meses trabajados.",
        "ui": ui_cts, "js": "calc-peru", "init": "initCts()", "libs": [],
        "steps": [("Ingrese su sueldo bruto.", "Marque si recibe asignación familiar y agregue sus pagos variables regulares."),
                  ("Elija el depósito.", "Mayo cubre de noviembre a abril; noviembre cubre de mayo a octubre."),
                  ("Si entró a trabajar durante el período, ponga su fecha de ingreso.", "Se calcula la parte proporcional por meses y días.")],
        "faqs": [("¿Cómo se calcula la CTS?", "Remuneración computable (sueldo + asignación familiar + variables regulares + 1/6 de la última gratificación) ÷ 12 × meses trabajados, más ÷ 360 × días."),
                 ("¿Cuándo se deposita?", "Hasta el 15 de mayo y el 15 de noviembre de cada año. Si cae en día no laborable, el plazo pasa al siguiente día hábil."),
                 ("¿En la MYPE también hay CTS?", "En la pequeña empresa sí, la mitad (15 remuneraciones diarias por año). En la microempresa no corresponde."),
                 ("¿Me descuentan AFP u ONP de la CTS?", "No. La CTS no tiene descuentos de pensiones ni de impuesto a la renta.")],
    },
    {
        "slug": "calculadora-gratificacion", "cat": "trabajo", "icon": "fa-gift", "short": "Calculadora de gratificación",
        "card": "Gratificación de julio y diciembre con bonificación del 9 %.",
        "title": "Calculadora de Gratificación 2026 Perú | Julio y Diciembre | QR Free",
        "description": "Calcula tu gratificación de julio (Fiestas Patrias) o diciembre (Navidad) en Perú, con bonificación extraordinaria del 9 % y meses trabajados. Gratis.",
        "h1": "Calculadora de gratificación", "lead": "Calcule su gratificación de Fiestas Patrias o Navidad, con la bonificación extraordinaria del 9 % (EsSalud) o 6,75 % (EPS).",
        "ui": ui_grati, "js": "calc-peru", "init": "initGratificacion()", "libs": [],
        "steps": [("Ingrese su sueldo bruto.", "Marque la asignación familiar si la recibe."),
                  ("Elija julio o diciembre.", "Julio cubre de enero a junio; diciembre, de julio a diciembre."),
                  ("Si entró durante el semestre, ponga la fecha de ingreso.", "Solo cuentan los meses calendario completos.")],
        "faqs": [("¿Cuánto es la gratificación?", "Un sueldo completo (con asignación familiar y variables regulares) si trabajó todo el semestre. Si no, la parte proporcional por meses completos."),
                 ("¿Qué es la bonificación extraordinaria?", "Es el 9 % de la gratificación (6,75 % si tiene EPS), que el empleador paga en lugar del aporte a EsSalud. Se suma a la gratificación."),
                 ("¿Me descuentan AFP u ONP?", "No. La gratificación no tiene descuento de pensiones (Ley 30334). Sí se considera para el impuesto a la renta de 5.ª categoría."),
                 ("¿Hasta cuándo deben pagarla?", "Hasta el 15 de julio y el 15 de diciembre.")],
    },
    {
        "slug": "calculadora-liquidacion", "cat": "trabajo", "icon": "fa-scale-balanced", "short": "Calculadora de liquidación",
        "card": "Beneficios sociales al renunciar o ser despedido.",
        "title": "Calculadora de Liquidación Perú 2026 | Beneficios sociales | QR Free",
        "description": "Calcula tu liquidación de beneficios sociales en Perú: CTS trunca, gratificación trunca, vacaciones truncas y no gozadas, e indemnización por despido. Gratis.",
        "h1": "Calculadora de liquidación de beneficios sociales", "lead": "Si renunció o lo despidieron, calcule su CTS trunca, gratificación trunca, vacaciones e indemnización.",
        "ui": ui_liquidacion, "js": "calc-peru", "init": "initLiquidacion()", "libs": [],
        "steps": [("Ingrese su sueldo y fechas.", "Fecha de ingreso y su último día de trabajo."),
                  ("Indique vacaciones pendientes.", "Los días de años anteriores que no gozó."),
                  ("Marque si fue despido arbitrario.", "Se agrega la indemnización que corresponde a su régimen.")],
        "faqs": [("¿Qué incluye la liquidación?", "CTS trunca, gratificación trunca con su bonificación, vacaciones truncas y, si corresponde, vacaciones no gozadas, indemnización vacacional e indemnización por despido arbitrario."),
                 ("¿En cuánto tiempo deben pagarla?", "Dentro de las 48 horas siguientes al cese. Si no le pagan, puede presentar una denuncia ante SUNAFIL."),
                 ("¿Cuánto es la indemnización por despido arbitrario?", "En el régimen general, 1,5 sueldos por año completo (y la parte proporcional), con un tope de 12 sueldos. En contratos a plazo fijo se calcula distinto: 1,5 sueldos por cada mes que faltaba, con el mismo tope."),
                 ("¿Si renuncio también me pagan?", "Sí. Al renunciar recibe todos los conceptos truncos; solo no corresponde la indemnización por despido.")],
    },
    {
        "slug": "calculadora-renta-quinta", "cat": "trabajo", "icon": "fa-money-bill-wave", "short": "Sueldo neto y renta de 5.ª",
        "card": "Cuánto recibe al mes después de AFP/ONP e impuesto.",
        "title": "Calculadora de Sueldo Neto y Renta de Quinta Categoría 2026 | QR Free",
        "description": "Calcula tu sueldo neto en Perú y la retención de renta de quinta categoría con la UIT 2026, AFP u ONP, gratificaciones y deducciones de 7 UIT y 3 UIT. Gratis.",
        "h1": "Sueldo neto y renta de quinta categoría", "lead": "Calcule cuánto recibe realmente al mes después del aporte a AFP u ONP y de la retención del impuesto a la renta.",
        "ui": ui_renta, "js": "calc-peru", "init": "initRentaQuinta()", "libs": [],
        "steps": [("Ingrese su sueldo bruto mensual.", "Agregue otros ingresos fijos y bonos del año si los tiene."),
                  ("Elija su sistema de pensiones.", "ONP descuenta 13 %; AFP alrededor de 11,37 % según su AFP."),
                  ("Revise el detalle.", "Verá la renta neta, el impuesto por tramos y la retención mensual promedio.")],
        "faqs": [("¿Desde qué sueldo se paga renta de quinta?", "Si sus ingresos del año, incluidas gratificaciones, superan 7 UIT. Con gratificaciones, eso equivale aproximadamente a un sueldo mayor a S/ 2 700 al mes."),
                 ("¿Cuáles son las tasas?", "Hasta 5 UIT: 8 %. Más de 5 hasta 20 UIT: 14 %. Más de 20 hasta 35 UIT: 17 %. Más de 35 hasta 45 UIT: 20 %. Más de 45 UIT: 30 %."),
                 ("¿Qué son las 3 UIT adicionales?", "Puede deducir hasta 3 UIT más por gastos pagados con comprobante electrónico: alquiler, honorarios médicos, servicios profesionales, restaurantes y hoteles, entre otros."),
                 ("¿Por qué mi retención real es distinta?", "El empleador recalcula la retención cada mes según lo ya pagado, por eso varía. Aquí se muestra el promedio mensual del año.")],
    },
    # ------------------------------ Utilidades
    {
        "slug": "link-whatsapp", "cat": "util", "icon": "fa-link", "short": "Link de WhatsApp",
        "card": "Enlace wa.me con mensaje para su Instagram o web.",
        "title": "Crear Link de WhatsApp con Mensaje Gratis | Enlace wa.me | QR Free",
        "description": "Crea tu link de WhatsApp con mensaje personalizado gratis. Pégalo en tu bio de Instagram, Facebook, TikTok o web para que te escriban con un clic.",
        "h1": "Crear link de WhatsApp", "lead": "Cree un enlace que abre un chat con su número y un mensaje ya escrito. Póngalo en su Instagram, Facebook, TikTok o web.",
        "ui": ui_whatsapp, "js": "utilidades", "init": "initWhatsappLink()", "libs": [],
        "steps": [("Elija el país y escriba su número.", "Sin el código de país: se agrega solo."),
                  ("Escriba un mensaje (opcional).", "Es el texto que su cliente verá listo para enviar."),
                  ("Copie el enlace.", "Péguelo en su biografía, botón de contacto o anuncio. Pruébelo antes con «Probar».")],
        "faqs": [("¿Funciona con WhatsApp Business?", "Sí, funciona igual con WhatsApp normal y con WhatsApp Business."),
                 ("¿El enlace caduca?", "No. Es un enlace oficial de WhatsApp (wa.me) y funciona para siempre mientras su número esté activo."),
                 ("¿Puedo convertirlo en un código QR?", "Sí. Use nuestro <a href=\"/qr-whatsapp\">generador de QR de WhatsApp</a> para imprimirlo en volantes o en su local.")],
    },
    {
        "slug": "contador-palabras", "cat": "util", "icon": "fa-font", "short": "Contador de palabras",
        "card": "Cuente palabras y caracteres, y cambie mayúsculas.",
        "title": "Contador de Palabras y Caracteres Online Gratis | QR Free",
        "description": "Cuenta palabras, caracteres, oraciones y párrafos al instante. Convierte a MAYÚSCULAS, minúsculas o tipo título, quita tildes y espacios extra. Gratis.",
        "h1": "Contador de palabras y caracteres", "lead": "Cuente palabras y caracteres al instante, y transforme su texto: mayúsculas, minúsculas, tipo título, sin tildes y más.",
        "ui": ui_words, "js": "utilidades", "init": "initWordCounter()", "libs": [],
        "steps": [("Escriba o pegue su texto.", "El conteo se actualiza mientras escribe."),
                  ("Transfórmelo si lo necesita.", "Use los botones para cambiar mayúsculas, quitar tildes o espacios extra."),
                  ("Cópielo.", "Su texto se guarda en este navegador por si cierra la pestaña.")],
        "faqs": [("¿Cuenta los espacios?", "Mostramos ambos: caracteres con espacios y sin espacios. Twitter/X e Instagram cuentan con espacios."),
                 ("¿Cómo calcula el tiempo de lectura?", "Con una velocidad promedio de 200 palabras por minuto para leer y 130 para hablar en voz alta."),
                 ("¿Se guarda mi texto en internet?", "No. Se queda solo en su navegador.")],
    },
    {
        "slug": "sorteo", "cat": "util", "icon": "fa-dharmachakra", "short": "Sorteos y ruleta",
        "card": "Ruleta, ganadores al azar, equipos y números.",
        "title": "Ruleta de Sorteos Online Gratis | Elegir ganador al azar | QR Free",
        "description": "Haz sorteos online gratis: ruleta con nombres, elige ganadores al azar, forma equipos o grupos y sortea números. Ideal para docentes, rifas y redes sociales.",
        "h1": "Sorteos online: ruleta, ganadores y equipos", "lead": "Gire una ruleta con nombres, elija ganadores al azar, forme equipos para su clase o sortee números. Justo y transparente.",
        "ui": ui_sorteo, "js": "utilidades", "init": "initSorteo()", "libs": [],
        "steps": [("Escriba los participantes.", "Uno por línea. Puede pegarlos desde Excel o de los comentarios de su publicación."),
                  ("Elija el tipo de sorteo.", "Ruleta, ganadores, equipos o número aleatorio."),
                  ("¡Sortee!", "Puede grabar la pantalla para mostrar que el sorteo fue justo.")],
        "faqs": [("¿El sorteo es realmente al azar?", "Sí. Usamos el generador criptográfico del navegador (crypto.getRandomValues), el mismo que se usa en seguridad. Ningún resultado está predefinido."),
                 ("¿Sirve para dividir a los alumnos en grupos?", "Sí. En «Equipos» elija cuántos grupos quiere y se reparten de forma equilibrada y al azar."),
                 ("¿Se guarda mi lista?", "Sí, solo en este navegador, para que no tenga que escribirla otra vez.")],
    },
    {
        "slug": "generador-contrasenas", "cat": "util", "icon": "fa-key", "short": "Generador de contraseñas",
        "card": "Contraseñas seguras y aleatorias al instante.",
        "title": "Generador de Contraseñas Seguras Gratis | QR Free",
        "description": "Genera contraseñas seguras y aleatorias al instante: elige la longitud, mayúsculas, números y símbolos. Se crean en tu navegador y no se guardan.",
        "h1": "Generador de contraseñas seguras", "lead": "Cree contraseñas fuertes y aleatorias en un segundo. Se generan en su equipo y no se guardan en ningún lugar.",
        "ui": ui_passwords, "js": "utilidades", "init": "initPasswords()", "libs": [],
        "steps": [("Elija la longitud.", "Recomendamos 16 caracteres o más."),
                  ("Elija los tipos de caracteres.", "Mayúsculas, minúsculas, números y símbolos."),
                  ("Copie su contraseña.", "Guárdela en un gestor de contraseñas.")],
        "faqs": [("¿Es seguro generar contraseñas aquí?", "Sí. Se generan en su navegador con un generador criptográfico y no se envían ni se guardan."),
                 ("¿Qué longitud es segura?", "12 caracteres es el mínimo recomendado; 16 o más con mayúsculas, números y símbolos es muy fuerte."),
                 ("¿Para qué sirve evitar caracteres parecidos?", "Evita confundir la l con la I o el 0 con la O cuando tiene que escribir la contraseña a mano.")],
    },
    {
        "slug": "calculadora-porcentajes", "cat": "util", "icon": "fa-calculator", "short": "Calculadora de porcentajes",
        "card": "Descuentos, aumentos y variaciones en segundos.",
        "title": "Calculadora de Porcentajes Online | Descuentos y aumentos | QR Free",
        "description": "Calcula porcentajes fácilmente: cuánto es el X % de un número, qué porcentaje representa, descuentos, aumentos y variación porcentual. Gratis y al instante.",
        "h1": "Calculadora de porcentajes", "lead": "Calcule descuentos, aumentos, qué porcentaje es un número de otro y variaciones. Escriba y vea el resultado al instante.",
        "ui": ui_percent, "js": "utilidades", "init": "initPercent()", "libs": [],
        "steps": [("Elija el cálculo.", "Cada tarjeta resuelve una pregunta distinta."),
                  ("Escriba los dos valores.", "El resultado aparece al instante.")],
        "faqs": [("¿Cómo calculo un descuento?", "Multiplique el precio por (1 − descuento ÷ 100). Por ejemplo, S/ 150 con 20 % de descuento: 150 × 0,8 = S/ 120."),
                 ("¿Cómo saco el porcentaje de aumento?", "(Valor final − valor inicial) ÷ valor inicial × 100. De 80 a 100 hay un aumento del 25 %."),
                 ("¿Cómo saco el 18 % de IGV?", "Para el IGV use la <a href=\"/calculadora-igv\">calculadora de IGV</a>, que además separa el impuesto de un total.")],
    },
    {
        "slug": "calculadora-edad", "cat": "util", "icon": "fa-calendar-days", "short": "Edad y días entre fechas",
        "card": "Edad exacta, días entre fechas y días hábiles.",
        "title": "Calculadora de Edad y Días entre Fechas | Días hábiles | QR Free",
        "description": "Calcula tu edad exacta en años, meses y días, los días entre dos fechas, los días hábiles y suma o resta días a una fecha. Gratis y al instante.",
        "h1": "Calculadora de edad y días entre fechas", "lead": "Edad exacta, días entre dos fechas, días hábiles y sumar o restar días, meses o años a una fecha.",
        "ui": ui_dates, "js": "utilidades", "init": "initDates()", "libs": [],
        "steps": [("Elija las fechas.", "Cada tarjeta resuelve un cálculo distinto."),
                  ("Vea el resultado al instante.", "Incluye días hábiles (de lunes a viernes) y el día de la semana.")],
        "faqs": [("¿Los días hábiles incluyen feriados?", "No. Se cuentan de lunes a viernes; reste los feriados nacionales que caigan en el período."),
                 ("¿Debo incluir el último día?", "Depende del uso. Para plazos legales o de alquiler suele incluirse; para calcular cuántos días faltan, no."),
                 ("¿Cómo calcula los meses?", "Sumar un mes al 31 de enero da el 28 o 29 de febrero, es decir, el último día del mes cuando no existe la misma fecha.")],
    },
]

CDN_EXTRA = {
    "pdflib": "https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js",
    "pdfjs": "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js",
    "heic": "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js",
    "jspdf": "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
}

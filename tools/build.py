#!/usr/bin/env python3
"""
Genera todas las páginas HTML de qrfre.com con un diseño común
(cabecera, menú, pie de página, SEO) a partir de:
  - src/partials/*.html  (herramientas: QR, masivo, código de barras)
  - el contenido definido en este archivo

Uso:  python3 tools/build.py
Las páginas generadas se guardan en la raíz del repositorio (listas para Cloudflare).
NO edite a mano los .html generados: edite este script o los partials y vuelva a ejecutarlo.
"""
import datetime as dt
import html
import json
import os

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SITE = "https://qrfre.com"
BRAND = "QR Free"
ADSENSE = "ca-pub-6481587162431047"
TODAY = dt.date.today().isoformat()

CDN = {
    "qr": "https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js",
    "barcode": "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js",
    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js",
    "jszip": "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
    "filesaver": "https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js",
    "icons": "/iconos_db.js",
}

NAV = [
    ("/", "fa-qrcode", "Generador QR", "qr"),
    ("/bulk", "fa-layer-group", "Masivo", "bulk"),
    ("/barcode", "fa-barcode", "Código de Barras", "barcode"),
    ("/plantillas/", "fa-file-excel", "Plantillas Excel", "plantillas"),
]

e = html.escape


def partial(name):
    with open(os.path.join(ROOT, "src", "partials", name + ".html"), encoding="utf-8") as f:
        return f.read()


def indent(text, n):
    pad = " " * n
    return "\n".join(pad + l if l.strip() else "" for l in text.splitlines())


# ---------------------------------------------------------------------
# Layout
# ---------------------------------------------------------------------
def head(p):
    url = SITE + p["url"]
    scripts = "\n".join(f'    <script src="{CDN[s]}"></script>' for s in p.get("scripts", []))
    ld = ""
    for block in p.get("jsonld", []):
        ld += '    <script type="application/ld+json">\n' + indent(json.dumps(block, ensure_ascii=False, indent=2), 4) + "\n    </script>\n"
    robots = p.get("robots", "index, follow")
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>{e(p["title"])}</title>
    <meta name="description" content="{e(p["description"])}">
    <meta name="robots" content="{robots}">
    <link rel="canonical" href="{url}">

    <meta property="og:title" content="{e(p.get("og_title", p["title"]))}">
    <meta property="og:description" content="{e(p["description"])}">
    <meta property="og:image" content="{SITE}/img/og-image.png">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="{url}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="{BRAND}">
    <meta property="og:locale" content="es_PE">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:image" content="{SITE}/img/og-image.png">

    <link rel="icon" type="image/png" href="/escaneo-de-codigo-qr.png">
    <link rel="apple-touch-icon" href="/escaneo-de-codigo-qr.png">
    <meta name="theme-color" content="#0f172a">

    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="/styles.css">

    <meta name="google-adsense-account" content="{ADSENSE}">
    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client={ADSENSE}" crossorigin="anonymous"></script>
{ld}{scripts}
</head>"""


def nav(active):
    links = []
    for href, icon, label, key in NAV:
        cur = ' class="active" aria-current="page"' if key == active else ""
        links.append(f'<a href="{href}"{cur}><i class="fa-solid {icon}" aria-hidden="true"></i> <span>{label}</span></a>')
    cur = ' aria-current="page"' if active == "apoyar" else ""
    links.append(f'<a href="/apoyar" class="nav-cta"{cur}><i class="fa-solid fa-mug-hot" aria-hidden="true"></i> <span>Apoyar</span></a>')
    return f"""    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    <nav class="navbar" aria-label="Principal">
        <div class="navbar-container">
            <a class="brand" href="/"><i class="fa-solid fa-qrcode" aria-hidden="true"></i> {BRAND}</a>
            <div class="nav-links">
                {chr(10).join(" " * 16 + l for l in links).strip()}
            </div>
        </div>
    </nav>"""


def footer():
    year = dt.date.today().year
    tools = [("/", "Generador de QR"), ("/qr-wifi", "QR de WiFi"), ("/qr-whatsapp", "QR de WhatsApp"),
             ("/qr-vcard", "QR de tarjeta de contacto"), ("/bulk", "QR masivo desde Excel"), ("/barcode", "Código de barras")]
    tpls = [("/plantillas/" + t["slug"], t["short"]) for t in TEMPLATES] + [("/plantillas/", "Ver todas")]
    site = [("/apoyar", "Apoyar el proyecto"), ("/acerca", "Acerca de"), ("/contacto", "Contacto"), ("/privacidad", "Privacidad")]

    def col(t, items):
        lis = "\n".join(f'                    <li><a href="{h}">{e(l)}</a></li>' for h, l in items)
        return f"""            <div>
                <h2>{t}</h2>
                <ul>
{lis}
                </ul>
            </div>"""
    return f"""    <footer class="site-footer">
        <div class="footer-grid">
{col("Herramientas", tools)}
{col("Plantillas Excel", tpls)}
{col(BRAND, site)}
        </div>
        <p class="footer-copy">© {year} {BRAND} · Herramientas gratuitas hechas en Perú · Todo se procesa en su navegador: no guardamos sus datos.</p>
    </footer>"""


def page(p, main_html, script=""):
    crumbs = ""
    if p.get("crumbs"):
        items = " <span aria-hidden=\"true\">›</span> ".join(
            f'<a href="{h}">{e(t)}</a>' if h else f'<span aria-current="page">{e(t)}</span>' for t, h, *_ in p["crumbs"])
        crumbs = f'        <nav class="breadcrumb" aria-label="Ruta">{items}</nav>\n'
    header_html = ""
    if p.get("h1"):
        sub = f"\n            <p>{p['lead']}</p>" if p.get("lead") else ""
        header_html = f"""        <div class="page-header">
            <h1>{p["h1"]}</h1>{sub}
        </div>
"""
    body_attr = f' data-qr-type="{p["qr_type"]}"' if p.get("qr_type") else ""
    return f"""{head(p)}
<body{body_attr}>
{nav(p.get("active"))}

    <main class="main-wrapper" id="contenido">
{crumbs}{header_html}{indent(main_html, 8)}
    </main>

{footer()}

    <script src="/main.js"></script>
{script}</body>
</html>
"""


def write(rel, content):
    path = os.path.join(ROOT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("OK ", rel)


# ---------------------------------------------------------------------
# Bloques de contenido
# ---------------------------------------------------------------------
def faq_html(faqs):
    items = "\n".join(
        f"""    <details class="faq-item">
        <summary>{e(q)}</summary>
        <p>{a}</p>
    </details>""" for q, a in faqs)
    return f"""<section class="content-section">
    <h2>Preguntas frecuentes</h2>
{items}
</section>"""


def faq_ld(faqs):
    import re
    strip = lambda s: re.sub(r"<[^>]+>", "", s)
    return {"@context": "https://schema.org", "@type": "FAQPage",
            "mainEntity": [{"@type": "Question", "name": q,
                            "acceptedAnswer": {"@type": "Answer", "text": strip(a)}} for q, a in faqs]}


def steps_html(title, steps):
    lis = "\n".join(f"        <li><strong>{e(t)}</strong> {d}</li>" for t, d in steps)
    return f"""<section class="content-section">
    <h2>{title}</h2>
    <ol class="how-to">
{lis}
    </ol>
</section>"""


def related_html(title, links):
    cards = "\n".join(
        f'    <a class="related-card" href="{h}"><i class="fa-solid {i}" aria-hidden="true"></i><span><strong>{e(t)}</strong>{e(d)}</span></a>'
        for h, i, t, d in links)
    return f"""<section class="content-section">
    <h2>{title}</h2>
    <div class="related-grid">
{cards}
    </div>
</section>"""


def support_banner():
    return """<section class="support-banner">
    <div>
        <h2><i class="fa-solid fa-mug-hot" aria-hidden="true"></i> ¿Le ahorramos tiempo?</h2>
        <p>QR Free es gratis y sin registro. Si le fue útil, puede apoyar con un Yape desde S/ 1 para mantener el sitio y crear más plantillas.</p>
    </div>
    <a class="btn btn-support" href="/apoyar">Apoyar con Yape</a>
</section>"""


def app_ld(name, url, desc):
    return {"@context": "https://schema.org", "@type": "WebApplication", "name": name, "url": SITE + url,
            "description": desc, "applicationCategory": "UtilitiesApplication", "operatingSystem": "Cualquiera (navegador web)",
            "inLanguage": "es", "isAccessibleForFree": True,
            "offers": {"@type": "Offer", "price": "0", "priceCurrency": "PEN"},
            "publisher": {"@type": "Organization", "name": BRAND, "url": SITE + "/"}}


def crumbs_ld(crumbs):
    return {"@context": "https://schema.org", "@type": "BreadcrumbList",
            "itemListElement": [{"@type": "ListItem", "position": i, "name": t, "item": SITE + (h or crumbs[-1][2])}
                                for i, (t, h, *_) in enumerate(crumbs, 1)]}


# ---------------------------------------------------------------------
# 1. Páginas del generador QR (una por búsqueda importante)
# ---------------------------------------------------------------------
RELATED_QR = [
    ("/qr-wifi", "fa-wifi", "QR de WiFi", "Que sus clientes se conecten sin escribir la clave."),
    ("/qr-whatsapp", "fa-comment-dots", "QR de WhatsApp", "Abra un chat con mensaje prellenado."),
    ("/qr-vcard", "fa-address-card", "QR de contacto (vCard)", "Su tarjeta de presentación digital."),
    ("/bulk", "fa-layer-group", "QR masivo desde Excel", "Cientos de QR en un ZIP."),
    ("/plantillas/", "fa-file-excel", "Plantillas Excel gratis", "Docentes, negocios y eventos."),
]

QR_PAGES = [
    {
        "file": "index.html", "url": "/", "qr_type": "url", "active": "qr",
        "title": "Generador de Códigos QR Gratis con Logo | WiFi, WhatsApp, vCard | QR Free",
        "og_title": "QR Free - Generador de Códigos QR Gratis",
        "description": "Crea códigos QR personalizados gratis y sin registro: URL, WhatsApp, WiFi, vCard, email, SMS y ubicación. Agrega tu logo, cambia colores y descarga en PNG o SVG. No caducan.",
        "h1": "Generador de Códigos QR Gratis",
        "lead": "Diseñe códigos QR con su logo, colores y formas. Sin registro, sin marcas de agua y sin fecha de caducidad.",
        "steps": [
            ("Elija el tipo de QR.", "URL, WhatsApp, WiFi, tarjeta de contacto, email, teléfono, SMS, texto o ubicación."),
            ("Escriba el contenido.", "La vista previa se actualiza al instante."),
            ("Personalice el diseño.", "Cambie la forma y el color de los puntos y esquinas, el fondo, y agregue su logo o un ícono."),
            ("Descargue.", "PNG para web y redes, SVG para imprimir en cualquier tamaño sin perder calidad."),
        ],
        "faqs": [
            ("¿Los códigos QR caducan?", "No. Son códigos QR <strong>estáticos</strong>: la información va dentro del propio código, así que funcionan para siempre y no dependen de nuestro sitio."),
            ("¿Es realmente gratis?", "Sí. No pedimos registro, no ponemos marcas de agua y no hay límite de descargas. El sitio se mantiene con publicidad y con <a href=\"/apoyar\">donaciones voluntarias</a>."),
            ("¿Qué formato elijo para imprimir?", "SVG. Es un formato vectorial: puede ampliarlo a un banner o gigantografía sin que se pixele. Para redes sociales o web use PNG."),
            ("¿Poner un logo afecta la lectura?", "Los QR tienen corrección de errores, por eso toleran un logo pequeño al centro. Pruebe siempre el QR con su celular antes de imprimirlo, y use buen contraste (puntos oscuros sobre fondo claro)."),
            ("¿Guardan mis datos?", "No. El QR se genera en su navegador; lo que escribe no se envía a ningún servidor."),
        ],
    },
    {
        "file": "qr-wifi.html", "url": "/qr-wifi", "qr_type": "wifi", "active": "qr",
        "title": "Generador de QR de WiFi Gratis | Comparte tu clave sin escribirla | QR Free",
        "description": "Crea un código QR de WiFi gratis: tus clientes o invitados se conectan escaneándolo con la cámara, sin escribir la contraseña. Ideal para restaurantes, hoteles y oficinas.",
        "h1": "Generador de QR de WiFi",
        "lead": "Sus clientes apuntan la cámara y se conectan. Sin dictar ni escribir la contraseña.",
        "crumbs": [("Inicio", "/"), ("QR de WiFi", None, "/qr-wifi")],
        "steps": [
            ("Escriba el nombre de la red (SSID).", "Debe ser exactamente igual, respetando mayúsculas y espacios."),
            ("Escriba la contraseña y el tipo de seguridad.", "La mayoría de routers usan WPA/WPA2. Si la red no tiene clave elija «Abierta»."),
            ("Personalice y descargue.", "Agregue el ícono de WiFi o su logo y descargue en PNG o SVG."),
            ("Imprímalo y colóquelo a la vista.", "En la mesa, recepción o sala de espera. Funciona con la cámara de Android y iPhone."),
        ],
        "faqs": [
            ("¿Funciona en iPhone y Android?", "Sí. Desde iOS 11 y Android 10 la cámara reconoce los QR de WiFi y ofrece conectarse directamente."),
            ("¿Qué pasa si cambio la contraseña del WiFi?", "Debe generar e imprimir un QR nuevo, porque la clave va guardada dentro del código."),
            ("Mi red tiene caracteres como ; o : en la clave, ¿funciona?", "Sí. El generador escapa automáticamente los caracteres especiales para que el celular lea la clave correctamente."),
            ("¿Es seguro?", "Cualquier persona que escanee el QR podrá conectarse, igual que si le dictara la clave. Para clientes, use de preferencia una red de invitados separada de la red de su negocio."),
        ],
    },
    {
        "file": "qr-whatsapp.html", "url": "/qr-whatsapp", "qr_type": "whatsapp", "active": "qr",
        "title": "Generador de QR de WhatsApp Gratis con Mensaje | QR Free",
        "description": "Crea un código QR de WhatsApp gratis que abre un chat con tu número y un mensaje ya escrito. Ideal para negocios, catálogos, tarjetas y volantes.",
        "h1": "Generador de QR de WhatsApp",
        "lead": "Al escanearlo se abre un chat con su número y un mensaje listo para enviar.",
        "crumbs": [("Inicio", "/"), ("QR de WhatsApp", None, "/qr-whatsapp")],
        "steps": [
            ("Escriba su número con código de país.", "Por ejemplo, para Perú: 51 seguido de su celular (51999888777). Sin el signo + ni espacios es lo más seguro."),
            ("Agregue un mensaje opcional.", "Por ejemplo: «Hola, quiero información sobre sus productos». El cliente solo tiene que pulsar enviar."),
            ("Personalice el diseño.", "Use el ícono de WhatsApp y su color de marca."),
            ("Descargue e imprímalo.", "En volantes, empaques, tarjetas, vitrinas o en su catálogo."),
        ],
        "faqs": [
            ("¿Necesito WhatsApp Business?", "No. Funciona con WhatsApp normal y con WhatsApp Business."),
            ("¿Por qué debo poner el código de país?", "El enlace de WhatsApp (wa.me) lo exige para saber a qué país pertenece el número. Para Perú es 51."),
            ("¿Puedo cambiar el mensaje después?", "El mensaje va dentro del QR, así que para cambiarlo debe generar uno nuevo."),
            ("¿Cómo pruebo que funciona?", "Escanéelo con otro celular antes de imprimir: debe abrir el chat con su número."),
        ],
    },
    {
        "file": "qr-vcard.html", "url": "/qr-vcard", "qr_type": "vcard", "active": "qr",
        "title": "QR de Tarjeta de Presentación (vCard) Gratis | Guarda tu contacto | QR Free",
        "description": "Crea un código QR vCard gratis: al escanearlo, tu nombre, teléfono, email y empresa se guardan en los contactos del celular. Perfecto para tarjetas de presentación.",
        "h1": "QR de Tarjeta de Presentación (vCard)",
        "lead": "Al escanearlo, sus datos se guardan directo en los contactos del celular.",
        "crumbs": [("Inicio", "/"), ("QR de contacto vCard", None, "/qr-vcard")],
        "steps": [
            ("Complete sus datos.", "Nombre, apellido, celular, email y empresa. Solo lo que quiera compartir."),
            ("Revise el tamaño.", "Mientras más datos, más denso el QR. Para tarjetas pequeñas use pocos campos."),
            ("Descargue en SVG.", "Es el formato ideal para enviar a la imprenta."),
            ("Pruébelo.", "Escanéelo: el celular debe ofrecer «Agregar contacto»."),
        ],
        "faqs": [
            ("¿Qué es una vCard?", "Es el formato estándar de tarjeta de contacto que entienden iPhone, Android, Outlook y Gmail."),
            ("¿Mis datos quedan guardados en su sitio?", "No. El QR se genera en su navegador; los datos van dentro del código y no pasan por ningún servidor."),
            ("¿Qué tamaño mínimo debe tener impreso?", "Como referencia, al menos 2 × 2 cm para un vCard sencillo. Pruebe siempre la impresión antes de un tiraje grande."),
        ],
    },
]


def build_qr_pages():
    for p in QR_PAGES:
        p["jsonld"] = [app_ld(p["h1"], p["url"], p["description"]), faq_ld(p["faqs"])]
        if p.get("crumbs"):
            p["jsonld"].append(crumbs_ld(p["crumbs"]))
        p["scripts"] = ["qr", "icons"]
        related = [r for r in RELATED_QR if r[0] != p["url"]]
        main = "\n\n".join([
            partial("qr-tool"),
            steps_html("Cómo crear su código QR", p["steps"]),
            faq_html(p["faqs"]),
            related_html("Otras herramientas gratuitas", related),
            support_banner(),
        ])
        script = f"""    <script>
        document.addEventListener('DOMContentLoaded', () => initSingleQR('{p["qr_type"]}'));
    </script>
"""
        write(p["file"], page(p, main, script))


# ---------------------------------------------------------------------
# 2. Masivo y código de barras
# ---------------------------------------------------------------------
def build_bulk_barcode():
    p = {
        "file": "bulk.html", "url": "/bulk", "active": "bulk",
        "title": "Generador Masivo de Códigos QR y de Barras desde Excel | QR Free",
        "description": "Genera cientos de códigos QR o códigos de barras (EAN-13, Code 128, UPC) a la vez desde un Excel o CSV. Personaliza el diseño y descarga todo en un ZIP. Gratis y sin registro.",
        "h1": "Generación Masiva de QR y Códigos de Barras",
        "lead": "Suba un Excel y obtenga cientos de códigos QR o de barras en un ZIP, cada uno con su nombre.",
        "scripts": ["qr", "barcode", "xlsx", "jszip", "filesaver"],
    }
    faqs = [
        ("¿Cuántos códigos puedo generar a la vez?", "No hay un límite fijo; depende de la memoria de su equipo. Recomendamos lotes de hasta 500 filas, sobre todo en tamaños grandes (2000 o 4000 px)."),
        ("¿Mis archivos se suben a internet?", "No. El Excel se lee y procesa dentro de su navegador. Nada se envía a un servidor."),
        ("¿Por qué algunas filas salen en ERRORES.txt?", "Porque su valor no es válido para el formato elegido. Por ejemplo, un EAN-13 necesita 12 o 13 dígitos y un dígito de control correcto."),
        ("¿Qué pasa si dos filas tienen el mismo nombre?", "No se pierde ninguna: la segunda se guarda como nombre_2, la tercera como nombre_3, etc."),
        ("¿Puedo usarlo para carnets o etiquetas?", "Sí. Por ejemplo, con la lista de su aula o su catálogo de productos. Vea nuestras <a href=\"/plantillas/\">plantillas Excel</a> ya preparadas."),
    ]
    p["jsonld"] = [app_ld("Generador masivo de QR y códigos de barras", p["url"], p["description"]), faq_ld(faqs)]
    main = "\n\n".join([
        partial("bulk-tool"),
        faq_html(faqs),
        related_html("Plantillas que combinan con el generador masivo", [
            ("/plantillas/inventario-codigo-barras", "fa-boxes-stacked", "Inventario con código de barras", "Imprima etiquetas para sus productos."),
            ("/plantillas/lista-invitados-qr", "fa-champagne-glasses", "Lista de invitados con QR", "Un QR de entrada por invitado."),
            ("/plantillas/registro-docente", "fa-chalkboard-user", "Registro docente", "Carnets con QR para su aula."),
        ]),
        support_banner(),
    ])
    write(p["file"], page(p, main, "    <script>\n        document.addEventListener('DOMContentLoaded', initBulkPage);\n    </script>\n"))

    p = {
        "file": "barcode.html", "url": "/barcode", "active": "barcode",
        "title": "Generador de Códigos de Barras Gratis | EAN-13, Code 128, UPC | QR Free",
        "description": "Crea códigos de barras gratis en EAN-13, UPC, Code 128, Code 39 e ITF-14. Elige el color y descarga en SVG vectorial o PNG listo para imprimir.",
        "h1": "Generador de Códigos de Barras",
        "lead": "Etiquetas compatibles con lectores de tienda y logística: EAN-13, UPC, Code 128, Code 39 e ITF-14.",
        "scripts": ["barcode"],
    }
    faqs = [
        ("¿Qué formato debo usar?", "<strong>EAN-13</strong> para productos de venta al público (supermercados, bodegas). <strong>Code 128</strong> para uso interno, logística y códigos con letras. <strong>ITF-14</strong> para cajas de embalaje. <strong>UPC</strong> para productos que se venden en EE. UU."),
        ("¿Puedo inventar un código EAN-13?", "Para uso interno sí. Para vender en cadenas de supermercados necesita códigos oficiales asignados por GS1 de su país."),
        ("¿Por qué me dice que el valor no es válido?", "EAN-13, UPC e ITF-14 solo aceptan números con una cantidad exacta de dígitos y un dígito de control. Si escribe 12 dígitos en EAN-13, el dígito de control se calcula solo."),
        ("¿Cómo imprimo muchas etiquetas?", "Use el <a href=\"/bulk\">generador masivo</a> con un Excel, o nuestra <a href=\"/plantillas/inventario-codigo-barras\">plantilla de inventario</a>."),
    ]
    p["jsonld"] = [app_ld("Generador de códigos de barras", p["url"], p["description"]), faq_ld(faqs)]
    main = "\n\n".join([partial("barcode-tool"), faq_html(faqs), support_banner()])
    write(p["file"], page(p, main, "    <script>\n        document.addEventListener('DOMContentLoaded', generateBarcode);\n    </script>\n"))


# ---------------------------------------------------------------------
# 3. Plantillas Excel
# ---------------------------------------------------------------------
TEMPLATES = [
    {
        "slug": "registro-docente", "file": "registro-docente.xlsx", "icon": "fa-chalkboard-user",
        "short": "Registro docente", "who": "Docentes",
        "title": "Registro Auxiliar Docente en Excel Gratis: Notas y Asistencia | QR Free",
        "h1": "Registro Docente en Excel: notas, asistencia, trabajos y seguimiento",
        "description": "Descarga gratis el registro auxiliar docente en Excel: promedios ponderados, conversión a AD, A, B, C, control de asistencia, entrega de trabajos y alerta de estudiantes en riesgo. Sin macros.",
        "lead": "Un solo archivo para su aula: calcula promedios, convierte a escala literal, controla asistencia y trabajos, y le avisa qué estudiantes necesitan atención.",
        "sheets": [
            ("Config", "Datos del aula y escala de calificación editable: vigesimal (0–20), 0–10 o 0–100, con los mínimos de AD, A, B y C."),
            ("Alumnos", "Escriba la lista una sola vez (hasta 40 estudiantes); aparece sola en las demás hojas."),
            ("Notas", "Hasta 8 criterios o competencias con peso. Promedio ponderado, literal y estado Aprobado/Desaprobado automáticos."),
            ("Asistencia", "30 fechas con P, T, F, J desde una lista desplegable, colores automáticos y % de asistencia."),
            ("Trabajos", "12 trabajos con fecha límite. Marque E (a tiempo), T (tarde) o N (no entregó); si la fecha pasó y está vacío, cuenta como no entregado."),
            ("Seguimiento", "Bitácora de incidencias, logros y comunicaciones con el apoderado, con estado Pendiente/Resuelto."),
            ("Resumen", "Situación de cada estudiante (OK / EN RIESGO) con el motivo, indicadores del aula y gráfico por nivel de logro."),
        ],
        "steps": [
            ("Configure la escala.", "En la hoja Config indique la nota máxima, la aprobatoria y los mínimos de cada nivel."),
            ("Registre a sus estudiantes.", "Solo en la hoja Alumnos."),
            ("Nombre sus criterios y pesos.", "Por ejemplo: Exposición (2), Práctica (1), Examen (3)."),
            ("Registre notas, asistencia y trabajos.", "Las celdas amarillas se llenan; las grises se calculan solas."),
            ("Revise el Resumen.", "Antes de la reunión con padres o del cierre del bimestre."),
        ],
        "faqs": [
            ("¿Sirve para la evaluación por competencias del Minedu?", "Sí. Puede usar cada columna de Notas como una competencia o criterio y el archivo convierte el promedio a AD, A, B o C. Los rangos son editables porque varían según el nivel y la institución; verifique los que exige su institución."),
            ("¿Tiene macros?", "No. Todo funciona con fórmulas, por eso abre sin advertencias de seguridad en Excel, Excel Online, Google Sheets y LibreOffice, también en el celular."),
            ("¿Puedo usarla con varias secciones?", "Sí: haga una copia del archivo por sección o curso."),
            ("¿Cómo creo carnets con QR para mis estudiantes?", "Copie la columna de nombres (y código) a un Excel nuevo y súbalo al <a href=\"/bulk\">generador masivo</a>. Obtendrá un QR por estudiante."),
            ("Borré una fórmula sin querer, ¿qué hago?", "Las fórmulas están protegidas para evitarlo. Si desprotegió la hoja, use Ctrl+Z o vuelva a descargar la plantilla."),
        ],
        "related": ("/bulk", "fa-id-card", "Carnets con QR para su aula", "Genere un QR por estudiante desde su lista."),
    },
    {
        "slug": "inventario-codigo-barras", "file": "inventario-codigo-barras.xlsx", "icon": "fa-boxes-stacked",
        "short": "Inventario con código de barras", "who": "Negocios",
        "title": "Plantilla de Inventario en Excel con Código de Barras Gratis | QR Free",
        "h1": "Plantilla de Inventario con Código de Barras",
        "description": "Descarga gratis una plantilla Excel de inventario: entradas y salidas, stock automático, valor del inventario y alertas de reposición. Compatible con lectores de código de barras.",
        "lead": "Controle su stock con entradas y salidas. El inventario, su valor y las alertas de reposición se calculan solos.",
        "sheets": [
            ("Productos", "Hasta 500 productos con código, costo, precio, margen, stock inicial y mínimo. Stock actual, valor y estado (OK / REPONER / AGOTADO) automáticos."),
            ("Movimientos", "Hasta 5000 entradas y salidas. Elija o escanee el código y el nombre del producto aparece solo; avisa si el código no existe."),
            ("Resumen", "Valor total del inventario, unidades en stock, productos por reponer o agotados."),
        ],
        "steps": [
            ("Registre sus productos.", "Use el código de barras del empaque o uno propio."),
            ("Anote cada movimiento.", "Fecha, código, Entrada o Salida y cantidad."),
            ("Revise los estados.", "REPONER cuando llega al mínimo, AGOTADO cuando llega a 0."),
            ("Imprima etiquetas si las necesita.", "Suba la columna Código al generador masivo de códigos de barras."),
        ],
        "faqs": [
            ("¿Puedo usar un lector de código de barras?", "Sí. Los lectores USB funcionan como un teclado: haga clic en la celda Código de la hoja Movimientos y escanee."),
            ("¿Por qué el código se guarda como texto?", "Para que Excel no borre los ceros iniciales ni muestre los códigos largos en notación científica."),
            ("¿Calcula utilidades?", "Calcula el margen de cada producto y el valor del inventario a costo. Para ventas y gastos use la plantilla de <a href=\"/plantillas/control-ventas-caja\">Ventas y Caja</a>."),
        ],
        "related": ("/barcode", "fa-barcode", "Generador de códigos de barras", "Cree etiquetas EAN-13 o Code 128."),
    },
    {
        "slug": "control-ventas-caja", "file": "control-ventas-caja.xlsx", "icon": "fa-cash-register",
        "short": "Control de ventas y caja", "who": "Negocios",
        "title": "Control de Ventas y Caja en Excel Gratis (Yape, Plin) | QR Free",
        "h1": "Plantilla de Control de Ventas y Caja",
        "description": "Descarga gratis una plantilla Excel para registrar ventas y gastos: resumen mensual, utilidad, cuentas por cobrar y total por medio de pago (efectivo, Yape, Plin, tarjeta).",
        "lead": "Registre ventas y gastos y vea cada mes cuánto vendió, gastó, ganó y le deben, y cuánto entró por Yape, Plin o efectivo.",
        "sheets": [
            ("Ventas", "Hasta 2000 ventas con cliente, producto, cantidad, precio, descuento, medio de pago y estado Pagado/Pendiente."),
            ("Gastos", "Hasta 2000 gastos por categoría: mercadería, alquiler, servicios, sueldos y más."),
            ("Resumen", "Elija el año: ventas, gastos, utilidad y por cobrar de los 12 meses, gráfico y total por medio de pago."),
        ],
        "steps": [
            ("Registre cada venta.", "El total se calcula solo."),
            ("Registre cada gasto.", "Con su categoría para saber en qué se va el dinero."),
            ("Revise el resumen del mes.", "Escriba el año en la hoja Resumen."),
            ("Cobre lo pendiente.", "Filtre las ventas por estado Pendiente."),
        ],
        "faqs": [
            ("¿Sirve para declarar impuestos?", "Le ayuda a ordenar sus números, pero no reemplaza su contabilidad ni los registros que exige SUNAT. Consulte con su contador."),
            ("¿Puedo agregar otros medios de pago?", "Sí: desproteja la hoja (Revisar > Desproteger hoja) y edite la lista de validación de la columna Medio de pago."),
            ("¿Funciona en Google Sheets?", "Sí. Súbala a Google Drive y ábrala con Google Sheets."),
        ],
        "related": ("/", "fa-qrcode", "QR para su negocio", "WhatsApp, WiFi o su catálogo en un QR."),
    },
    {
        "slug": "lista-invitados-qr", "file": "lista-invitados-qr.xlsx", "icon": "fa-champagne-glasses",
        "short": "Lista de invitados con QR", "who": "Eventos",
        "title": "Plantilla Excel Lista de Invitados con QR y WhatsApp Gratis | QR Free",
        "h1": "Lista de Invitados con QR y Confirmación por WhatsApp",
        "description": "Descarga gratis una plantilla Excel para organizar invitados: confirmaciones, mesas, acompañantes, invitaciones por WhatsApp con un clic y código de entrada para generar QR.",
        "lead": "Organice su evento: confirmaciones, mesas, acompañantes, invitaciones por WhatsApp con un clic y un código de entrada por invitado.",
        "sheets": [
            ("Evento", "Nombre, fecha, lugar y el mensaje de invitación."),
            ("Invitados", "Hasta 500 invitados con mesa, acompañantes, confirmación, código de entrada automático (INV-001) y enlace «Enviar WhatsApp»."),
            ("Resumen", "Confirmados, sin respuesta, personas esperadas (con acompañantes) y llegadas."),
        ],
        "steps": [
            ("Complete los datos del evento.", "Incluido el mensaje de invitación."),
            ("Registre a sus invitados.", "Con el teléfono y código de país (51 para Perú)."),
            ("Envíe las invitaciones.", "Clic en «Enviar WhatsApp» en cada fila."),
            ("Genere los QR de entrada.", "Suba las columnas Código y Nombre al generador masivo."),
        ],
        "faqs": [
            ("¿Para qué tipo de eventos sirve?", "Bodas, quinceañeros, cumpleaños, graduaciones, eventos corporativos o actividades escolares."),
            ("¿Cómo controlo la entrada con los QR?", "Escanee el QR del invitado con la cámara del celular: verá su código (INV-001). Búsquelo en la lista y marque «Asistió»."),
            ("¿El enlace de WhatsApp funciona en el celular?", "Sí, en Excel, Google Sheets y LibreOffice. El número debe incluir el código de país."),
        ],
        "related": ("/bulk", "fa-qrcode", "QR de entrada masivos", "Un QR por invitado desde su Excel."),
    },
]


def build_templates():
    # Índice
    cards = "\n".join(f"""    <a class="template-card" href="/plantillas/{t['slug']}">
        <span class="template-tag">{t['who']}</span>
        <i class="fa-solid {t['icon']}" aria-hidden="true"></i>
        <h2>{e(t['short'])}</h2>
        <p>{e(t['lead'])}</p>
        <span class="template-link">Ver y descargar <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></span>
    </a>""" for t in TEMPLATES)
    p = {
        "file": "plantillas/index.html", "url": "/plantillas/", "active": "plantillas",
        "title": "Plantillas Excel Gratis para Docentes, Negocios y Eventos | QR Free",
        "description": "Descarga gratis plantillas Excel listas para usar: registro docente de notas y asistencia, inventario con código de barras, control de ventas y caja, lista de invitados con QR. Sin macros.",
        "h1": "Plantillas Excel Gratis",
        "lead": "Plantillas profesionales listas para usar, sin macros: funcionan en Excel, Google Sheets y LibreOffice, también en el celular.",
        "crumbs": [("Inicio", "/"), ("Plantillas Excel", None, "/plantillas/")],
    }
    p["jsonld"] = [crumbs_ld(p["crumbs"]), {
        "@context": "https://schema.org", "@type": "ItemList",
        "itemListElement": [{"@type": "ListItem", "position": i, "url": f"{SITE}/plantillas/{t['slug']}", "name": t["short"]}
                            for i, t in enumerate(TEMPLATES, 1)]}]
    why = """<section class="content-section">
    <h2>¿Por qué nuestras plantillas no usan macros?</h2>
    <p>Excel bloquea las macros de los archivos descargados de internet y no funcionan en Google Sheets, Excel Online ni en el celular.
    Por eso todo es automático con <strong>fórmulas, listas desplegables y colores condicionales</strong>: abre sin advertencias y funciona en cualquier equipo.
    Las fórmulas están protegidas para que no se borren por accidente (sin contraseña: Revisar &gt; Desproteger hoja).</p>
    <p>¿Necesita una plantilla para su profesión? <a href="/contacto">Escríbanos</a> y la consideramos para las próximas.</p>
</section>"""
    main = "\n\n".join([f'<div class="template-grid">\n{cards}\n</div>', why, support_banner()])
    write(p["file"], page(p, main))

    # Una página por plantilla
    for t in TEMPLATES:
        size_kb = max(1, os.path.getsize(os.path.join(ROOT, "descargas", t["file"])) // 1024)
        sheets = "\n".join(f'        <li><strong>{e(n)}:</strong> {e(d)}</li>' for n, d in t["sheets"])
        others = [(f"/plantillas/{o['slug']}", o["icon"], o["short"], o["who"]) for o in TEMPLATES if o is not t]
        p = {
            "file": f"plantillas/{t['slug']}.html", "url": f"/plantillas/{t['slug']}", "active": "plantillas",
            "title": t["title"], "description": t["description"], "h1": t["h1"], "lead": t["lead"],
            "crumbs": [("Inicio", "/"), ("Plantillas Excel", "/plantillas/"), (t["short"], None, f"/plantillas/{t['slug']}")],
        }
        p["jsonld"] = [crumbs_ld(p["crumbs"]), faq_ld(t["faqs"])]
        download = f"""<section class="download-card">
    <div class="download-info">
        <i class="fa-solid fa-file-excel" aria-hidden="true"></i>
        <div>
            <strong>{e(t['file'])}</strong>
            <span>Excel (.xlsx) · {size_kb} KB · Sin macros · Gratis</span>
        </div>
    </div>
    <a class="btn btn-primary btn-download" href="/descargas/{t['file']}" download data-support="plantilla">
        <i class="fa-solid fa-download" aria-hidden="true"></i> Descargar plantilla gratis
    </a>
    <p class="compat"><i class="fa-solid fa-circle-check" aria-hidden="true"></i> Excel 2010 o superior · Excel Online · Google Sheets · LibreOffice</p>
</section>"""
        includes = f"""<section class="content-section">
    <h2>¿Qué incluye?</h2>
    <ul class="sheet-list">
{sheets}
    </ul>
</section>"""
        main = "\n\n".join([
            download, includes,
            steps_html("Cómo usarla", t["steps"]),
            faq_html(t["faqs"]),
            related_html("También le puede servir", [t["related"]] + others),
            support_banner(),
        ])
        write(p["file"], page(p, main))


# ---------------------------------------------------------------------
# 4. Apoyar, Acerca, Contacto, Privacidad, 404
# ---------------------------------------------------------------------
def build_static():
    p = {
        "file": "apoyar.html", "url": "/apoyar", "active": "apoyar",
        "title": "Apoya a QR Free con Yape | Herramientas gratis hechas en Perú",
        "description": "QR Free es gratis y sin registro. Si te fue útil, puedes apoyar el proyecto con un Yape desde S/ 1 para mantener el sitio y crear más plantillas.",
        "h1": "Apoye a QR Free ☕",
        "lead": "Todas las herramientas y plantillas son gratis y lo seguirán siendo. Su aporte ayuda a pagar el dominio y a crear nuevas plantillas.",
    }
    main = """<div class="support-page">
    <section class="panel support-qr">
        <h2>Yapee desde su celular</h2>
        <img src="/img/yape-qr.png" width="360" height="509" alt="Código QR de Yape para apoyar a QR Free" class="yape-img">
        <a class="btn btn-primary" href="/img/yape-qr.png" download="yape-qr-free.png" data-support-skip>
            <i class="fa-solid fa-download" aria-hidden="true"></i> Guardar QR en mi celular
        </a>
    </section>
    <section class="panel support-steps">
        <h2>¿Cómo apoyar?</h2>
        <h3><i class="fa-solid fa-desktop" aria-hidden="true"></i> Si está en la computadora</h3>
        <ol>
            <li>Abra Yape en su celular y toque <strong>Escanear QR</strong>.</li>
            <li>Apunte a la pantalla, escriba el monto que desee y confirme.</li>
        </ol>
        <h3><i class="fa-solid fa-mobile-screen" aria-hidden="true"></i> Si está en el celular</h3>
        <ol>
            <li>Toque <strong>Guardar QR en mi celular</strong>.</li>
            <li>Abra Yape, toque <strong>Escanear QR</strong> y luego el ícono de <strong>galería</strong> para elegir la imagen.</li>
        </ol>
        <p class="support-amounts">Cualquier monto ayuda: <span>S/ 1</span> <span>S/ 3</span> <span>S/ 5</span> <span>S/ 10</span></p>
        <h3>¿En qué se usa su aporte?</h3>
        <ul>
            <li>Dominio y mantenimiento del sitio.</li>
            <li>Nuevas plantillas Excel para más profesiones.</li>
            <li>Nuevas herramientas: menú QR, carnets, etiquetas imprimibles.</li>
        </ul>
        <p class="hint">Gracias por apoyar herramientas libres y hechas en Perú. 💜</p>
    </section>
</div>"""
    write(p["file"], page(p, main))

    p = {
        "file": "acerca.html", "url": "/acerca",
        "title": "Acerca de QR Free | Herramientas y plantillas gratis",
        "description": "QR Free es un proyecto independiente hecho en Perú que ofrece generadores de códigos QR, códigos de barras y plantillas Excel gratuitas, sin registro.",
        "h1": "Acerca de QR Free",
    }
    main = """<section class="content-section prose">
    <p><strong>QR Free</strong> es un proyecto independiente hecho en Perú con una idea simple: que cualquier docente, emprendedor o profesional tenga herramientas útiles <strong>gratis, sin registro y sin trampas</strong>.</p>
    <h2>Qué ofrecemos</h2>
    <ul>
        <li><a href="/">Generador de códigos QR</a> con logo y colores: URL, WhatsApp, WiFi, vCard, email, SMS y ubicación.</li>
        <li><a href="/bulk">Generación masiva</a> de QR y códigos de barras desde Excel.</li>
        <li><a href="/barcode">Códigos de barras</a> EAN-13, UPC, Code 128, Code 39 e ITF-14.</li>
        <li><a href="/plantillas/">Plantillas Excel</a> para docentes, negocios y eventos.</li>
    </ul>
    <h2>Nuestros principios</h2>
    <ul>
        <li><strong>Privacidad:</strong> todo se procesa en su navegador. No subimos ni guardamos sus datos ni sus archivos.</li>
        <li><strong>Sin caducidad:</strong> los QR son estáticos y funcionan para siempre.</li>
        <li><strong>Sin macros:</strong> las plantillas usan fórmulas y funcionan en Excel, Google Sheets y LibreOffice.</li>
    </ul>
    <h2>¿Cómo se mantiene?</h2>
    <p>Con publicidad de Google AdSense y con <a href="/apoyar">aportes voluntarios por Yape</a>. ¿Tiene una idea o encontró un error? <a href="/contacto">Escríbanos</a>.</p>
</section>"""
    write(p["file"], page(p, main))

    p = {
        "file": "contacto.html", "url": "/contacto",
        "title": "Contacto | QR Free",
        "description": "Contacta con QR Free para sugerir plantillas, reportar errores o consultas.",
        "h1": "Contacto",
    }
    main = """<section class="content-section prose">
    <p>¿Encontró un error, quiere sugerir una plantilla para su profesión o tiene una consulta? Escríbanos:</p>
    <p class="contact-mail"><i class="fa-solid fa-envelope" aria-hidden="true"></i> <a href="mailto:contacto@qrfre.com">contacto@qrfre.com</a></p>
    <p>Para sugerir una plantilla, cuéntenos su profesión, qué registra hoy y qué cálculos le gustaría automatizar.</p>
</section>"""
    write(p["file"], page(p, main))

    p = {
        "file": "privacidad.html", "url": "/privacidad",
        "title": "Política de Privacidad y Cookies | QR Free",
        "description": "Política de privacidad de QR Free: qué datos se procesan, uso de cookies y publicidad de Google AdSense.",
        "h1": "Política de Privacidad y Cookies",
        "lead": f"Última actualización: {dt.date.today().strftime('%d/%m/%Y')}",
    }
    main = """<section class="content-section prose">
    <h2>1. Sus datos no salen de su equipo</h2>
    <p>Los códigos QR, los códigos de barras y el procesamiento de archivos Excel se realizan <strong>íntegramente en su navegador</strong>. El contenido que escribe, los logos y los archivos que sube <strong>no se envían ni se almacenan</strong> en nuestros servidores.</p>
    <h2>2. Publicidad y cookies de terceros</h2>
    <p>Este sitio muestra anuncios de <strong>Google AdSense</strong>. Google y sus socios utilizan cookies para mostrar anuncios basados en sus visitas anteriores a este y otros sitios web.</p>
    <ul>
        <li>Puede conocer cómo Google usa la información en: <a href="https://policies.google.com/technologies/partner-sites" rel="noopener" target="_blank">Cómo utiliza Google los datos cuando usa sitios de nuestros socios</a>.</li>
        <li>Puede desactivar la publicidad personalizada en la <a href="https://adssettings.google.com" rel="noopener" target="_blank">Configuración de anuncios de Google</a> o en <a href="https://www.aboutads.info/choices" rel="noopener" target="_blank">aboutads.info</a>.</li>
    </ul>
    <h2>3. Estadísticas</h2>
    <p>Podemos usar estadísticas agregadas y anónimas (por ejemplo, páginas más visitadas) para mejorar el sitio. No identifican a personas.</p>
    <h2>4. Almacenamiento local</h2>
    <p>Guardamos en su navegador preferencias mínimas (por ejemplo, si ya vio el mensaje de apoyo) para no repetirlo. Puede borrarlas desde la configuración de su navegador.</p>
    <h2>5. Donaciones</h2>
    <p>Los aportes por Yape se procesan dentro de la aplicación Yape. No recibimos ni almacenamos datos de pago.</p>
    <h2>6. Sus derechos</h2>
    <p>De acuerdo con la Ley N.° 29733, Ley de Protección de Datos Personales del Perú, puede ejercer sus derechos de acceso, rectificación, cancelación y oposición escribiendo a <a href="mailto:contacto@qrfre.com">contacto@qrfre.com</a>.</p>
    <h2>7. Cambios</h2>
    <p>Podemos actualizar esta política. La fecha de la última actualización figura al inicio.</p>
</section>"""
    write(p["file"], page(p, main))

    p = {
        "file": "404.html", "url": "/404", "robots": "noindex",
        "title": "Página no encontrada | QR Free",
        "description": "La página que busca no existe.",
    }
    main = """<div class="not-found">
    <h1>404</h1>
    <p>La página que busca no existe o fue movida.</p>
    <a class="btn btn-primary" href="/"><i class="fa-solid fa-qrcode" aria-hidden="true"></i> Ir al generador de QR</a>
    <a class="btn btn-secondary" href="/plantillas/"><i class="fa-solid fa-file-excel" aria-hidden="true"></i> Ver plantillas</a>
</div>"""
    write(p["file"], page(p, main))


# ---------------------------------------------------------------------
# 5. Sitemap
# ---------------------------------------------------------------------
def build_sitemap():
    urls = [("/", "1.0"), ("/qr-wifi", "0.9"), ("/qr-whatsapp", "0.9"), ("/qr-vcard", "0.8"),
            ("/bulk", "0.8"), ("/barcode", "0.8"), ("/plantillas/", "0.9")]
    urls += [(f"/plantillas/{t['slug']}", "0.9") for t in TEMPLATES]
    urls += [("/apoyar", "0.4"), ("/acerca", "0.3"), ("/contacto", "0.3"), ("/privacidad", "0.2")]
    body = "\n".join(f"""  <url>
    <loc>{SITE}{u}</loc>
    <lastmod>{TODAY}</lastmod>
    <priority>{pr}</priority>
  </url>""" for u, pr in urls)
    write("sitemap.xml", f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{body}
</urlset>
""")


if __name__ == "__main__":
    build_qr_pages()
    build_bulk_barcode()
    build_templates()
    build_static()
    build_sitemap()

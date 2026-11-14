# QR Free · qrfre.com

Herramientas gratuitas que funcionan 100 % en el navegador: generador de códigos QR,
QR y códigos de barras masivos desde Excel, códigos de barras y plantillas Excel para
docentes, negocios y eventos.

## Estructura

| Ruta | Qué es |
|---|---|
| `src/partials/` | HTML de cada herramienta (QR, masivo, código de barras). **Edite aquí.** |
| `tools/build.py` | Genera todas las páginas `.html` (menú, pie, SEO, preguntas frecuentes, sitemap). |
| `tools/plantillas.py` | Genera las plantillas Excel de `descargas/` (sin macros). |
| `main.js`, `styles.css` | Lógica y estilos compartidos. |
| `iconos_db.js` | Íconos para el centro del QR. |
| `img/` | Imagen para redes (`og-image.png`) y QR de Yape (`yape-qr.png`). |
| `simple/` | Versión antigua (no indexada). |

> Los `.html` de la raíz y de `plantillas/` se **generan**: no los edite a mano.

## Cómo actualizar

```bash
pip install openpyxl          # una sola vez
python3 tools/plantillas.py   # si cambió alguna plantilla Excel
python3 tools/build.py        # siempre después de editar contenido o partials
```

Luego haga commit y push: Cloudflare publica los archivos tal cual (no requiere comando de build).

### Agregar una plantilla nueva
1. Cree la función en `tools/plantillas.py` y regístrela en `PLANTILLAS`.
2. Agregue su ficha (título, descripción, hojas, pasos, preguntas) a `TEMPLATES` en `tools/build.py`.
3. Ejecute ambos scripts.

## Pendientes de configuración (fuera del código)
- **Correo de contacto:** activar *Email Routing* en Cloudflare para que `contacto@qrfre.com` reenvíe a su Gmail.
- **Google Search Console:** verificar el dominio y enviar `https://qrfre.com/sitemap.xml`.
- **AdSense:** en *Privacidad y mensajería* activar el mensaje de consentimiento (GDPR) para visitantes de Europa.

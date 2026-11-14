# Web Interface Guidelines + Make Interfaces Feel Better — QR Free

Fecha: 2026-11-14 · Reglas: vercel-labs/web-interface-guidelines (command.md) · Estado: ✅ corregido · ➖ no aplica · ⏳ pendiente

## styles.css

- `transition: all` en `.chip`, `.segmented span`, `.preset`, `.dropzone`, `.icon-preset`, `.related-card`, `.template-card` → propiedades explícitas ✅
- sin `text-wrap: balance` en títulos ni `pretty` en párrafos ✅
- sin `tabular-nums` en progreso, conteos, HEX, números de paso ✅
- sin `touch-action: manipulation` ni `-webkit-tap-highlight-color` ✅
- sin `color-scheme` en `html` ✅
- menú móvil y diálogo sin `overscroll-behavior: contain` ✅
- barra fija inferior podía tapar el foco → `scroll-padding-bottom` ✅
- `.btn-sm` 34 px, `.modal-close` 36 px → 40 px / 44 px ✅
- `--muted` 4.47:1 y placeholder 2.56:1 → ≥ 4.5:1 ✅
- botones con `translateY` al presionar → `scale(.97)` (también chips, estilos, íconos) ✅
- imágenes (QR Yape, logo) sin contorno sutil → `outline: 1px rgba(…,.08)` ✅
- toasts y diálogo desaparecían de golpe → salida suave 150 ms (`opacity` + `translateY 4px`) ✅

## main.js

- placeholders y estados con `...` → `…` ("Generando…", "Empaquetando ZIP…") ✅
- inputs sin `name` / `autocomplete`; email, URL y SSID sin `spellcheck="false"` ✅
- números sin formato local → `Intl.NumberFormat("es-PE")` ✅
- radiogroup de tipos sin flechas → patrón ARIA completo ✅
- foco automático en móvil abría el teclado → solo `pointer: fine` ✅
- diálogo sin fondo inerte → `inert` ✅

## src/partials/*.html

- `#barcode-error` y `#bar-validity` sin región viva → `aria-live` / `role="status"` ✅
- selects y archivos sin `name` ✅
- "Iniciando..." → "Iniciando…" ✅

## tools/build.py (cabecera y panel de diseño)

- `theme-color` `#0f172a` no coincidía con la cabecera blanca → `#ffffff` ✅
- sin `preconnect` a cdnjs / unpkg ✅
- `<img>` del logo sin `width`/`height` ✅
- rango del logo sin valor visible → "35 %" + `aria-valuetext` ✅
- marca sin `translate="no"` ✅

## No aplica (➖)

- Title Case en títulos: es una regla del inglés; en español se usa mayúscula solo al inicio.
- Sincronizar estado en la URL: posible mejora (p. ej. `?tipo=wifi`), pero las páginas `/qr-wifi`, `/qr-whatsapp` ya cubren los casos principales.
- Virtualización de listas: la lista más larga tiene 45 íconos.
- Hidratación / `AnimatePresence`: el sitio no usa React.

## Pendiente (⏳)

- Modo oscuro (`color-scheme: dark`, `select` con colores explícitos).
- Reemplazar Font Awesome (≈100 KB) por íconos SVG propios.
- `preload` de la fuente Inter.

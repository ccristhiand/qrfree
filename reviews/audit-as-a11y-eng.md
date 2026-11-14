# Accessibility Audit: QR Free (sitio estático)

**Perspective**: Accessibility Engineer
**Date**: 2026-11-14
**Plan**: implementación actual (rama `dev`) — `src/partials/*.html`, `tools/build.py`, `main.js`, `styles.css`

## Plan Summary
Sitio estático con tres herramientas interactivas (generador QR, masivo, código de barras), pestañas, diálogo de apoyo, menú móvil y avisos. Riesgos: widgets propios (chips tipo radio, pestañas, zona de arrastre), diálogo modal y contenido dinámico.

## Files Reviewed
| File | A11y Role | Risk |
|------|----------|------|
| `src/partials/qr-tool.html` | Radiogroup de tipos, formularios, vista previa en vivo | Alto |
| `src/partials/bulk-tool.html` | Zona de archivo, tabla de vista previa, progreso | Alto |
| `src/partials/barcode-tool.html` | Formulario con validación en línea | Medio |
| `tools/build.py` | Cabecera, menú móvil, panel de diseño, landmarks | Medio |
| `main.js` | Pestañas, diálogo, toasts, navegación | Alto |
| `styles.css` | Foco, contraste, movimiento | Medio |

## Verdict: APPROVE (después de las correcciones aplicadas)

## Critical Issues (Must Fix) — todas corregidas
| # | Issue | WCAG Criterion | File(s) | Impact | Fix aplicado |
|---|-------|---------------|---------|--------|-----|
| 1 | Chips con `role="radio"` sin flechas ni tabindex itinerante: 9 paradas de Tab y patrón ARIA roto | 2.1.1, 4.1.2 | `main.js` (initSingleQR, setType) | Usuarios de teclado/lector | Flechas ←→↑↓ cambian la selección; solo el chip activo está en el orden de Tab |
| 2 | Diálogo de apoyo: el lector de pantalla podía recorrer el fondo | 2.4.3, 1.3.1 | `main.js` (showSupport) | Lector de pantalla | Fondo con `inert` mientras está abierto; se libera al cerrar |
| 3 | Texto atenuado `--muted` 4.47:1 sobre el fondo (bajo AA) | 1.4.3 | `styles.css` | Baja visión | `#5b6b80` → 5.11:1 (fondo) y 5.44:1 (blanco) |
| 4 | Placeholder 2.56:1 | 1.4.3 | `styles.css` | Baja visión | `#64748b` → 4.76:1 |
| 5 | Botones pequeños (34 px) y cerrar diálogo (36 px) bajo el mínimo táctil | 2.5.8 | `styles.css` | Motricidad / táctil | 40 px y 44 px |

## Recommendations — aplicadas
| # | Issue | WCAG Criterion | Fix |
|---|-------|---------------|-----|
| 1 | Error de código de barras sin región viva | 4.1.3 | `aria-live="polite"` en `#barcode-error` |
| 2 | Validez de filas (masivo) sin anuncio | 4.1.3 | `role="status"` en `#bar-validity` |
| 3 | Control deslizante del logo anunciaba "0.35" | 1.3.1 | `aria-valuetext` y salida visible "35 %" |
| 4 | Al elegir tipo en móvil se abría el teclado sin pedirlo | 3.2.1 | Foco automático solo con puntero fino (`pointer: fine`) |
| 5 | Barra inferior móvil podía tapar el campo enfocado | 2.4.11 | `scroll-padding-bottom` cuando existe la barra |
| 6 | Nombre de marca podía traducirse automáticamente | 3.1.2 | `translate="no"` en "QR Free" |
| 7 | Cierre del diálogo: el fondo seguía capturando clics durante la animación | 2.1.1 | `pointer-events: none` al cerrar |

## Nice-to-Haves (pendientes)
| # | Suggestion | Rationale |
|---|------------|-----------|
| 1 | Modo oscuro con contraste verificado | Preferencia del sistema; reduce fatiga |
| 2 | Íconos SVG propios en lugar de Font Awesome | Si la CDN falla, los íconos decorativos desaparecen (ya tienen `aria-hidden`, no afecta el significado) |
| 3 | Anunciar "QR actualizado" con menos frecuencia | Hoy el estado se anuncia en cada tecla (cortés pero repetitivo) |

## Keyboard Navigation Walkthrough (verificado con Playwright)
| Step | Action | Expected Focus | Expected Announcement | Plan Handles? |
|------|--------|---------------|----------------------|---------------|
| 1 | Tab | "Saltar al contenido" | enlace | ✅ |
| 2 | Enter | `<main id="contenido">` | región principal | ✅ |
| 3 | Tab hasta tipos | Chip activo "Enlace" (1 sola parada) | radio, marcado, 1 de 9 | ✅ |
| 4 | → | "WhatsApp" seleccionado | radio, marcado | ✅ |
| 5 | Tab | Campo del formulario | etiqueta del campo | ✅ |
| 6 | Pestañas ← → | "Logo" visible | pestaña, seleccionada | ✅ |
| 7 | Enter en Descargar | Descarga | "Descarga iniciada" (toast, polite) | ✅ |
| 8 | Diálogo | Botón "Cerrar" | diálogo "¡Listo!…" | ✅ |
| 9 | Tab ×4 | Sigue dentro del diálogo | — | ✅ |
| 10 | Esc | Vuelve a "Descargar PNG" | — | ✅ |
| 11 | Masivo: Tab a zona de archivo | "Arrastre su archivo…" | botón | ✅ |
| 12 | Enter | Abre selector de archivos | — | ✅ |

## ARIA Checklist
| Element | Role | Label | States | Keyboard | Notes |
|---------|------|-------|--------|----------|-------|
| Tipos de QR | radiogroup / radio | "Tipo de código QR" | aria-checked | Flechas, tabindex itinerante | ✅ |
| Estilo / Logo | tablist / tab / tabpanel | aria-labelledby | aria-selected | Flechas | ✅ |
| Estilos rápidos, íconos | button | texto / aria-label | aria-pressed | Enter/Espacio | ✅ |
| Formato, tamaño, modo | radios nativos | aria-labelledby | checked | Flechas nativas | ✅ |
| Zona de archivo | button (div) | texto + aria-describedby | — | Enter/Espacio, arrastrar opcional | ✅ alternativa a arrastrar |
| Menú móvil | button | "Abrir/Cerrar menú" | aria-expanded | Esc cierra | ✅ |
| Diálogo apoyo | dialog | aria-labelledby | aria-modal, fondo inert | Tab atrapado, Esc | ✅ |
| Toasts | status | — | aria-live polite | — | ✅ |
| Estado del QR | status | — | aria-live polite | — | ✅ |

## Verdict Details
- Screen Reader Compatibility: PASS — axe-core 4.10 (WCAG 2.1 A/AA + buenas prácticas): **0 problemas en 16 páginas**
- Keyboard Navigation: PASS
- Focus Management: PASS
- Color Contrast: PASS (todos los pares de texto ≥ 4.5:1)
- Motion Sensitivity: PASS (`prefers-reduced-motion` desactiva animaciones y desplazamiento suave)

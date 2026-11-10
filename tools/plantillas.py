#!/usr/bin/env python3
"""
Genera las plantillas Excel gratuitas de QR Free en /descargas.

Uso:  python3 tools/plantillas.py
Requiere: openpyxl (pip install openpyxl)

Las plantillas NO usan macros: todo es automático con fórmulas, listas
desplegables y formato condicional, así funcionan en Excel (escritorio,
web y móvil), Google Sheets y LibreOffice.
"""
import os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side, Protection
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.workbook.defined_name import DefinedName
from openpyxl.chart import BarChart, Reference
from openpyxl.utils import get_column_letter as L

OUT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "descargas"))

# ---------- Estilos ----------
DARK = "0F172A"
ACCENT = "0284C7"
F_TITLE = Font(name="Calibri", size=16, bold=True, color=DARK)
F_SUB = Font(name="Calibri", size=10, italic=True, color="64748B")
F_HEAD = Font(name="Calibri", size=10, bold=True, color="FFFFFF")
F_BOLD = Font(name="Calibri", size=10, bold=True, color=DARK)
F_LINK = Font(name="Calibri", size=10, color=ACCENT, underline="single")
FILL_HEAD = PatternFill("solid", fgColor=DARK)
FILL_SUBHEAD = PatternFill("solid", fgColor="E2E8F0")
FILL_CALC = PatternFill("solid", fgColor="F1F5F9")
FILL_INPUT = PatternFill("solid", fgColor="FFFBEB")
THIN = Side(style="thin", color="CBD5E1")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
WRAP = Alignment(vertical="top", wrap_text=True)

RED_FILL = PatternFill("solid", fgColor="FEE2E2")
RED_FONT = Font(color="B91C1C", bold=True)
GREEN_FILL = PatternFill("solid", fgColor="DCFCE7")
GREEN_FONT = Font(color="15803D", bold=True)
AMBER_FILL = PatternFill("solid", fgColor="FEF3C7")
AMBER_FONT = Font(color="B45309", bold=True)
BLUE_FILL = PatternFill("solid", fgColor="DBEAFE")
BLUE_FONT = Font(color="1D4ED8", bold=True)

UNLOCKED = Protection(locked=False)

FIRST = 7  # primera fila de datos en las hojas de registro
SITE = "https://qrfre.com"


def new_wb():
    wb = Workbook()
    wb.remove(wb.active)
    wb.calculation.fullCalcOnLoad = True
    return wb


def name(wb, nm, ref):
    wb.defined_names[nm] = DefinedName(nm, attr_text=ref)


def title(ws, text, sub=None):
    ws["A1"] = text
    ws["A1"].font = F_TITLE
    ws.row_dimensions[1].height = 26
    if sub:
        ws["A2"] = sub
        ws["A2"].font = F_SUB


def widths(ws, mapping):
    for col, w in mapping.items():
        ws.column_dimensions[col].width = w


def header(ws, row, labels, start_col=1):
    for i, lab in enumerate(labels):
        c = ws.cell(row=row, column=start_col + i, value=lab)
        c.font = F_HEAD
        c.fill = FILL_HEAD
        c.alignment = CENTER
        c.border = BORDER
    ws.row_dimensions[row].height = 30


def style_range(ws, ref, fill=None, fmt=None, unlocked=False, align=None):
    for row in ws[ref]:
        for c in row:
            c.border = BORDER
            if fill:
                c.fill = fill
            if fmt:
                c.number_format = fmt
            if unlocked:
                c.protection = UNLOCKED
            if align:
                c.alignment = align


def protect(ws):
    """Protege las fórmulas (sin contraseña: Revisar > Desproteger hoja)."""
    p = ws.protection
    p.sheet = True
    p.formatColumns = False
    p.formatRows = False
    p.formatCells = False
    p.sort = False
    p.autoFilter = False


def list_validation(ws, ref, items_or_formula, prompt=None):
    f = items_or_formula if items_or_formula.startswith("=") else f'"{items_or_formula}"'
    dv = DataValidation(type="list", formula1=f, allow_blank=True)
    dv.error = "Elija un valor de la lista."
    dv.errorTitle = "Valor no válido"
    if prompt:
        dv.prompt = prompt
        dv.showInputMessage = True
    ws.add_data_validation(dv)
    dv.add(ref)


def instructions(wb, title_text, intro, steps, extra=None):
    ws = wb.create_sheet("Instrucciones")
    ws.sheet_view.showGridLines = False
    widths(ws, {"A": 4, "B": 100})
    ws["B1"] = title_text
    ws["B1"].font = Font(size=18, bold=True, color=DARK)
    ws["B2"] = intro
    ws["B2"].font = Font(size=11, color="334155")
    ws["B2"].alignment = WRAP
    ws.row_dimensions[2].height = 45
    r = 4
    ws.cell(row=r, column=2, value="CÓMO USARLA").font = F_BOLD
    r += 1
    for i, s in enumerate(steps, 1):
        ws.cell(row=r, column=1, value=i).font = Font(bold=True, color=ACCENT)
        c = ws.cell(row=r, column=2, value=s)
        c.alignment = WRAP
        ws.row_dimensions[r].height = 32 if len(s) > 95 else 18
        r += 1
    r += 1
    legend = [
        ("Celdas amarillas", "Se llenan a mano.", FILL_INPUT),
        ("Celdas grises", "Se calculan solas (están protegidas para no borrar fórmulas).", FILL_CALC),
    ]
    ws.cell(row=r, column=2, value="LEYENDA").font = F_BOLD
    r += 1
    for lab, txt, fill in legend:
        ws.cell(row=r, column=1).fill = fill
        ws.cell(row=r, column=1).border = BORDER
        ws.cell(row=r, column=2, value=f"{lab}: {txt}")
        r += 1
    if extra:
        r += 1
        for line in extra:
            c = ws.cell(row=r, column=2, value=line)
            c.alignment = WRAP
            r += 1
    r += 1
    ws.cell(row=r, column=2, value="Para quitar la protección: Revisar > Desproteger hoja (no tiene contraseña).").font = F_SUB
    r += 1
    ws.cell(row=r, column=2, value="No contiene macros: funciona en Excel, Excel Online, Google Sheets y LibreOffice.").font = F_SUB
    r += 2
    c = ws.cell(row=r, column=2, value="Plantilla gratuita de QR Free · qrfre.com · Si te fue útil, apóyanos con Yape: qrfre.com/apoyar")
    c.font = F_LINK
    c.hyperlink = f"{SITE}/apoyar"
    return ws


def urlenc(expr):
    """Codifica texto para URL con SUBSTITUTE (ENCODEURL no existe en Excel Mac/Web)."""
    for a, b in [("%", "%25"), ("&", "%26"), ("#", "%23"), ("?", "%3F"), ("+", "%2B"),
                 (" ", "%20"), ('CHAR(10)', "%0A")]:
        src = a if a == "CHAR(10)" else f'"{a}"'
        expr = f'SUBSTITUTE({expr},{src},"{b}")'
    return expr


def finish(ws, freeze=None, landscape=True):
    if freeze:
        ws.freeze_panes = freeze
    ws.page_setup.orientation = "landscape" if landscape else "portrait"
    ws.page_setup.fitToWidth = 1
    ws.page_setup.fitToHeight = 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True
    ws.print_options.horizontalCentered = True


# =====================================================================
# 1. REGISTRO DOCENTE
# =====================================================================
def registro_docente():
    N = 40
    LAST = FIRST + N - 1
    wb = new_wb()

    instructions(
        wb, "Registro Docente: notas, asistencia, trabajos y seguimiento",
        "Un solo archivo para llevar el registro auxiliar de su aula: calcula promedios ponderados, "
        "convierte a escala literal (AD, A, B, C), controla asistencia y entrega de trabajos, y detecta "
        "automáticamente a los estudiantes en riesgo.",
        [
            "Hoja Config: escriba los datos del aula y revise la escala (nota máxima, nota aprobatoria y los mínimos para AD, A, B y C).",
            "Hoja Alumnos: escriba la lista de estudiantes UNA sola vez (hasta 40). Los nombres aparecen solos en las demás hojas.",
            "Hoja Notas: escriba el nombre de cada criterio o competencia y su peso. Luego registre las notas; el promedio, el literal y el estado se calculan solos.",
            "Hoja Asistencia: escriba la fecha de cada clase en la fila de encabezado y marque P (presente), T (tardanza), F (falta) o J (justificada).",
            "Hoja Trabajos: escriba el nombre de cada trabajo y su fecha límite. Marque E (entregó a tiempo), T (tarde) o N (no entregó). Si la fecha límite pasó y la celda está vacía, cuenta como no entregado.",
            "Hoja Seguimiento: anote incidencias, conversaciones con el apoderado y acuerdos. Marque si están Pendientes o Resueltos.",
            "Hoja Resumen: vea el estado de cada estudiante, los motivos de alerta y las estadísticas del aula.",
        ],
        extra=[
            "Escala: viene configurada en vigesimal (0 a 20) con conversión a literal. Para escala 0 a 10 o 0 a 100 solo cambie la nota máxima, la aprobatoria y los mínimos de cada nivel.",
            "Pesos: no necesitan sumar 100. Si un criterio todavía no tiene nota, no se cuenta en el promedio.",
            "Consejo: suba la columna de nombres al Generador Masivo de qrfre.com para crear carnets con código QR por estudiante.",
        ],
    )

    # ---------- Config ----------
    ws = wb.create_sheet("Config")
    ws.sheet_view.showGridLines = False
    title(ws, "Configuración del aula", "Complete las celdas amarillas.")
    widths(ws, {"A": 38, "B": 30, "C": 34})
    datos = [("Institución educativa", ""), ("Docente", ""), ("Área / Curso", ""),
             ("Grado y sección", ""), ("Periodo (bimestre / trimestre)", "I Bimestre"), ("Año", 2026)]
    for i, (k, v) in enumerate(datos, start=4):
        ws.cell(row=i, column=1, value=k).font = F_BOLD
        c = ws.cell(row=i, column=2, value=v)
    style_range(ws, "B4:B9", fill=FILL_INPUT, unlocked=True)

    ws["A11"] = "ESCALA DE CALIFICACIÓN"; ws["A11"].font = Font(bold=True, color=ACCENT)
    rows = [("Nota máxima", 20, "NotaMax", None), ("Nota mínima aprobatoria", 11, "NotaAprob", None),
            ("Decimales en el promedio (0 = redondea a entero)", 0, "Decimales", None)]
    for i, (k, v, nm, _) in enumerate(rows, start=12):
        ws.cell(row=i, column=1, value=k).font = F_BOLD
        ws.cell(row=i, column=2, value=v)
        name(wb, nm, f"Config!$B${i}")
    style_range(ws, "B12:B14", fill=FILL_INPUT, unlocked=True)

    ws["A16"] = "CONVERSIÓN A LITERAL (nota mínima de cada nivel)"; ws["A16"].font = Font(bold=True, color=ACCENT)
    niveles = [("AD", 18, "Logro destacado", "MinAD"), ("A", 14, "Logro esperado", "MinA"),
               ("B", 11, "En proceso", "MinB"), ("C", 0, "En inicio", None)]
    for i, (lit, v, desc, nm) in enumerate(niveles, start=17):
        ws.cell(row=i, column=1, value=lit).font = F_BOLD
        ws.cell(row=i, column=2, value=v)
        ws.cell(row=i, column=3, value=desc).font = F_SUB
        if nm:
            name(wb, nm, f"Config!$B${i}")
    style_range(ws, "B17:B19", fill=FILL_INPUT, unlocked=True)
    style_range(ws, "B20:B20", fill=FILL_CALC)

    ws["A22"] = "ALERTAS DE RIESGO"; ws["A22"].font = Font(bold=True, color=ACCENT)
    ws["A23"] = "Asistencia mínima"; ws["B23"] = 0.7; ws["B23"].number_format = "0%"
    ws["A24"] = "Trabajos no entregados para alertar"; ws["B24"] = 2
    ws["A23"].font = ws["A24"].font = F_BOLD
    name(wb, "UmbralAsist", "Config!$B$23")
    name(wb, "UmbralNE", "Config!$B$24")
    style_range(ws, "B23:B24", fill=FILL_INPUT, unlocked=True)
    protect(ws)
    finish(ws, landscape=False)

    aula = '=TRIM(Config!$B$6&"  ·  "&Config!$B$7&"  ·  "&Config!$B$8&"  ·  "&Config!$B$5)'

    def student_col(ws, col_n=1, col_name=2):
        for r in range(FIRST, LAST + 1):
            ws.cell(row=r, column=col_n, value=r - FIRST + 1).alignment = CENTER
            ws.cell(row=r, column=col_name, value=f'=IF(Alumnos!$B{r}="","",Alumnos!$B{r})')
        style_range(ws, f"{L(col_n)}{FIRST}:{L(col_name)}{LAST}", fill=FILL_CALC)

    # ---------- Alumnos ----------
    ws = wb.create_sheet("Alumnos")
    title(ws, "Lista de estudiantes")
    ws["A2"] = aula; ws["A2"].font = F_SUB
    header(ws, 6, ["N°", "Apellidos y nombres", "Código / DNI", "Apoderado", "Teléfono apoderado", "Observaciones"])
    for r in range(FIRST, LAST + 1):
        ws.cell(row=r, column=1, value=r - FIRST + 1).alignment = CENTER
    style_range(ws, f"A{FIRST}:A{LAST}", fill=FILL_CALC)
    style_range(ws, f"B{FIRST}:F{LAST}", fill=FILL_INPUT, unlocked=True)
    style_range(ws, f"C{FIRST}:C{LAST}", fmt="@")
    style_range(ws, f"E{FIRST}:E{LAST}", fmt="@")
    widths(ws, {"A": 5, "B": 38, "C": 15, "D": 30, "E": 18, "F": 40})
    name(wb, "ListaAlumnos", f"Alumnos!$B${FIRST}:$B${LAST}")
    protect(ws)
    finish(ws, "C7")

    # ---------- Notas ----------
    NC = 8  # criterios
    ws = wb.create_sheet("Notas")
    title(ws, "Registro de notas")
    ws["A2"] = aula; ws["A2"].font = F_SUB
    ws["A3"] = "Escriba el nombre y el peso de cada criterio/competencia. El promedio es ponderado y solo usa las notas registradas."
    ws["A3"].font = F_SUB
    c1, cN = 3, 2 + NC
    cP, cL, cE = cN + 1, cN + 2, cN + 3
    header(ws, 6, ["N°", "Estudiante"] + [f"Criterio {i}" for i in range(1, NC + 1)] + ["Promedio", "Literal", "Estado"])
    for col in range(c1, cN + 1):  # nombres editables
        ws.cell(row=6, column=col).protection = UNLOCKED
        ws.cell(row=6, column=col).fill = PatternFill("solid", fgColor="334155")
    ws.cell(row=5, column=2, value="Peso →").font = F_BOLD
    ws.cell(row=5, column=2).alignment = Alignment(horizontal="right")
    for col in range(c1, cN + 1):
        ws.cell(row=5, column=col, value=1)
    style_range(ws, f"{L(c1)}5:{L(cN)}5", fill=FILL_INPUT, unlocked=True, align=CENTER)
    student_col(ws)
    rg = lambda r: f"{L(c1)}{r}:{L(cN)}{r}"
    w = f"${L(c1)}$5:${L(cN)}$5"
    for r in range(FIRST, LAST + 1):
        ws.cell(row=r, column=cP, value=(
            f'=IF(COUNT({rg(r)})=0,"",ROUND(SUMPRODUCT({rg(r)},{w})/SUMPRODUCT(--({rg(r)}<>""),{w}),Decimales))'))
        P = f"{L(cP)}{r}"
        ws.cell(row=r, column=cL, value=f'=IF({P}="","",IF({P}>=MinAD,"AD",IF({P}>=MinA,"A",IF({P}>=MinB,"B","C"))))')
        ws.cell(row=r, column=cE, value=f'=IF({P}="","",IF({P}>=NotaAprob,"Aprobado","Desaprobado"))')
    style_range(ws, f"{L(c1)}{FIRST}:{L(cN)}{LAST}", fill=FILL_INPUT, unlocked=True, align=CENTER)
    style_range(ws, f"{L(cP)}{FIRST}:{L(cE)}{LAST}", fill=FILL_CALC, align=CENTER)
    dv = DataValidation(type="decimal", operator="between", formula1="0", formula2="NotaMax", allow_blank=True)
    dv.error = "La nota debe estar entre 0 y la nota máxima de la hoja Config."
    dv.errorTitle = "Nota fuera de rango"
    ws.add_data_validation(dv)
    dv.add(f"{L(c1)}{FIRST}:{L(cN)}{LAST}")
    notas_rg = f"{L(c1)}{FIRST}:{L(cP)}{LAST}"
    ws.conditional_formatting.add(notas_rg, CellIsRule(operator="lessThan", formula=["NotaAprob"], font=RED_FONT))
    lit_rg = f"{L(cL)}{FIRST}:{L(cL)}{LAST}"
    for val, fill, font in [("AD", GREEN_FILL, GREEN_FONT), ("A", BLUE_FILL, BLUE_FONT),
                            ("B", AMBER_FILL, AMBER_FONT), ("C", RED_FILL, RED_FONT)]:
        ws.conditional_formatting.add(lit_rg, CellIsRule(operator="equal", formula=[f'"{val}"'], fill=fill, font=font))
    est_rg = f"{L(cE)}{FIRST}:{L(cE)}{LAST}"
    ws.conditional_formatting.add(est_rg, CellIsRule(operator="equal", formula=['"Desaprobado"'], fill=RED_FILL, font=RED_FONT))
    ws.conditional_formatting.add(est_rg, CellIsRule(operator="equal", formula=['"Aprobado"'], fill=GREEN_FILL, font=GREEN_FONT))
    widths(ws, {"A": 5, "B": 34, **{L(c): 11 for c in range(c1, cN + 1)}, L(cP): 11, L(cL): 9, L(cE): 13})
    protect(ws)
    finish(ws, "C7")
    PROM_COL, LIT_COL, EST_COL = L(cP), L(cL), L(cE)

    # ---------- Asistencia ----------
    ND = 30
    ws = wb.create_sheet("Asistencia")
    title(ws, "Control de asistencia")
    ws["A2"] = aula; ws["A2"].font = F_SUB
    ws["A3"] = "Escriba la fecha de cada clase en la fila de encabezado. Marque P = presente, T = tardanza, F = falta, J = falta justificada."
    ws["A3"].font = F_SUB
    d1, dN = 3, 2 + ND
    cP_, cT_, cF_, cJ_, cPct = dN + 1, dN + 2, dN + 3, dN + 4, dN + 5
    header(ws, 6, ["N°", "Estudiante"] + [None] * ND + ["P", "T", "F", "J", "% Asistencia"])
    ws.cell(row=5, column=2, value="Fecha de clase →").font = F_BOLD
    ws.cell(row=5, column=2).alignment = Alignment(horizontal="right")
    for col in range(d1, dN + 1):
        c = ws.cell(row=6, column=col)
        c.number_format = "dd/mm"
        c.protection = UNLOCKED
        c.fill = PatternFill("solid", fgColor="334155")
        ws.column_dimensions[L(col)].width = 6.5
    student_col(ws)
    style_range(ws, f"{L(d1)}{FIRST}:{L(dN)}{LAST}", fill=FILL_INPUT, unlocked=True, align=CENTER)
    for r in range(FIRST, LAST + 1):
        rg_ = f"{L(d1)}{r}:{L(dN)}{r}"
        for col, code in [(cP_, "P"), (cT_, "T"), (cF_, "F"), (cJ_, "J")]:
            ws.cell(row=r, column=col, value=f'=IF($B{r}="","",COUNTIF({rg_},"{code}"))')
        tot = f"({L(cP_)}{r}+{L(cT_)}{r}+{L(cF_)}{r}+{L(cJ_)}{r})"
        ws.cell(row=r, column=cPct, value=(
            f'=IF(OR($B{r}="",{L(cP_)}{r}=""),"",IF({tot}=0,"",({L(cP_)}{r}+{L(cT_)}{r}+{L(cJ_)}{r})/{tot}))'))
    style_range(ws, f"{L(cP_)}{FIRST}:{L(cPct)}{LAST}", fill=FILL_CALC, align=CENTER)
    style_range(ws, f"{L(cPct)}{FIRST}:{L(cPct)}{LAST}", fmt="0%")
    list_validation(ws, f"{L(d1)}{FIRST}:{L(dN)}{LAST}", "P,T,F,J")
    a_rg = f"{L(d1)}{FIRST}:{L(dN)}{LAST}"
    for val, fill, font in [("P", GREEN_FILL, GREEN_FONT), ("T", AMBER_FILL, AMBER_FONT),
                            ("F", RED_FILL, RED_FONT), ("J", BLUE_FILL, BLUE_FONT)]:
        ws.conditional_formatting.add(a_rg, CellIsRule(operator="equal", formula=[f'"{val}"'], fill=fill, font=font))
    pct_rg = f"{L(cPct)}{FIRST}:{L(cPct)}{LAST}"
    ws.conditional_formatting.add(pct_rg, FormulaRule(
        formula=[f'AND(ISNUMBER({L(cPct)}{FIRST}),{L(cPct)}{FIRST}<UmbralAsist)'], fill=RED_FILL, font=RED_FONT))
    widths(ws, {"A": 5, "B": 32, L(cP_): 5, L(cT_): 5, L(cF_): 5, L(cJ_): 5, L(cPct): 12})
    protect(ws)
    finish(ws, "C7")
    ASIS_COL = L(cPct)

    # ---------- Trabajos ----------
    NT = 12
    ws = wb.create_sheet("Trabajos")
    title(ws, "Entrega de trabajos")
    ws["A2"] = aula; ws["A2"].font = F_SUB
    ws["A3"] = ("Fila 4: nombre del trabajo. Fila 5: fecha límite. Marque E = entregó a tiempo, T = entregó tarde, N = no entregó. "
                "Si la fecha límite ya pasó y la celda está vacía, se cuenta como NO entregado.")
    ws["A3"].font = F_SUB
    t1, tN = 3, 2 + NT
    cOk, cLate, cNE, cPct = tN + 1, tN + 2, tN + 3, tN + 4
    ws.cell(row=4, column=2, value="Trabajo →").font = F_BOLD
    ws.cell(row=5, column=2, value="Fecha límite →").font = F_BOLD
    for rr in (4, 5):
        ws.cell(row=rr, column=2).alignment = Alignment(horizontal="right")
    for col in range(t1, tN + 1):
        ws.cell(row=4, column=col, value=f"Trabajo {col - t1 + 1}")
        ws.column_dimensions[L(col)].width = 11
    style_range(ws, f"{L(t1)}4:{L(tN)}4", fill=FILL_INPUT, unlocked=True, align=CENTER)
    style_range(ws, f"{L(t1)}5:{L(tN)}5", fill=FILL_INPUT, unlocked=True, align=CENTER, fmt="dd/mm/yyyy")
    header(ws, 6, ["N°", "Estudiante"] + [f'=IF({L(c)}4="","",{L(c)}4)' for c in range(t1, tN + 1)]
           + ["A tiempo", "Tarde", "No entregó", "% Cumplimiento"])
    student_col(ws)
    style_range(ws, f"{L(t1)}{FIRST}:{L(tN)}{LAST}", fill=FILL_INPUT, unlocked=True, align=CENTER)
    dl = f"${L(t1)}$5:${L(tN)}$5"
    for r in range(FIRST, LAST + 1):
        rg_ = f"{L(t1)}{r}:{L(tN)}{r}"
        ws.cell(row=r, column=cOk, value=f'=IF($B{r}="","",COUNTIF({rg_},"E"))')
        ws.cell(row=r, column=cLate, value=f'=IF($B{r}="","",COUNTIF({rg_},"T"))')
        ws.cell(row=r, column=cNE, value=(
            f'=IF($B{r}="","",COUNTIF({rg_},"N")+SUMPRODUCT(--({rg_}=""),--ISNUMBER({dl}),--({dl}<TODAY())))'))
        ok, late, ne = f"{L(cOk)}{r}", f"{L(cLate)}{r}", f"{L(cNE)}{r}"
        ws.cell(row=r, column=cPct, value=f'=IF($B{r}="","",IF({ok}+{late}+{ne}=0,"",({ok}+{late})/({ok}+{late}+{ne})))')
    style_range(ws, f"{L(cOk)}{FIRST}:{L(cPct)}{LAST}", fill=FILL_CALC, align=CENTER)
    style_range(ws, f"{L(cPct)}{FIRST}:{L(cPct)}{LAST}", fmt="0%")
    list_validation(ws, f"{L(t1)}{FIRST}:{L(tN)}{LAST}", "E,T,N")
    tr = f"{L(t1)}{FIRST}:{L(tN)}{LAST}"
    for val, fill, font in [("E", GREEN_FILL, GREEN_FONT), ("T", AMBER_FILL, AMBER_FONT), ("N", RED_FILL, RED_FONT)]:
        ws.conditional_formatting.add(tr, CellIsRule(operator="equal", formula=[f'"{val}"'], fill=fill, font=font))
    ws.conditional_formatting.add(tr, FormulaRule(
        formula=[f'AND($B{FIRST}<>"",{L(t1)}{FIRST}="",ISNUMBER({L(t1)}$5),{L(t1)}$5<TODAY())'], fill=RED_FILL))
    ws.conditional_formatting.add(f"{L(cNE)}{FIRST}:{L(cNE)}{LAST}", FormulaRule(
        formula=[f'AND(ISNUMBER({L(cNE)}{FIRST}),{L(cNE)}{FIRST}>=UmbralNE)'], fill=RED_FILL, font=RED_FONT))
    widths(ws, {"A": 5, "B": 32, L(cOk): 9, L(cLate): 8, L(cNE): 10, L(cPct): 13})
    protect(ws)
    finish(ws, "C7")
    NE_COL = L(cNE)

    # ---------- Seguimiento ----------
    NS = 300
    SL = FIRST + NS - 1
    ws = wb.create_sheet("Seguimiento")
    title(ws, "Seguimiento del estudiante")
    ws["A2"] = aula; ws["A2"].font = F_SUB
    ws["A3"] = "Registre incidencias, logros y comunicaciones con el apoderado. Elija el estudiante de la lista."
    ws["A3"].font = F_SUB
    header(ws, 6, ["Fecha", "Estudiante", "Tipo", "Descripción", "Acción / acuerdo", "Responsable", "Estado"])
    style_range(ws, f"A{FIRST}:G{SL}", fill=FILL_INPUT, unlocked=True)
    style_range(ws, f"A{FIRST}:A{SL}", fmt="dd/mm/yyyy")
    style_range(ws, f"D{FIRST}:E{SL}", align=WRAP)
    list_validation(ws, f"B{FIRST}:B{SL}", "=ListaAlumnos")
    list_validation(ws, f"C{FIRST}:C{SL}",
                    "Académico,Conducta,Asistencia,Comunicación con apoderado,Logro / felicitación,Salud,Otro")
    list_validation(ws, f"G{FIRST}:G{SL}", "Pendiente,Resuelto")
    ws.conditional_formatting.add(f"G{FIRST}:G{SL}", CellIsRule(operator="equal", formula=['"Pendiente"'], fill=AMBER_FILL, font=AMBER_FONT))
    ws.conditional_formatting.add(f"G{FIRST}:G{SL}", CellIsRule(operator="equal", formula=['"Resuelto"'], fill=GREEN_FILL, font=GREEN_FONT))
    widths(ws, {"A": 12, "B": 32, "C": 24, "D": 45, "E": 40, "F": 18, "G": 12})
    ws.auto_filter.ref = f"A6:G{SL}"
    protect(ws)
    finish(ws, "A7")

    # ---------- Resumen ----------
    ws = wb.create_sheet("Resumen")
    title(ws, "Resumen y alertas del aula")
    ws["A2"] = aula; ws["A2"].font = F_SUB
    ws["A3"] = "Todo se calcula automáticamente. Situación = EN RIESGO si tiene nota desaprobatoria, asistencia baja o trabajos sin entregar (ver hoja Config)."
    ws["A3"].font = F_SUB
    header(ws, 6, ["N°", "Estudiante", "Promedio", "Literal", "% Asistencia", "No entregó", "Incidencias pendientes", "Situación", "Motivo"])
    student_col(ws)
    for r in range(FIRST, LAST + 1):
        ws.cell(row=r, column=3, value=f'=IF($B{r}="","",Notas!{PROM_COL}{r})')
        ws.cell(row=r, column=4, value=f'=IF($B{r}="","",Notas!{LIT_COL}{r})')
        ws.cell(row=r, column=5, value=f'=IF($B{r}="","",Asistencia!{ASIS_COL}{r})')
        ws.cell(row=r, column=6, value=f'=IF($B{r}="","",Trabajos!{NE_COL}{r})')
        ws.cell(row=r, column=7, value=f'=IF($B{r}="","",COUNTIFS(Seguimiento!$B${FIRST}:$B${SL},$B{r},Seguimiento!$G${FIRST}:$G${SL},"Pendiente"))')
        nota = f'AND(ISNUMBER(C{r}),C{r}<NotaAprob)'
        asis = f'AND(ISNUMBER(E{r}),E{r}<UmbralAsist)'
        trab = f'AND(ISNUMBER(F{r}),F{r}>=UmbralNE)'
        ws.cell(row=r, column=8, value=f'=IF($B{r}="","",IF(OR({nota},{asis},{trab}),"EN RIESGO","OK"))')
        ws.cell(row=r, column=9, value=(
            f'=IF($B{r}="","",TRIM(IF({nota},"Nota desaprobatoria. ","")&IF({asis},"Asistencia baja. ","")'
            f'&IF({trab},"Trabajos sin entregar. ","")&IF(N(G{r})>0,"Incidencias pendientes.","")))'))
    style_range(ws, f"C{FIRST}:I{LAST}", fill=FILL_CALC, align=CENTER)
    style_range(ws, f"I{FIRST}:I{LAST}", align=Alignment(vertical="center", wrap_text=True))
    style_range(ws, f"E{FIRST}:E{LAST}", fmt="0%")
    ws.conditional_formatting.add(f"H{FIRST}:H{LAST}", CellIsRule(operator="equal", formula=['"EN RIESGO"'], fill=RED_FILL, font=RED_FONT))
    ws.conditional_formatting.add(f"H{FIRST}:H{LAST}", CellIsRule(operator="equal", formula=['"OK"'], fill=GREEN_FILL, font=GREEN_FONT))
    for val, fill, font in [("AD", GREEN_FILL, GREEN_FONT), ("A", BLUE_FILL, BLUE_FONT),
                            ("B", AMBER_FILL, AMBER_FONT), ("C", RED_FILL, RED_FONT)]:
        ws.conditional_formatting.add(f"D{FIRST}:D{LAST}", CellIsRule(operator="equal", formula=[f'"{val}"'], fill=fill, font=font))

    # Indicadores
    ws["K6"] = "INDICADORES DEL AULA"; ws["K6"].font = F_HEAD; ws["K6"].fill = FILL_HEAD
    ws["L6"].fill = FILL_HEAD
    kpis = [
        ("Estudiantes registrados", f'=COUNTIF(B{FIRST}:B{LAST},"?*")', "0"),
        ("Con promedio", f"=COUNT(C{FIRST}:C{LAST})", "0"),
        ("Aprobados", f'=COUNTIF(Notas!{EST_COL}{FIRST}:{EST_COL}{LAST},"Aprobado")', "0"),
        ("Desaprobados", f'=COUNTIF(Notas!{EST_COL}{FIRST}:{EST_COL}{LAST},"Desaprobado")', "0"),
        ("Promedio del aula", f'=IFERROR(ROUND(AVERAGE(C{FIRST}:C{LAST}),1),"-")', "0.0"),
        ("Asistencia promedio", f'=IFERROR(AVERAGE(E{FIRST}:E{LAST}),"-")', "0%"),
        ("Estudiantes en riesgo", f'=COUNTIF(H{FIRST}:H{LAST},"EN RIESGO")', "0"),
    ]
    for i, (k, f, fmt) in enumerate(kpis, start=7):
        ws.cell(row=i, column=11, value=k).font = F_BOLD
        c = ws.cell(row=i, column=12, value=f)
        c.number_format = fmt
        c.alignment = CENTER
    style_range(ws, "K7:L13", fill=FILL_CALC)
    ws["K15"] = "Nivel"; ws["L15"] = "Estudiantes"
    for c in (ws["K15"], ws["L15"]):
        c.font = F_HEAD; c.fill = FILL_HEAD; c.alignment = CENTER
    for i, lit in enumerate(["AD", "A", "B", "C"], start=16):
        ws.cell(row=i, column=11, value=lit).alignment = CENTER
        ws.cell(row=i, column=12, value=f'=COUNTIF(D{FIRST}:D{LAST},"{lit}")').alignment = CENTER
    style_range(ws, "K16:L19", fill=FILL_CALC)
    ch = BarChart()
    ch.title = "Distribución por nivel de logro"
    ch.y_axis.title = "Estudiantes"
    ch.legend = None
    ch.y_axis.majorUnit = 1
    ch.y_axis.number_format = "0"
    ch.y_axis.scaling.min = 0
    ch.add_data(Reference(ws, min_col=12, min_row=15, max_row=19), titles_from_data=True)
    ch.set_categories(Reference(ws, min_col=11, min_row=16, max_row=19))
    ch.height, ch.width = 7, 12
    ws.add_chart(ch, "K21")
    widths(ws, {"A": 5, "B": 32, "C": 10, "D": 8, "E": 12, "F": 10, "G": 12, "H": 12, "I": 40, "J": 3, "K": 24, "L": 13})
    protect(ws)
    finish(ws, "C7")

    wb.active = 0
    return wb


# =====================================================================
# 2. INVENTARIO CON CÓDIGO DE BARRAS
# =====================================================================
def inventario():
    NP, NM = 500, 5000
    PL, ML = FIRST + NP - 1, FIRST + NM - 1
    wb = new_wb()
    instructions(
        wb, "Inventario con código de barras",
        "Controle el stock de sus productos con entradas y salidas. El stock, el valor del inventario y las alertas "
        "de reposición se calculan solos.",
        [
            "Hoja Productos: registre cada producto con su código (puede ser el código de barras EAN del empaque o uno propio), costo, precio, stock inicial y stock mínimo.",
            "Hoja Movimientos: cada vez que entra o sale mercadería, agregue una fila: fecha, código (elíjalo de la lista o escanéelo con un lector), tipo y cantidad.",
            "El stock actual se actualiza solo. Los productos en el mínimo aparecen como REPONER y los que llegan a 0 como AGOTADO.",
            "Hoja Resumen: valor total del inventario, productos por reponer y totales de movimientos.",
            "¿Sus productos no tienen código de barras? Use el Generador Masivo de qrfre.com/bulk con la columna Código para imprimir etiquetas.",
        ],
        extra=["Los lectores de código de barras USB funcionan como un teclado: haga clic en la celda Código y escanee."],
    )

    ws = wb.create_sheet("Productos")
    title(ws, "Catálogo de productos y stock")
    header(ws, 6, ["Código", "Producto", "Categoría", "Unidad", "Costo unit.", "Precio venta", "Margen",
                   "Stock inicial", "Stock mínimo", "Entradas", "Salidas", "Stock actual", "Valor (costo)", "Estado"])
    style_range(ws, f"A{FIRST}:F{PL}", fill=FILL_INPUT, unlocked=True)
    style_range(ws, f"H{FIRST}:I{PL}", fill=FILL_INPUT, unlocked=True, align=CENTER)
    style_range(ws, f"A{FIRST}:A{PL}", fmt="@")
    style_range(ws, f"E{FIRST}:F{PL}", fmt='#,##0.00')
    mv = f"Movimientos!$B${FIRST}:$B${ML}"
    for r in range(FIRST, PL + 1):
        ws.cell(row=r, column=7, value=f'=IF(OR(E{r}="",F{r}="",F{r}=0),"",(F{r}-E{r})/F{r})')
        ws.cell(row=r, column=10, value=f'=IF(A{r}="","",SUMIFS(Movimientos!$E${FIRST}:$E${ML},{mv},A{r},Movimientos!$D${FIRST}:$D${ML},"Entrada"))')
        ws.cell(row=r, column=11, value=f'=IF(A{r}="","",SUMIFS(Movimientos!$E${FIRST}:$E${ML},{mv},A{r},Movimientos!$D${FIRST}:$D${ML},"Salida"))')
        ws.cell(row=r, column=12, value=f'=IF(A{r}="","",N(H{r})+J{r}-K{r})')
        ws.cell(row=r, column=13, value=f'=IF(OR(A{r}="",E{r}=""),"",L{r}*E{r})')
        ws.cell(row=r, column=14, value=f'=IF(A{r}="","",IF(L{r}<=0,"AGOTADO",IF(AND(I{r}<>"",L{r}<=I{r}),"REPONER","OK")))')
    style_range(ws, f"G{FIRST}:G{PL}", fill=FILL_CALC, fmt="0%", align=CENTER)
    style_range(ws, f"J{FIRST}:N{PL}", fill=FILL_CALC, align=CENTER)
    style_range(ws, f"M{FIRST}:M{PL}", fmt='#,##0.00')
    st = f"N{FIRST}:N{PL}"
    ws.conditional_formatting.add(st, CellIsRule(operator="equal", formula=['"AGOTADO"'], fill=RED_FILL, font=RED_FONT))
    ws.conditional_formatting.add(st, CellIsRule(operator="equal", formula=['"REPONER"'], fill=AMBER_FILL, font=AMBER_FONT))
    ws.conditional_formatting.add(st, CellIsRule(operator="equal", formula=['"OK"'], fill=GREEN_FILL, font=GREEN_FONT))
    ws.conditional_formatting.add(f"G{FIRST}:G{PL}", FormulaRule(formula=[f'AND(ISNUMBER(G{FIRST}),G{FIRST}<0)'], font=RED_FONT))
    dvn = DataValidation(type="decimal", operator="greaterThanOrEqual", formula1="0", allow_blank=True)
    dvn.error = "Ingrese un número mayor o igual a 0."
    ws.add_data_validation(dvn)
    dvn.add(f"E{FIRST}:F{PL}"); dvn.add(f"H{FIRST}:I{PL}")
    widths(ws, {"A": 16, "B": 34, "C": 16, "D": 9, "E": 11, "F": 12, "G": 9, "H": 11, "I": 11,
                "J": 10, "K": 10, "L": 11, "M": 13, "N": 11})
    ws.auto_filter.ref = f"A6:N{PL}"
    name(wb, "Codigos", f"Productos!$A${FIRST}:$A${PL}")
    protect(ws)
    finish(ws, "C7")

    ws = wb.create_sheet("Movimientos")
    title(ws, "Entradas y salidas de mercadería", "Una fila por movimiento. El nombre del producto aparece solo al elegir el código.")
    header(ws, 6, ["Fecha", "Código", "Producto", "Tipo", "Cantidad", "Documento / nota"])
    style_range(ws, f"A{FIRST}:B{ML}", fill=FILL_INPUT, unlocked=True)
    style_range(ws, f"D{FIRST}:F{ML}", fill=FILL_INPUT, unlocked=True)
    style_range(ws, f"A{FIRST}:A{ML}", fmt="dd/mm/yyyy")
    style_range(ws, f"B{FIRST}:B{ML}", fmt="@")
    for r in range(FIRST, ML + 1):
        ws.cell(row=r, column=3, value=f'=IF(B{r}="","",IFERROR(VLOOKUP(B{r},Productos!$A${FIRST}:$B${PL},2,FALSE),"¡Código no registrado!"))')
    style_range(ws, f"C{FIRST}:C{ML}", fill=FILL_CALC)
    ws.conditional_formatting.add(f"C{FIRST}:C{ML}", CellIsRule(operator="equal", formula=['"¡Código no registrado!"'], fill=RED_FILL, font=RED_FONT))
    lv = DataValidation(type="list", formula1="=Codigos", allow_blank=True)
    lv.showErrorMessage = False  # permite escanear códigos y avisa con la columna Producto
    ws.add_data_validation(lv); lv.add(f"B{FIRST}:B{ML}")
    list_validation(ws, f"D{FIRST}:D{ML}", "Entrada,Salida")
    dq = DataValidation(type="decimal", operator="greaterThan", formula1="0", allow_blank=True)
    dq.error = "La cantidad debe ser mayor que 0."
    ws.add_data_validation(dq); dq.add(f"E{FIRST}:E{ML}")
    ws.conditional_formatting.add(f"D{FIRST}:D{ML}", CellIsRule(operator="equal", formula=['"Entrada"'], font=GREEN_FONT))
    ws.conditional_formatting.add(f"D{FIRST}:D{ML}", CellIsRule(operator="equal", formula=['"Salida"'], font=RED_FONT))
    widths(ws, {"A": 12, "B": 16, "C": 34, "D": 10, "E": 10, "F": 34})
    ws.auto_filter.ref = f"A6:F{ML}"
    protect(ws)
    finish(ws, "A7")

    ws = wb.create_sheet("Resumen")
    ws.sheet_view.showGridLines = False
    title(ws, "Resumen del inventario")
    p = f"Productos!$A${FIRST}:$A${PL}"
    items = [
        ("Productos registrados", f'=SUMPRODUCT(--({p}<>""))', "0"),
        ("Valor total del inventario (a costo)", f"=SUM(Productos!$M${FIRST}:$M${PL})", '#,##0.00'),
        ("Unidades en stock", f"=SUM(Productos!$L${FIRST}:$L${PL})", "#,##0"),
        ("Productos por REPONER", f'=COUNTIF(Productos!$N${FIRST}:$N${PL},"REPONER")', "0"),
        ("Productos AGOTADOS", f'=COUNTIF(Productos!$N${FIRST}:$N${PL},"AGOTADO")', "0"),
        ("Unidades que entraron", f'=SUMIF(Movimientos!$D${FIRST}:$D${ML},"Entrada",Movimientos!$E${FIRST}:$E${ML})', "#,##0"),
        ("Unidades que salieron", f'=SUMIF(Movimientos!$D${FIRST}:$D${ML},"Salida",Movimientos!$E${FIRST}:$E${ML})', "#,##0"),
        ("Movimientos con código no registrado", f'=COUNTIF(Movimientos!$C${FIRST}:$C${ML},"¡Código no registrado!")', "0"),
    ]
    header(ws, 4, ["Indicador", "Valor"])
    for i, (k, f, fmt) in enumerate(items, start=5):
        ws.cell(row=i, column=1, value=k).font = F_BOLD
        c = ws.cell(row=i, column=2, value=f)
        c.number_format = fmt
        c.alignment = CENTER
    style_range(ws, "A5:B12", fill=FILL_CALC)
    ws.conditional_formatting.add("B8:B9", CellIsRule(operator="greaterThan", formula=["0"], fill=RED_FILL, font=RED_FONT))
    ws.conditional_formatting.add("B12:B12", CellIsRule(operator="greaterThan", formula=["0"], fill=RED_FILL, font=RED_FONT))
    widths(ws, {"A": 40, "B": 18})
    protect(ws)
    finish(ws, landscape=False)
    wb.active = 0
    return wb


# =====================================================================
# 3. VENTAS Y CAJA
# =====================================================================
def ventas_caja():
    NV = 2000
    VL = FIRST + NV - 1
    wb = new_wb()
    instructions(
        wb, "Control de Ventas y Caja",
        "Registre sus ventas y gastos diarios. El resumen calcula ventas, gastos, utilidad y cuentas por cobrar "
        "de cada mes, y cuánto entró por cada medio de pago (efectivo, Yape, Plin, tarjeta...).",
        [
            "Hoja Ventas: una fila por venta. El total se calcula con cantidad × precio − descuento. Marque si está Pagado o Pendiente (crédito).",
            "Hoja Gastos: registre cada gasto del negocio con su categoría.",
            "Hoja Resumen: escriba el año que quiere ver. Verá los 12 meses, el gráfico y el total por medio de pago.",
            "Use los filtros de cada encabezado para buscar por cliente, fecha o medio de pago.",
        ],
        extra=["Consejo: imprima el QR de Yape o Plin de su negocio con el generador de qrfre.com para cobrar más rápido."],
    )
    pagos = "Efectivo,Yape,Plin,Tarjeta,Transferencia,Otro"

    ws = wb.create_sheet("Ventas")
    title(ws, "Registro de ventas")
    header(ws, 6, ["Fecha", "N° comprobante", "Cliente", "Producto / servicio", "Cantidad", "Precio unit.",
                   "Descuento", "Total", "Medio de pago", "Estado"])
    style_range(ws, f"A{FIRST}:G{VL}", fill=FILL_INPUT, unlocked=True)
    style_range(ws, f"I{FIRST}:J{VL}", fill=FILL_INPUT, unlocked=True)
    style_range(ws, f"A{FIRST}:A{VL}", fmt="dd/mm/yyyy")
    style_range(ws, f"F{FIRST}:H{VL}", fmt='#,##0.00')
    for r in range(FIRST, VL + 1):
        ws.cell(row=r, column=8, value=f'=IF(OR(E{r}="",F{r}=""),"",E{r}*F{r}-N(G{r}))')
    style_range(ws, f"H{FIRST}:H{VL}", fill=FILL_CALC)
    list_validation(ws, f"I{FIRST}:I{VL}", pagos)
    list_validation(ws, f"J{FIRST}:J{VL}", "Pagado,Pendiente")
    ws.conditional_formatting.add(f"J{FIRST}:J{VL}", CellIsRule(operator="equal", formula=['"Pendiente"'], fill=AMBER_FILL, font=AMBER_FONT))
    widths(ws, {"A": 12, "B": 14, "C": 26, "D": 32, "E": 9, "F": 11, "G": 10, "H": 12, "I": 14, "J": 11})
    ws.auto_filter.ref = f"A6:J{VL}"
    protect(ws)
    finish(ws, "A7")

    ws = wb.create_sheet("Gastos")
    title(ws, "Registro de gastos")
    header(ws, 6, ["Fecha", "Concepto", "Categoría", "Monto", "Medio de pago", "Comprobante"])
    style_range(ws, f"A{FIRST}:F{VL}", fill=FILL_INPUT, unlocked=True)
    style_range(ws, f"A{FIRST}:A{VL}", fmt="dd/mm/yyyy")
    style_range(ws, f"D{FIRST}:D{VL}", fmt='#,##0.00')
    list_validation(ws, f"C{FIRST}:C{VL}", "Mercadería,Alquiler,Servicios,Sueldos,Transporte,Publicidad,Impuestos,Otros")
    list_validation(ws, f"E{FIRST}:E{VL}", pagos)
    widths(ws, {"A": 12, "B": 34, "C": 16, "D": 12, "E": 14, "F": 16})
    ws.auto_filter.ref = f"A6:F{VL}"
    protect(ws)
    finish(ws, "A7")

    ws = wb.create_sheet("Resumen")
    ws.sheet_view.showGridLines = False
    title(ws, "Resumen mensual")
    ws["A3"] = "Año:"; ws["A3"].font = F_BOLD
    ws["B3"] = 2026
    style_range(ws, "B3:B3", fill=FILL_INPUT, unlocked=True, align=CENTER)
    header(ws, 5, ["Mes", "Ventas", "Gastos", "Utilidad", "Por cobrar"])
    meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto",
             "Septiembre", "Octubre", "Noviembre", "Diciembre"]
    vd, vt, ve = f"Ventas!$A${FIRST}:$A${VL}", f"Ventas!$H${FIRST}:$H${VL}", f"Ventas!$J${FIRST}:$J${VL}"
    gd, gm = f"Gastos!$A${FIRST}:$A${VL}", f"Gastos!$D${FIRST}:$D${VL}"
    for i, m in enumerate(meses, start=1):
        r = 5 + i
        rng = lambda d: f'{d},">="&DATE($B$3,{i},1),{d},"<"&DATE($B$3,{i + 1},1)'
        ws.cell(row=r, column=1, value=m)
        ws.cell(row=r, column=2, value=f"=SUMIFS({vt},{rng(vd)})")
        ws.cell(row=r, column=3, value=f"=SUMIFS({gm},{rng(gd)})")
        ws.cell(row=r, column=4, value=f"=B{r}-C{r}")
        ws.cell(row=r, column=5, value=f'=SUMIFS({vt},{rng(vd)},{ve},"Pendiente")')
    ws["A18"] = "TOTAL"; ws["A18"].font = F_BOLD
    for col in "BCDE":
        ws[f"{col}18"] = f"=SUM({col}6:{col}17)"
        ws[f"{col}18"].font = F_BOLD
    style_range(ws, "A6:E18", fill=FILL_CALC, fmt='#,##0.00')
    ws.conditional_formatting.add("D6:D18", CellIsRule(operator="lessThan", formula=["0"], font=RED_FONT))

    header(ws, 5, ["Medio de pago", "Ventas del año"], start_col=7)
    yr = f'{vd},">="&DATE($B$3,1,1),{vd},"<"&DATE($B$3+1,1,1)'
    for i, mp in enumerate(pagos.split(","), start=6):
        ws.cell(row=i, column=7, value=mp)
        ws.cell(row=i, column=8, value=f'=SUMIFS({vt},{yr},Ventas!$I${FIRST}:$I${VL},G{i})')
    style_range(ws, "G6:H11", fill=FILL_CALC)
    style_range(ws, "H6:H11", fmt='#,##0.00')

    ch = BarChart()
    ch.title = "Ventas vs. gastos"
    ch.add_data(Reference(ws, min_col=2, max_col=3, min_row=5, max_row=17), titles_from_data=True)
    ch.set_categories(Reference(ws, min_col=1, min_row=6, max_row=17))
    ch.height, ch.width = 8, 18
    ws.add_chart(ch, "A21")
    widths(ws, {"A": 14, "B": 14, "C": 14, "D": 14, "E": 14, "F": 3, "G": 16, "H": 16})
    protect(ws)
    finish(ws, landscape=False)
    wb.active = 0
    return wb


# =====================================================================
# 4. LISTA DE INVITADOS CON QR
# =====================================================================
def invitados():
    NI = 500
    IL = FIRST + NI - 1
    wb = new_wb()
    instructions(
        wb, "Lista de Invitados con código QR",
        "Organice su evento: confirmaciones, mesas, acompañantes, invitaciones por WhatsApp con un clic "
        "y un código de entrada único por invitado para generar sus QR.",
        [
            "Hoja Evento: escriba el nombre, fecha y lugar del evento y el mensaje de invitación.",
            "Hoja Invitados: registre cada invitado. El teléfono debe incluir el código de país (ej. 51999888777).",
            "Haga clic en «Enviar WhatsApp» para abrir el chat con la invitación ya escrita.",
            "Marque la confirmación (Sí / No / Pendiente). El resumen cuenta las personas esperadas, incluidos los acompañantes.",
            "Para QR de entrada: copie las columnas Código de entrada y Nombre a un Excel y súbalo a qrfre.com/bulk. Obtendrá un QR por invitado.",
            "El día del evento marque «Asistió» para llevar el control de llegada.",
        ],
    )

    ws = wb.create_sheet("Evento")
    ws.sheet_view.showGridLines = False
    title(ws, "Datos del evento")
    datos = [("Nombre del evento", "Mi evento"), ("Fecha", None), ("Hora", ""), ("Lugar", ""),
             ("Mensaje de invitación", "¡Hola! Te invito a mi evento. Por favor confirma tu asistencia.")]
    for i, (k, v) in enumerate(datos, start=4):
        ws.cell(row=i, column=1, value=k).font = F_BOLD
        ws.cell(row=i, column=2, value=v)
    style_range(ws, "B4:B8", fill=FILL_INPUT, unlocked=True, align=WRAP)
    ws["B5"].number_format = "dd/mm/yyyy"
    ws.row_dimensions[8].height = 45
    widths(ws, {"A": 26, "B": 60})
    protect(ws)
    finish(ws, landscape=False)

    ws = wb.create_sheet("Invitados")
    title(ws, "Lista de invitados")
    ws["A2"] = '=Evento!$B$4'; ws["A2"].font = F_SUB
    header(ws, 6, ["N°", "Nombre", "Teléfono (con código país)", "Grupo / Mesa", "Acompañantes",
                   "Confirmación", "Código de entrada", "Asistió", "Invitación", "Notas"])
    for r in range(FIRST, IL + 1):
        n = r - FIRST + 1
        ws.cell(row=r, column=1, value=n).alignment = CENTER
        ws.cell(row=r, column=7, value=f'=IF(B{r}="","","INV-"&TEXT(A{r},"000"))')
        ws.cell(row=r, column=9, value=(
            f'=IF(OR(B{r}="",C{r}=""),"",HYPERLINK("https://wa.me/"&SUBSTITUTE(SUBSTITUTE(C{r}," ",""),"+","")'
            f'&"?text="&{urlenc(f'Evento!$B$8&" Tu código de entrada: "&G{r}')},"Enviar WhatsApp"))'))
    style_range(ws, f"A{FIRST}:A{IL}", fill=FILL_CALC)
    style_range(ws, f"B{FIRST}:F{IL}", fill=FILL_INPUT, unlocked=True)
    style_range(ws, f"H{FIRST}:H{IL}", fill=FILL_INPUT, unlocked=True, align=CENTER)
    style_range(ws, f"J{FIRST}:J{IL}", fill=FILL_INPUT, unlocked=True)
    style_range(ws, f"G{FIRST}:G{IL}", fill=FILL_CALC, align=CENTER)
    style_range(ws, f"I{FIRST}:I{IL}", fill=FILL_CALC)
    for row in ws[f"I{FIRST}:I{IL}"]:
        row[0].font = F_LINK
    style_range(ws, f"C{FIRST}:C{IL}", fmt="@")
    style_range(ws, f"E{FIRST}:F{IL}", align=CENTER)
    list_validation(ws, f"F{FIRST}:F{IL}", "Sí,No,Pendiente")
    list_validation(ws, f"H{FIRST}:H{IL}", "Sí,No")
    dq = DataValidation(type="whole", operator="between", formula1="0", formula2="20", allow_blank=True)
    dq.error = "Ingrese un número entero de acompañantes."
    ws.add_data_validation(dq); dq.add(f"E{FIRST}:E{IL}")
    for val, fill, font in [("Sí", GREEN_FILL, GREEN_FONT), ("No", RED_FILL, RED_FONT), ("Pendiente", AMBER_FILL, AMBER_FONT)]:
        ws.conditional_formatting.add(f"F{FIRST}:F{IL}", CellIsRule(operator="equal", formula=[f'"{val}"'], fill=fill, font=font))
    ws.conditional_formatting.add(f"H{FIRST}:H{IL}", CellIsRule(operator="equal", formula=['"Sí"'], fill=GREEN_FILL, font=GREEN_FONT))
    widths(ws, {"A": 5, "B": 32, "C": 20, "D": 14, "E": 13, "F": 13, "G": 14, "H": 9, "I": 17, "J": 30})
    ws.auto_filter.ref = f"A6:J{IL}"
    protect(ws)
    finish(ws, "C7")

    ws = wb.create_sheet("Resumen")
    ws.sheet_view.showGridLines = False
    title(ws, "Resumen del evento")
    F, E, H, B = (f"Invitados!${c}${FIRST}:${c}${IL}" for c in "FEHB")
    items = [
        ("Invitados registrados", f'=COUNTIF({B},"?*")'),
        ("Confirmaron (Sí)", f'=COUNTIF({F},"Sí")'),
        ("No asistirán", f'=COUNTIF({F},"No")'),
        ("Sin respuesta", f'=COUNTIF({B},"?*")-COUNTIF({F},"Sí")-COUNTIF({F},"No")'),
        ("Personas esperadas (confirmados + acompañantes)", f'=COUNTIF({F},"Sí")+SUMIFS({E},{F},"Sí")'),
        ("Llegaron (Asistió = Sí)", f'=COUNTIF({H},"Sí")'),
    ]
    header(ws, 4, ["Indicador", "Cantidad"])
    for i, (k, f) in enumerate(items, start=5):
        ws.cell(row=i, column=1, value=k).font = F_BOLD
        ws.cell(row=i, column=2, value=f).alignment = CENTER
    style_range(ws, "A5:B10", fill=FILL_CALC)
    widths(ws, {"A": 48, "B": 14})
    protect(ws)
    finish(ws, landscape=False)
    wb.active = 0
    return wb


PLANTILLAS = {
    "registro-docente.xlsx": registro_docente,
    "inventario-codigo-barras.xlsx": inventario,
    "control-ventas-caja.xlsx": ventas_caja,
    "lista-invitados-qr.xlsx": invitados,
}

if __name__ == "__main__":
    os.makedirs(OUT, exist_ok=True)
    for fname, fn in PLANTILLAS.items():
        wb = fn()
        wb.properties.creator = "QR Free (qrfre.com)"
        wb.properties.title = fname.replace(".xlsx", "").replace("-", " ").title()
        path = os.path.join(OUT, fname)
        wb.save(path)
        print(f"OK  {path}  ({os.path.getsize(path) // 1024} KB)")

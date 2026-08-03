"""
ADBG Template Renderer — Data-driven ReportLab PDF renderer.

Renders document layouts completely from YAML element declarations.
No hardcoded python layout logic per document type.
Supports Unicode fonts (Unicode-compliant PDF generation for future Hindi/regional support).
"""

from __future__ import annotations

import io
import re
from collections.abc import Sequence
from typing import Any

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4, LETTER, landscape, portrait
from reportlab.pdfgen import canvas

from adbg.core.interfaces import TemplateDefinition


def hex_to_color(hex_str: str) -> HexColor:
    """Convert hex color string to ReportLab HexColor."""
    if not hex_str.startswith("#"):
        hex_str = f"#{hex_str}"
    return HexColor(hex_str)


class ReportLabTemplateRenderer:
    """
    Generic, data-driven ReportLab renderer.

    Takes a parsed TemplateDefinition and a rendering context dict
    (built from DocumentData), resolves `{placeholders}`, and draws
    all elements to a PDF byte buffer.
    """

    @staticmethod
    def _resolve_template_str(text: str, context: dict[str, Any]) -> str:
        """Resolve placeholders like '{student.name}' or '{university.name}'."""
        if not text or "{" not in text:
            return text

        def replancer(match: re.Match[str]) -> str:
            path = match.group(1).split(".")
            val: Any = context
            for key in path:
                if isinstance(val, dict):
                    val = val.get(key, "")
                elif hasattr(val, key):
                    val = getattr(val, key, "")
                else:
                    return match.group(0)
            return str(val)

        return re.sub(r"\{([\w\.]+)\}", replancer, text)

    def render_pdf(
        self,
        template: TemplateDefinition,
        context: dict[str, Any],
    ) -> bytes:
        """
        Render PDF bytes from template definition and context.

        Args:
            template: Parsed TemplateDefinition instance.
            context: Variables binding context dictionary.

        Returns:
            Raw PDF file content bytes.
        """
        buffer = io.BytesIO()

        # Page Size setup
        page_size_map = {"A4": A4, "LETTER": LETTER}
        base_size = page_size_map.get(template.page.size.upper(), A4)
        page_size = landscape(base_size) if template.page.orientation == "landscape" else portrait(base_size)

        c = canvas.Canvas(buffer, pagesize=page_size)
        page_width, page_height = page_size

        # Render Watermark first if defined
        wm = template.watermark
        if wm and wm.get("text"):
            c.saveState()
            wm_text = self._resolve_template_str(wm.get("text", ""), context)
            c.setFont("Helvetica-Bold", wm.get("font_size", 40))
            c.setFillColor(hex_to_color(wm.get("color", "#e0e0e0")))
            c.saveState()
            c.translate(page_width / 2.0, page_height / 2.0)
            c.rotate(wm.get("rotation", 35))
            c.drawCentredString(0, 0, wm_text)
            c.restoreState()
            c.restoreState()

        # Render layout elements in order
        for elem in template.elements:
            elem_type = elem.get("type")
            if elem_type == "rect":
                self._draw_rect(c, elem, context, page_height)
            elif elem_type == "line":
                self._draw_line(c, elem, context, page_height)
            elif elem_type == "text":
                self._draw_text(c, elem, context, page_height, page_width)
            elif elem_type == "info_grid":
                self._draw_info_grid(c, elem, context, page_height)
            elif elem_type == "table":
                self._draw_table(c, elem, context, page_height)
            elif elem_type == "summary_box":
                self._draw_summary_box(c, elem, context, page_height)

        # Render disclaimer/footer if present
        disc = template.disclaimer
        if disc and disc.get("text"):
            disc_text = self._resolve_template_str(disc.get("text", ""), context)
            c.setFont("Helvetica-Oblique", disc.get("font_size", 8))
            c.setFillColor(hex_to_color(disc.get("color", "#666666")))
            c.drawCentredString(page_width / 2.0, disc.get("y", 20), disc_text)

        c.showPage()
        c.save()

        buffer.seek(0)
        return buffer.getvalue()

    def _draw_rect(self, c: canvas.Canvas, elem: dict[str, Any], context: dict[str, Any], page_height: float) -> None:
        c.saveState()
        x = elem.get("x", 0)
        y = page_height - elem.get("y", 0) - elem.get("height", 0)
        w = elem.get("width", 100)
        h = elem.get("height", 50)

        fill = elem.get("fill")
        stroke = elem.get("stroke")

        if fill:
            c.setFillColor(hex_to_color(fill))
        if stroke:
            c.setStrokeColor(hex_to_color(stroke))
            c.setLineWidth(elem.get("stroke_width", 1))

        c.rect(x, y, w, h, fill=1 if fill else 0, stroke=1 if stroke else 0)
        c.restoreState()

    def _draw_line(self, c: canvas.Canvas, elem: dict[str, Any], context: dict[str, Any], page_height: float) -> None:
        c.saveState()
        x1 = elem.get("x1", 0)
        y1 = page_height - elem.get("y1", 0)
        x2 = elem.get("x2", 100)
        y2 = page_height - elem.get("y2", 0)

        c.setStrokeColor(hex_to_color(elem.get("color", "#000000")))
        c.setLineWidth(elem.get("width", 1))
        c.line(x1, y1, x2, y2)
        c.restoreState()

    def _draw_text(self, c: canvas.Canvas, elem: dict[str, Any], context: dict[str, Any], page_height: float, page_width: float) -> None:
        c.saveState()
        text = self._resolve_template_str(elem.get("text", ""), context)
        font_name = elem.get("font", "Helvetica")
        font_size = elem.get("font_size", 12)
        color = elem.get("color", "#000000")
        align = elem.get("align", "left")

        c.setFont(font_name, font_size)
        c.setFillColor(hex_to_color(color))

        x = elem.get("x", 0)
        y = page_height - elem.get("y", 0)

        if align == "center":
            c.drawCentredString(x if x > 0 else page_width / 2.0, y, text)
        elif align == "right":
            c.drawRightString(x, y, text)
        else:
            c.drawString(x, y, text)
        c.restoreState()

    def _draw_info_grid(self, c: canvas.Canvas, elem: dict[str, Any], context: dict[str, Any], page_height: float) -> None:
        c.saveState()
        start_x = elem.get("x", 40)
        start_y = page_height - elem.get("y", 150)
        col_width = elem.get("col_width", 250)
        row_height = elem.get("row_height", 18)
        font_size = elem.get("font_size", 10)

        fields: Sequence[dict[str, str]] = elem.get("fields", [])
        columns = elem.get("columns", 2)

        c.setFont("Helvetica", font_size)

        for i, field in enumerate(fields):
            col_idx = i % columns
            row_idx = i // columns

            x = start_x + (col_idx * col_width)
            y = start_y - (row_idx * row_height)

            label = field.get("label", "")
            value_pattern = field.get("value", "")
            value = self._resolve_template_str(value_pattern, context)

            c.setFont("Helvetica-Bold", font_size)
            c.setFillColor(hex_to_color("#444444"))
            c.drawString(x, y, f"{label}:")

            c.setFont("Helvetica", font_size)
            c.setFillColor(hex_to_color("#000000"))
            c.drawString(x + 110, y, value)

        c.restoreState()

    def _draw_table(self, c: canvas.Canvas, elem: dict[str, Any], context: dict[str, Any], page_height: float) -> None:
        c.saveState()
        x = elem.get("x", 40)
        start_y = page_height - elem.get("y", 250)
        col_widths: Sequence[float] = elem.get("col_widths", [80, 200, 50, 50, 60])
        headers: Sequence[str] = elem.get("headers", [])
        row_height = elem.get("row_height", 20)

        # Draw Table Header
        c.setFillColor(hex_to_color(elem.get("header_bg", "#1a2e5a")))
        c.rect(x, start_y - row_height, sum(col_widths), row_height, fill=1, stroke=0)

        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(hex_to_color("#ffffff"))

        curr_x = x
        for i, header in enumerate(headers):
            c.drawString(curr_x + 5, start_y - row_height + 6, header)
            curr_x += col_widths[i]

        # Draw Rows from context
        records = context.get("semester_records", [])
        curr_y = start_y - row_height

        c.setFont("Helvetica", 9)
        c.setFillColor(hex_to_color("#000000"))

        row_count = 0
        for sem in records:
            for course in getattr(sem, "course_marks", []):
                curr_y -= row_height
                row_count += 1

                # Alternate row bg
                if row_count % 2 == 0:
                    c.setFillColor(hex_to_color("#f8fafc"))
                    c.rect(x, curr_y, sum(col_widths), row_height, fill=1, stroke=0)

                c.setFillColor(hex_to_color("#333333"))
                c.setStrokeColor(hex_to_color("#e2e8f0"))
                c.line(x, curr_y, x + sum(col_widths), curr_y)

                # Cell contents
                row_vals = [
                    getattr(course, "course_code", ""),
                    getattr(course, "course_name", ""),
                    str(getattr(course, "credits", "")),
                    getattr(course, "grade", ""),
                    str(getattr(course, "marks_obtained", "")),
                ]

                cx = x
                for i, val in enumerate(row_vals):
                    if i < len(col_widths):
                        c.drawString(cx + 5, curr_y + 6, str(val))
                        cx += col_widths[i]

        # Outer border
        c.setStrokeColor(hex_to_color("#1a2e5a"))
        c.setLineWidth(1)
        c.rect(x, curr_y, sum(col_widths), start_y - curr_y, fill=0, stroke=1)
        c.restoreState()

    def _draw_summary_box(self, c: canvas.Canvas, elem: dict[str, Any], context: dict[str, Any], page_height: float) -> None:
        c.saveState()
        x = elem.get("x", 40)
        y = page_height - elem.get("y", 650) - elem.get("height", 40)
        w = elem.get("width", 515)
        h = elem.get("height", 40)

        c.setFillColor(hex_to_color(elem.get("bg", "#f1f5f9")))
        c.setStrokeColor(hex_to_color(elem.get("border", "#cbd5e1")))
        c.rect(x, y, w, h, fill=1, stroke=1)

        c.setFont("Helvetica-Bold", 10)
        c.setFillColor(hex_to_color("#1e293b"))

        text = self._resolve_template_str(elem.get("text", "CGPA: {cgpa}"), context)
        c.drawCentredString(x + w / 2.0, y + (h / 2.0) - 3, text)
        c.restoreState()

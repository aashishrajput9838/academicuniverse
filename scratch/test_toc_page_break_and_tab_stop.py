import docx
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.shared import Inches, Pt, RGBColor
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v4_docx_path = workspace / "docs" / "paper" / "PaperV4_Final_Submission.docx"

doc = docx.Document(v4_docx_path)
section = doc.sections[0]

page_width = section.page_width.inches
left_margin = section.left_margin.inches
right_margin = section.right_margin.inches
text_width = page_width - left_margin - right_margin

print("=== MANUSCRIPT SECTION PAGE GEOMETRY ===")
print(f"Page Width:   {page_width:.3f} inches")
print(f"Left Margin:  {left_margin:.3f} inches")
print(f"Right Margin: {right_margin:.3f} inches")
print(f"Text Width:   {text_width:.3f} inches")

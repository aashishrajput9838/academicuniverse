import os
import docx
import re
import subprocess
import win32com.client
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_TAB_ALIGNMENT, WD_TAB_LEADER
from docx.shared import Pt, Inches, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v4_docx_path = workspace / "docs" / "paper" / "PaperV4_Final_Submission.docx"
logo_path = workspace / "public" / "new_logo_2.png"
dt_cm_path = workspace / "results" / "confusion_matrices" / "dt_composite.png"
rf_cm_path = workspace / "results" / "confusion_matrices" / "rf_composite.png"
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"
v5_pdf_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.pdf"

assert v4_docx_path.exists(), "Baseline docx missing!"
assert logo_path.exists(), "Logo image missing!"
assert dt_cm_path.exists(), "DT composite image missing!"
assert rf_cm_path.exists(), "RF composite image missing!"

print("=== TESTING SECTION 5.9 INTEGRATION INTO PAPER V5 ===")

import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v4_docx_path = workspace / "docs" / "paper" / "PaperV4_Final_Submission.docx"

doc = docx.Document(v4_docx_path)

print("=== SEARCHING TOC INSERTION POINT (AFTER ABSTRACT / BEFORE INTRO) ===")
for i, p in enumerate(doc.paragraphs[:25]):
    print(f"P{i} [{p.style.name}]: '{p.text[:90]}'")

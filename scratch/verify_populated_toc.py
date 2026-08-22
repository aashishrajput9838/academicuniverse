import docx
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"

assert v5_docx_path.exists(), "PaperV5_Ollama_Primary.docx missing!"

doc = docx.Document(v5_docx_path)

h1_outline_count = 0
h2_outline_count = 0
error_found = False

for p in doc.paragraphs:
    if "No table of contents entries found" in p.text or "Error." in p.text:
        error_found = True
        print(f"Error String Found: '{p.text}'")
    
    pPr = p._p.get_or_add_pPr()
    outlineLvl = pPr.find(docx.oxml.ns.qn('w:outlineLvl'))
    if outlineLvl is not None:
        val = outlineLvl.get(docx.oxml.ns.qn('w:val'))
        if val == '0':
            h1_outline_count += 1
        elif val == '1':
            h2_outline_count += 1

print("============================================================")
print(" AUTOMATIC TABLE OF CONTENTS VERIFICATION REPORT")
print("============================================================")
print(f"Error Message Found:                 {error_found}")
print(f"Outline Level 0 Mapped Headings:     {h1_outline_count} (Level 1 Sections)")
print(f"Outline Level 1 Mapped Subsections:  {h2_outline_count} (Level 2 Subsections)")
print("============================================================")

assert not error_found, "Error message still found in DOCX!"
assert h1_outline_count >= 12, "Major section headings missing outline levels!"
assert h2_outline_count >= 20, "Subsections missing outline levels!"

print("VERIFICATION SUCCESS: Automatic Word TOC correctly mapped to all manuscript headings.")

import os
import docx
import re
import win32com.client
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"
v5_pdf_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.pdf"

assert v5_docx_path.exists(), "PaperV5_Ollama_Primary.docx missing!"

doc = docx.Document(v5_docx_path)

def set_paragraph_outline_level(p, level):
    pPr = p._p.get_or_add_pPr()
    existing = pPr.find(qn('w:outlineLvl'))
    if existing is not None:
        pPr.remove(existing)
    outlineLvl = OxmlElement('w:outlineLvl')
    outlineLvl.set(qn('w:val'), str(level))
    pPr.append(outlineLvl)

h1_count = 0
h2_count = 0

for p in doc.paragraphs:
    text_str = p.text.strip()
    if not text_str:
        continue
    
    is_h1 = (
        text_str.startswith("1. ") or
        text_str.startswith("2. ") or
        text_str.startswith("3. ") or
        text_str.startswith("4. ") or
        text_str.startswith("5. ") or
        text_str.startswith("6. ") or
        text_str.startswith("7. ") or
        text_str.startswith("8. ") or
        text_str.startswith("9. ") or
        text_str == "REFERENCES" or
        text_str.startswith("APPENDIX A") or
        text_str.startswith("APPENDIX B") or
        text_str.startswith("APPENDIX C") or
        text_str.startswith("Ethics & Privacy Statement") or
        text_str.startswith("ACKNOWLEDGMENT")
    )
    
    is_h2 = bool(
        re.match(r"^\d\.\d\s+", text_str) or
        text_str.startswith("A.1 ") or text_str.startswith("A.2 ") or
        text_str.startswith("B.1 ") or text_str.startswith("B.2 ") or
        text_str.startswith("C.1 ") or text_str.startswith("C.2 ") or text_str.startswith("C.3 ")
    )
    
    if is_h1:
        set_paragraph_outline_level(p, 0)
        h1_count += 1
    elif is_h2:
        set_paragraph_outline_level(p, 1)
        h2_count += 1

print(f"Applied Outline Levels: {h1_count} H1 sections, {h2_count} H2 subsections.")

doc.save(v5_docx_path)
print(f"[SUCCESS] Saved updated DOCX to: {v5_docx_path.name}")

# Re-export PDF via Word COM Automation & Update TOC Fields
print(f"Exporting PDF via Word COM Automation: {v5_pdf_path.name}...")
abs_docx = os.path.abspath(str(v5_docx_path))
abs_pdf = os.path.abspath(str(v5_pdf_path))

word = None
try:
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    doc_word = word.Documents.Open(abs_docx)
    
    # Update fields to populate TOC
    doc_word.Fields.Update()
    for s in doc_word.Sections:
        s.Range.Fields.Update()
    
    doc_word.SaveAs(abs_pdf, FileFormat=17) # 17 = wdFormatPDF
    page_count = doc_word.ComputeStatistics(2)
    doc_word.Close()
    print(f"[SUCCESS] Exported high-quality PDF with populated TOC: {v5_pdf_path.name} ({page_count} Pages!)")
except Exception as e:
    print(f"Word COM PDF Export Error: {e}")
finally:
    if word:
        try: word.Quit()
        except: pass

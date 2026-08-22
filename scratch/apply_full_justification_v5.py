import docx
import os
import shutil
import win32com.client
from docx.enum.text import WD_ALIGN_PARAGRAPH
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
v5_docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"
v5_temp_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary_temp.docx"
v5_pdf_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.pdf"

print("============================================================")
print(" APPLYING TYPOGRAPHY FORMATTING CORRECTION: FULL JUSTIFICATION")
print("============================================================")

assert v5_docx_path.exists(), "PaperV5_Ollama_Primary.docx missing!"

doc = docx.Document(v5_docx_path)

justified_count = 0
skipped_count = 0

for i, p in enumerate(doc.paragraphs):
    text_str = p.text.strip()
    if not text_str:
        continue
    
    # Identify non-body paragraphs to SKIP full justification
    # (Headings, Title, Subtitle, Figure Captions, Centered elements, Equations)
    is_title_or_heading = (
        p.style.name.startswith("Heading") or
        p.style.name == "Title" or
        p.style.name == "Subtitle" or
        text_str.startswith("Figure ") or
        text_str.startswith("Table ") or
        text_str.startswith("TABLE ") or
        p.alignment == WD_ALIGN_PARAGRAPH.CENTER or
        "<m:oMath" in p._p.xml
    )
    
    if is_title_or_heading:
        skipped_count += 1
    else:
        # Apply Full Justification (WD_ALIGN_PARAGRAPH.JUSTIFY)
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        justified_count += 1

print(f"Typography Update Summary:")
print(f"  - Body Paragraphs Fully Justified: {justified_count}")
print(f"  - Specially Formatted Paragraphs Preserved: {skipped_count}")

# Save to temp path first
doc.save(v5_temp_path)

# Move temp file to replace v5_docx_path
shutil.move(str(v5_temp_path), str(v5_docx_path))
print(f"[SUCCESS] Saved formatted DOCX to: {v5_docx_path.name}")

# Re-export high-quality PDF via Word COM Automation
print(f"Re-exporting PDF via Word COM Automation: {v5_pdf_path.name}...")
word = None
try:
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    d = word.Documents.Open(str(v5_docx_path))
    d.SaveAs(str(v5_pdf_path), FileFormat=17) # 17 = wdFormatPDF
    page_count = d.ComputeStatistics(2)
    d.Close()
    print(f"[SUCCESS] Re-exported high-quality PDF: {v5_pdf_path.name} ({page_count} Pages!)")
except Exception as e:
    print(f"Word COM PDF Export Error: {e}")
finally:
    if word:
        try: word.Quit()
        except: pass

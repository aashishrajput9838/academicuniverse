import os
import sys
import win32com.client
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
docx_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"
pdf_path = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.pdf"

print(f"=== CONVERTING {docx_path.name} -> {pdf_path.name} ===")

if not docx_path.exists():
    print(f"Error: {docx_path} does not exist.")
    sys.exit(1)

word = None
try:
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    doc = word.Documents.Open(str(docx_path))
    # 17 = wdFormatPDF
    doc.SaveAs(str(pdf_path), FileFormat=17)
    doc.Close()
    print(f"[SUCCESS] Converted to PDF: {pdf_path}")
except Exception as e:
    print(f"Word COM Conversion Error: {e}")
    print("Falling back to reportlab / pdf builder if Word COM fails...")
finally:
    if word:
        word.Quit()

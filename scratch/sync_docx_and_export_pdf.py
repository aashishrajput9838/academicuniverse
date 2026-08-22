import os
import shutil
import win32com.client
from pathlib import Path

workspace = Path(__file__).resolve().parents[1]
justified_docx = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary_Justified.docx"
target_docx = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.docx"
target_pdf = workspace / "docs" / "paper" / "PaperV5_Ollama_Primary.pdf"

print("============================================================")
print(" SYNCHRONIZING JUSTIFIED MANUSCRIPT AND EXPORTING PDF")
print("============================================================")

assert justified_docx.exists(), "PaperV5_Ollama_Primary_Justified.docx missing!"

# Copy justified docx to target docx
shutil.copy(str(justified_docx), str(target_docx))
print(f"[SUCCESS] Copied {justified_docx.name} -> {target_docx.name}")

# Export PDF using WPS / Word COM Automation
abs_docx = os.path.abspath(str(target_docx))
abs_pdf = os.path.abspath(str(target_pdf))

word = None
try:
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    doc_word = word.Documents.Open(abs_docx)
    doc_word.SaveAs(abs_pdf, FileFormat=17) # 17 = wdFormatPDF
    pages = doc_word.ComputeStatistics(2)
    doc_word.Close()
    print(f"[SUCCESS] Exported high-quality PDF: {target_pdf.name} ({pages} Pages!)")
except Exception as e:
    print(f"COM Export Error: {e}")
finally:
    if word:
        try: word.Quit()
        except: pass
